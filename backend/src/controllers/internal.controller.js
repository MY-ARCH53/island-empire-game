const { query } = require('../config/database');
const { verifyToken } = require('../utils/jwt');
const { getEquippedStats, getGuildInfo } = require('../utils/onlineStats');

// "Kan Adası: Online" — Godot sunucusu SADECE bu internal endpoint'ler
// üzerinden kalıcı veriye yazar (bkz. plans/humble-chasing-galaxy.md).
// Godot sunucusu güvenilir sayılır (internal.middleware.js ile korunuyor)
// ama yine de savunma amaçlı üst sınırlar uygulanıyor — tek bir hatalı/
// ele geçirilmiş sunucu çağrısı ekonomiyi bozmasın diye.
// Bölgeli farm haritası (Tier4/elit) en yüksek tek-öldürme ödülü ~225xp/
// ~180 gümüş — 200/200 tavanına çok yakın/üstündeydi, ~1.8x pay için
// 400/400'e çıkarıldı (bkz. plans/humble-chasing-galaxy.md).
const MAX_SILVER_PER_KILL = 400;
const MAX_XP_PER_KILL = 400;
// Knight Online'daki gerçek desen: solo PvP kill +50 NP, ölüm -50 NP.
const PVP_NP_GAIN = 50;
const PVP_NP_LOSS = 50;

// Faz 6 — anti-hile sağlamlaştırma. Godot sunucusu kendi tarafında zaten
// ATTACK_COOLDOWN (0.6s) uyguluyor; bu, ağ jitter'ı için pay bırakan ama
// yine de fiziksel olarak imkansız bir hızı yakalayan İKİNCİ, bağımsız bir
// taban — tek bir ele geçirilmiş/hatalı godot-server süreci reward-kill'i
// spam edemesin diye (bkz. dosya başı: internal endpoint'lere bile tam
// güvenilmiyor). Süreç bazlı bellek içi — restart'ta sıfırlanır, tek
// başına yeterli değil, MAX_SILVER/XP_PER_KILL tavanlarıyla birlikte çalışır.
const MIN_KILL_INTERVAL_MS = 300;
const _lastKillAt = new Map(); // userId -> ms epoch

// Şüpheli davranışı loglar — Admin2 → "Şüpheli Oyuncular" panelinin
// (admin.controller.js → getSuspiciousPlayers) okuduğu resource_transactions
// tablosuna yazılır, mevcut minigame/production loglama deseniyle aynı.
async function logKillTransaction(userId, resourceType, amount, source, meta) {
  await query(
    `INSERT INTO resource_transactions (user_id, resource_type, amount, source, meta)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, resourceType, amount, source, JSON.stringify(meta)]
  ).catch(() => {});
}

// true dönerse çağrı çok hızlı geldi demektir (reddedilmeli + loglanmalı).
function isTooFast(userId) {
  const now = Date.now();
  const last = _lastKillAt.get(userId);
  _lastKillAt.set(userId, now);
  return last != null && (now - last) < MIN_KILL_INTERVAL_MS;
}

function xpNeededForLevel(level) {
  return 50 + level * 30;
}

class InternalController {
  // POST /api/internal/authenticate  { token }
  // Godot sunucusu, bağlanan bir istemcinin JWT'sini doğrulatıp gerçek
  // userId + (varsa) online karakterini öğrenmek için kullanır.
  static async authenticate(req, res) {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token gerekli' });
      }
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return res.json({ success: true, data: { valid: false } });
      }

      const charRes = await query(
        'SELECT class_id, level, xp, silver, np FROM online_characters WHERE user_id = $1',
        [decoded.userId]
      );
      const character = charRes.rows[0] || null;
      // Faz 4 — kuşanılan eşyanın gerçek savaş etkisi: godot-server bu değeri
      // hasar/can hesabında kullanır (bkz. onlineStats.js).
      if (character) {
        character.equippedStats = await getEquippedStats(decoded.userId);
        character.guild = await getGuildInfo(decoded.userId);
      }

      res.json({
        success: true,
        data: {
          valid: true,
          userId: decoded.userId,
          character,
        },
      });
    } catch (err) {
      console.error('Internal authenticate error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // POST /api/internal/reward-kill  { userId, silver, xp, itemDefId? }
  static async rewardKill(req, res) {
    try {
      let { userId, silver, xp, itemDefId } = req.body;
      userId = parseInt(userId, 10);
      silver = Math.max(0, Math.min(MAX_SILVER_PER_KILL, Math.floor(Number(silver) || 0)));
      xp = Math.max(0, Math.min(MAX_XP_PER_KILL, Math.floor(Number(xp) || 0)));

      if (!Number.isFinite(userId)) {
        return res.status(400).json({ success: false, message: 'Geçersiz userId' });
      }

      if (isTooFast(userId)) {
        await logKillTransaction(userId, 'flag', 0, 'online_anticheat_flag', {
          reason: 'reward_kill_too_fast', minIntervalMs: MIN_KILL_INTERVAL_MS,
        });
        return res.status(429).json({ success: false, message: 'Çok hızlı öldürme isteği' });
      }

      const charRes = await query(
        'SELECT level, xp, silver FROM online_characters WHERE user_id = $1',
        [userId]
      );
      if (charRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Online karakter bulunamadı' });
      }
      const char = charRes.rows[0];

      let newLevel = char.level;
      let newXp = char.xp + xp;
      let leveledUp = false;
      while (newXp >= xpNeededForLevel(newLevel)) {
        newXp -= xpNeededForLevel(newLevel);
        newLevel += 1;
        leveledUp = true;
      }
      const newSilver = char.silver + silver;

      await query(
        `UPDATE online_characters SET level = $1, xp = $2, silver = $3, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $4`,
        [newLevel, newXp, newSilver, userId]
      );

      let droppedItem = null;
      if (itemDefId) {
        const defRes = await query('SELECT id, name, slot, rarity FROM item_defs WHERE id = $1', [itemDefId]);
        if (defRes.rows.length > 0) {
          await query(
            'INSERT INTO online_inventory (user_id, item_def_id) VALUES ($1, $2)',
            [userId, itemDefId]
          );
          droppedItem = defRes.rows[0];
        }
      }

      await logKillTransaction(userId, 'silver', silver, 'online_farm_kill', {
        xp, itemDefId: droppedItem ? droppedItem.id : null, leveledUp,
      });

      res.json({
        success: true,
        data: {
          level: newLevel,
          xp: newXp,
          silver: newSilver,
          leveledUp,
          droppedItem,
        },
      });
    } catch (err) {
      console.error('Internal rewardKill error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }
  // POST /api/internal/pvp-kill  { killerUserId, victimUserId }
  // KO deseni: öldüren +50 NP kazanır, ölen 50 NP kaybeder (0'ın altına inmez).
  static async pvpKill(req, res) {
    try {
      const killerUserId = parseInt(req.body.killerUserId, 10);
      const victimUserId = parseInt(req.body.victimUserId, 10);
      if (!Number.isFinite(killerUserId) || !Number.isFinite(victimUserId)) {
        return res.status(400).json({ success: false, message: 'Geçersiz kullanıcı' });
      }
      if (killerUserId === victimUserId) {
        return res.status(400).json({ success: false, message: 'Kendi kendini öldüremezsin' });
      }

      if (isTooFast(killerUserId)) {
        await logKillTransaction(killerUserId, 'flag', 0, 'online_anticheat_flag', {
          reason: 'pvp_kill_too_fast', minIntervalMs: MIN_KILL_INTERVAL_MS, victimUserId,
        });
        return res.status(429).json({ success: false, message: 'Çok hızlı öldürme isteği' });
      }

      // Faz 5 — aynı klan üyeleri birbirinden NP çalamaz (godot-server zaten
      // aynı hasarı client isteği aşamasında engelliyor, bu ikinci bir
      // savunma katmanı — internal endpoint'lere bile tam güvenilmiyor,
      // bkz. dosya başındaki savunma amaçlı üst sınırlar notu).
      const [killerGuild, victimGuild] = await Promise.all([
        getGuildInfo(killerUserId),
        getGuildInfo(victimUserId),
      ]);
      if (killerGuild && victimGuild && killerGuild.guildId === victimGuild.guildId) {
        return res.status(400).json({ success: false, message: 'Aynı klandan bir üyeyi öldüremezsin' });
      }

      const charsRes = await query(
        'SELECT user_id, np FROM online_characters WHERE user_id IN ($1, $2)',
        [killerUserId, victimUserId]
      );
      if (charsRes.rows.length < 2) {
        return res.status(404).json({ success: false, message: 'Karakter(ler) bulunamadı' });
      }
      const byUser = {};
      charsRes.rows.forEach(r => { byUser[r.user_id] = r.np; });

      const newKillerNp = byUser[killerUserId] + PVP_NP_GAIN;
      const newVictimNp = Math.max(0, byUser[victimUserId] - PVP_NP_LOSS);

      await query('UPDATE online_characters SET np = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2', [newKillerNp, killerUserId]);
      await query('UPDATE online_characters SET np = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2', [newVictimNp, victimUserId]);

      await logKillTransaction(killerUserId, 'np', PVP_NP_GAIN, 'online_pvp_kill', { victimUserId, role: 'killer' });
      await logKillTransaction(victimUserId, 'np', -PVP_NP_LOSS, 'online_pvp_kill', { killerUserId, role: 'victim' });

      res.json({
        success: true,
        data: { killerNp: newKillerNp, victimNp: newVictimNp },
      });
    } catch (err) {
      console.error('Internal pvpKill error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }
}

module.exports = InternalController;
