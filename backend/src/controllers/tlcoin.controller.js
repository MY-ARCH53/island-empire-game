const { query } = require('../config/database');

class TLCoinController {
  // GET /api/tlcoin/balance?userId=X
  static async getBalance(req, res) {
    try {
      const { userId } = req.query;
      const result = await query(
        'SELECT tlcoin_balance FROM users WHERE id = $1',
        [userId]
      );
      if (!result.rows[0]) {
        return res.status(404).json({ success: false, message: 'Kullanici bulunamadi' });
      }
      res.json({ success: true, data: { tlcoin_balance: result.rows[0].tlcoin_balance } });
    } catch (error) {
      console.error('TLCoin getBalance error:', error);
      res.status(500).json({ success: false, message: 'Bakiye alinamadi', error: error.message });
    }
  }

  // POST /api/tlcoin/convert
  // Body: { userId, goldAmount }  — 1000'in katı olmalı
  static async convertGold(req, res) {
    try {
      const { userId, goldAmount } = req.body;
      const amount = parseInt(goldAmount, 10);

      if (!amount || amount < 1000 || amount % 1000 !== 0) {
        return res.status(400).json({ success: false, message: "En az 1000 altın ve 1000'in katları çevrilebilir" });
      }

      const tlcoin = amount / 1000;

      // Altın bakiyesi yeterli mi?
      const goldRes = await query(
        'SELECT amount FROM resources WHERE user_id = $1 AND resource_type = $2',
        [userId, 'gold']
      );
      if (!goldRes.rows[0] || goldRes.rows[0].amount < amount) {
        return res.status(400).json({ success: false, message: 'Yetersiz altın' });
      }

      // Altını düş, TLCoin ekle
      await query(
        'UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = $3',
        [amount, userId, 'gold']
      );
      await query(
        'UPDATE users SET tlcoin_balance = tlcoin_balance + $1 WHERE id = $2',
        [tlcoin, userId]
      );

      const updated = await query(
        'SELECT tlcoin_balance FROM users WHERE id = $1',
        [userId]
      );

      res.json({
        success: true,
        data: {
          tlcoin_earned: tlcoin,
          gold_spent: amount,
          tlcoin_balance: updated.rows[0].tlcoin_balance,
        },
      });
    } catch (error) {
      console.error('TLCoin convertGold error:', error);
      res.status(500).json({ success: false, message: 'Dönüşüm başarısız', error: error.message });
    }
  }

  // POST /api/tlcoin/request-prize
  // Body: { userId, prizeId, prizeName, tlcoinCost }
  static async requestPrize(req, res) {
    try {
      const { userId, prizeId, prizeName, tlcoinCost } = req.body;
      const cost = parseInt(tlcoinCost, 10);

      // TLCoin bakiyesi yeterli mi?
      const userRes = await query(
        'SELECT tlcoin_balance FROM users WHERE id = $1',
        [userId]
      );
      if (!userRes.rows[0] || userRes.rows[0].tlcoin_balance < cost) {
        return res.status(400).json({ success: false, message: 'Yetersiz TLCoin' });
      }

      // TLCoin düş (onay beklerken tutar)
      await query(
        'UPDATE users SET tlcoin_balance = tlcoin_balance - $1 WHERE id = $2',
        [cost, userId]
      );

      const insertRes = await query(
        `INSERT INTO prize_requests (user_id, prize_id, prize_name, tlcoin_cost)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, prizeId, prizeName, cost]
      );

      res.json({
        success: true,
        data: {
          request_id: insertRes.rows[0].id,
          message: 'Ödül talebiniz alındı, admin onayı bekleniyor.',
        },
      });
    } catch (error) {
      console.error('TLCoin requestPrize error:', error);
      res.status(500).json({ success: false, message: 'Talep gönderilemedi', error: error.message });
    }
  }

  // GET /api/tlcoin/my-requests?userId=X
  static async getMyRequests(req, res) {
    try {
      const { userId } = req.query;
      const result = await query(
        `SELECT id, prize_name, tlcoin_cost, status, admin_note, created_at
         FROM prize_requests WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      res.json({ success: true, data: { requests: result.rows } });
    } catch (error) {
      console.error('TLCoin getMyRequests error:', error);
      res.status(500).json({ success: false, message: 'Talepler alinamadi', error: error.message });
    }
  }
}

module.exports = TLCoinController;
