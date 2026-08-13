const { query } = require('../config/database');
const { effectiveStat, getGuildInfo } = require('../utils/onlineStats');

// "Kan Adası: Online" — kalıcı karakter + envanter/ekipman altyapısı (Faz 1).
// Silah evrimi/pasif gibi oynanış verisi Godot tarafında (godot-game-v3
// scripts/autoload/upgrades.gd → CHARACTERS) — burada sadece hangi sınıfın
// var olduğunu doğruluyoruz, gameplay mantığını burada tekrarlamıyoruz.
const CLASS_IDS = ['koylu', 'buyucu', 'kilic_ustasi', 'firtina_rahibesi', 'vebali', 'firtina_avcisi'];
const SLOTS = ['weapon', 'armor', 'shield'];

// Faz 4 — item güçlendirme (KO tarzı, kullanıcı onaylı yüksek risk modeli).
// Index = hedef seviye (+1..+10). +1..+4 güvenli (başarısızlıkta sadece
// gümüş/deneme boşa gider); +5'ten itibaren başarısızlıkta eşya YOK OLABİLİR.
const MAX_ENCHANT_LEVEL = 10;
const ENCHANT_SUCCESS_CHANCE = [null, 0.95, 0.90, 0.85, 0.75, 0.65, 0.50, 0.40, 0.30, 0.20, 0.10];
const ENCHANT_DESTROY_ON_FAIL = [null, 0, 0, 0, 0, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50];
const ENCHANT_SILVER_COST = [null, 200, 450, 800, 1250, 1800, 2450, 3200, 4050, 5000, 6050];

class OnlineController {
  // GET /api/online/character
  static async getCharacter(req, res) {
    try {
      const result = await query(
        'SELECT class_id, level, xp, silver, np, created_at FROM online_characters WHERE user_id = $1',
        [req.userId]
      );
      const character = result.rows[0] || null;
      if (character) {
        character.guild = await getGuildInfo(req.userId);
      }
      res.json({ success: true, data: character });
    } catch (err) {
      console.error('Online getCharacter error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // POST /api/online/character  { classId }
  static async createCharacter(req, res) {
    try {
      const { classId } = req.body;
      if (!CLASS_IDS.includes(classId)) {
        return res.status(400).json({ success: false, message: 'Geçersiz sınıf' });
      }

      const existing = await query('SELECT user_id FROM online_characters WHERE user_id = $1', [req.userId]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Zaten bir online karakterin var.' });
      }

      const result = await query(
        `INSERT INTO online_characters (user_id, class_id)
         VALUES ($1, $2)
         RETURNING class_id, level, xp, silver, np, created_at`,
        [req.userId, classId]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'Karakter oluşturuldu!' });
    } catch (err) {
      console.error('Online createCharacter error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // GET /api/online/inventory
  static async getInventory(req, res) {
    try {
      const invRes = await query(
        `SELECT oi.id, oi.item_def_id, oi.enchant_level, oi.acquired_at,
                d.name, d.slot, d.base_stats, d.rarity
         FROM online_inventory oi
         JOIN item_defs d ON d.id = oi.item_def_id
         WHERE oi.user_id = $1
         ORDER BY oi.acquired_at DESC`,
        [req.userId]
      );

      const equipRes = await query(
        'SELECT slot, inventory_item_id FROM online_equipment WHERE user_id = $1',
        [req.userId]
      );
      const equipped = {};
      equipRes.rows.forEach(r => { equipped[r.slot] = r.inventory_item_id; });

      const items = invRes.rows.map(row => {
        const baseStats = row.base_stats || {};
        const effectiveStats = {};
        for (const key of Object.keys(baseStats)) {
          effectiveStats[key] = effectiveStat(baseStats[key], row.enchant_level);
        }
        return { ...row, effective_stats: effectiveStats };
      });

      res.json({ success: true, data: { items, equipped } });
    } catch (err) {
      console.error('Online getInventory error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // POST /api/online/equip  { inventoryItemId }
  static async equip(req, res) {
    try {
      const inventoryItemId = parseInt(req.body.inventoryItemId, 10);
      if (!Number.isFinite(inventoryItemId)) {
        return res.status(400).json({ success: false, message: 'Geçersiz eşya' });
      }

      const itemRes = await query(
        `SELECT oi.id, d.slot FROM online_inventory oi
         JOIN item_defs d ON d.id = oi.item_def_id
         WHERE oi.id = $1 AND oi.user_id = $2`,
        [inventoryItemId, req.userId]
      );
      if (itemRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Eşya envanterinde bulunamadı' });
      }
      const { slot } = itemRes.rows[0];
      if (slot === 'consumable') {
        return res.status(400).json({ success: false, message: 'Bu eşya kuşanılamaz.' });
      }

      await query(
        `INSERT INTO online_equipment (user_id, slot, inventory_item_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, slot) DO UPDATE SET inventory_item_id = $3`,
        [req.userId, slot, inventoryItemId]
      );

      res.json({ success: true, message: 'Kuşanıldı.' });
    } catch (err) {
      console.error('Online equip error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // POST /api/online/unequip  { slot }
  static async unequip(req, res) {
    try {
      const { slot } = req.body;
      if (!SLOTS.includes(slot)) {
        return res.status(400).json({ success: false, message: 'Geçersiz slot' });
      }
      await query('DELETE FROM online_equipment WHERE user_id = $1 AND slot = $2', [req.userId, slot]);
      res.json({ success: true, message: 'Çıkarıldı.' });
    } catch (err) {
      console.error('Online unequip error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // POST /api/online/upgrade-item  { inventoryItemId }  (Faz 4)
  // KO tarzı riskli güçlendirme: +5'ten itibaren başarısızlıkta eşya
  // tamamen yok olabilir. Gümüş maliyeti sonuçtan bağımsız harcanır
  // (KO'daki scroll tüketimiyle aynı ilke — deneme bedeli her zaman ödenir).
  static async upgradeItem(req, res) {
    try {
      const inventoryItemId = parseInt(req.body.inventoryItemId, 10);
      if (!Number.isFinite(inventoryItemId)) {
        return res.status(400).json({ success: false, message: 'Geçersiz eşya' });
      }

      const itemRes = await query(
        `SELECT oi.id, oi.enchant_level, d.name
         FROM online_inventory oi
         JOIN item_defs d ON d.id = oi.item_def_id
         WHERE oi.id = $1 AND oi.user_id = $2`,
        [inventoryItemId, req.userId]
      );
      if (itemRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Eşya envanterinde bulunamadı' });
      }
      const item = itemRes.rows[0];
      if (item.enchant_level >= MAX_ENCHANT_LEVEL) {
        return res.status(400).json({ success: false, message: 'Bu eşya zaten en yüksek seviyede (+10)' });
      }
      const target = item.enchant_level + 1;
      const cost = ENCHANT_SILVER_COST[target];

      const charRes = await query('SELECT silver FROM online_characters WHERE user_id = $1', [req.userId]);
      if (charRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Online karakter bulunamadı' });
      }
      if (charRes.rows[0].silver < cost) {
        return res.status(400).json({ success: false, message: `Yetersiz gümüş (gerekli: ${cost})` });
      }
      const newSilver = charRes.rows[0].silver - cost;
      await query(
        'UPDATE online_characters SET silver = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [newSilver, req.userId]
      );

      if (Math.random() < ENCHANT_SUCCESS_CHANCE[target]) {
        await query('UPDATE online_inventory SET enchant_level = $1 WHERE id = $2', [target, inventoryItemId]);
        return res.json({
          success: true,
          data: { outcome: 'success', newLevel: target, destroyed: false, silver: newSilver, itemName: item.name },
        });
      }

      if (Math.random() < ENCHANT_DESTROY_ON_FAIL[target]) {
        await query('DELETE FROM online_inventory WHERE id = $1', [inventoryItemId]);
        return res.json({
          success: true,
          data: { outcome: 'destroyed', newLevel: null, destroyed: true, silver: newSilver, itemName: item.name },
        });
      }

      res.json({
        success: true,
        data: { outcome: 'failed', newLevel: item.enchant_level, destroyed: false, silver: newSilver, itemName: item.name },
      });
    } catch (err) {
      console.error('Online upgradeItem error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // GET /api/online/leaderboard — NP'ye göre ilk 20 (Faz 3, PvP)
  static async getLeaderboard(req, res) {
    try {
      const result = await query(
        `SELECT u.username, oc.class_id, oc.level, oc.np, g.name AS guild_name
         FROM online_characters oc
         JOIN users u ON u.id = oc.user_id
         LEFT JOIN guild_members gm ON gm.user_id = oc.user_id
         LEFT JOIN guilds g ON g.id = gm.guild_id
         WHERE oc.np > 0
         ORDER BY oc.np DESC, oc.level DESC
         LIMIT 20`
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error('Online getLeaderboard error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }
}

module.exports = OnlineController;
