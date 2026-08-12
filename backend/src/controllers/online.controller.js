const { query } = require('../config/database');

// "Kan Adası: Online" — kalıcı karakter + envanter/ekipman altyapısı (Faz 1).
// Silah evrimi/pasif gibi oynanış verisi Godot tarafında (godot-game-v3
// scripts/autoload/upgrades.gd → CHARACTERS) — burada sadece hangi sınıfın
// var olduğunu doğruluyoruz, gameplay mantığını burada tekrarlamıyoruz.
const CLASS_IDS = ['koylu', 'buyucu', 'kilic_ustasi', 'firtina_rahibesi', 'vebali', 'firtina_avcisi'];
const SLOTS = ['weapon', 'armor', 'shield'];

class OnlineController {
  // GET /api/online/character
  static async getCharacter(req, res) {
    try {
      const result = await query(
        'SELECT class_id, level, xp, silver, np, created_at FROM online_characters WHERE user_id = $1',
        [req.userId]
      );
      res.json({ success: true, data: result.rows[0] || null });
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

      res.json({ success: true, data: { items: invRes.rows, equipped } });
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
}

module.exports = OnlineController;
