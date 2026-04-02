const { query } = require('../config/database');
const { addXP } = require('../services/xp.service');

// Ağırlıklı ödül tablosu (Variable Ratio Schedule)
const PRIZES = [
  { multiplier: 2,  weight: 30 },
  { multiplier: 3,  weight: 25 },
  { multiplier: 4,  weight: 18 },
  { multiplier: 5,  weight: 12 },
  { multiplier: 6,  weight: 8  },
  { multiplier: 8,  weight: 5  },
  { multiplier: 10, weight: 2  },
];

function pickPrize() {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const prize of PRIZES) {
    r -= prize.weight;
    if (r <= 0) return prize;
  }
  return PRIZES[0];
}

class SpinController {
  // GET /api/spin/status?userId=X
  static async getStatus(req, res) {
    try {
      const { userId } = req.query;
      const result = await query('SELECT last_spin_at, level FROM users WHERE id = $1', [userId]);
      if (!result.rows.length) return res.status(404).json({ success: false });

      const { last_spin_at, level } = result.rows[0];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let canSpin = true;
      let nextSpinAt = null;

      if (last_spin_at) {
        const lastDate = new Date(last_spin_at);
        const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
        if (lastDay >= today) {
          canSpin = false;
          // Yarın saat 00:00'a kalan süre
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          nextSpinAt = tomorrow.toISOString();
        }
      }

      const baseGold = Math.min(Math.max(500, level * 100), 3000);

      res.json({
        success: true,
        data: { canSpin, nextSpinAt, baseGold, prizes: PRIZES },
      });
    } catch (err) {
      console.error('Spin status error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // POST /api/spin/daily  { userId }
  static async spin(req, res) {
    try {
      const userId = req.userId;

      const userRes = await query('SELECT last_spin_at, level FROM users WHERE id = $1', [userId]);
      if (!userRes.rows.length) return res.status(404).json({ success: false });

      const { last_spin_at, level } = userRes.rows[0];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (last_spin_at) {
        const lastDate = new Date(last_spin_at);
        const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
        if (lastDay >= today) {
          return res.status(400).json({ success: false, message: 'Bugün zaten çevirdin! Yarın tekrar gel.' });
        }
      }

      const prize = pickPrize();
      const baseGold = Math.min(Math.max(500, level * 100), 3000);
      const goldEarned = baseGold * prize.multiplier;

      // Altını ver
      await query(
        "UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = 'gold'",
        [goldEarned, userId]
      );

      // Son spin tarihini güncelle
      await query('UPDATE users SET last_spin_at = NOW() WHERE id = $1', [userId]);

      // Bonus XP (çark çevirme için 20 XP)
      const xpResult = await addXP(userId, 20);

      res.json({
        success: true,
        data: {
          multiplier: prize.multiplier,
          baseGold,
          goldEarned,
          xp: xpResult,
        },
        message: `x${prize.multiplier} — ${goldEarned.toLocaleString('tr-TR')} altın kazandın!`,
      });
    } catch (err) {
      console.error('Spin error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu', error: err.message });
    }
  }
}

module.exports = SpinController;
