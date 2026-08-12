const { query } = require('../config/database');
const { verifyToken } = require('../utils/jwt');

// "Kan Adası: Online" — Godot sunucusu SADECE bu internal endpoint'ler
// üzerinden kalıcı veriye yazar (bkz. plans/humble-chasing-galaxy.md).
// Godot sunucusu güvenilir sayılır (internal.middleware.js ile korunuyor)
// ama yine de savunma amaçlı üst sınırlar uygulanıyor — tek bir hatalı/
// ele geçirilmiş sunucu çağrısı ekonomiyi bozmasın diye.
const MAX_SILVER_PER_KILL = 200;
const MAX_XP_PER_KILL = 200;

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

      res.json({
        success: true,
        data: {
          valid: true,
          userId: decoded.userId,
          character: charRes.rows[0] || null,
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
}

module.exports = InternalController;
