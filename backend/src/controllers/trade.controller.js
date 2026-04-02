const { query } = require('../config/database');
const TaskController = require('./task.controller');

// Ticaret oranları: kaynak türü → 100 birim karşılığı altın
const TRADE_RATES = {
  energy: { per: 100, gold: 10  }, // 100 enerji = 10 altın
  food:   { per: 100, gold: 15  }, // 100 yiyecek = 15 altın
  wood:   { per: 100, gold: 20  }, // 100 odun = 20 altın
};

const DAILY_TRADE_GOLD_LIMIT = 500_000;

class TradeController {
  // GET /api/trade/rates
  static async getRates(req, res) {
    res.json({ success: true, data: { rates: TRADE_RATES } });
  }

  // POST /api/trade/convert
  // Body: { userId, resourceType, amount }
  static async convert(req, res) {
    try {
      const userId = req.userId;
      const { resourceType, amount } = req.body;
      const qty = parseInt(amount, 10);

      const rate = TRADE_RATES[resourceType];
      if (!rate) {
        return res.status(400).json({ success: false, message: 'Gecersiz kaynak turu (energy, food, wood)' });
      }
      if (!qty || qty < rate.per || qty % rate.per !== 0) {
        return res.status(400).json({
          success: false,
          message: `En az ${rate.per} birim ve ${rate.per}'in kati olmali`
        });
      }

      // Kaynak bakiyesi ve altın kapasitesi kontrolü
      const resRows = await query(
        'SELECT resource_type, amount, capacity FROM resources WHERE user_id = $1 AND resource_type = ANY($2)',
        [userId, [resourceType, 'gold']]
      );
      const resMap = {};
      resRows.rows.forEach(r => resMap[r.resource_type] = r);

      if (!resMap[resourceType] || resMap[resourceType].amount < qty) {
        return res.status(400).json({ success: false, message: 'Yetersiz kaynak' });
      }

      const goldEarned = Math.floor((qty / rate.per) * rate.gold);

      // Bugünkü dönüşüm toplamı kontrolü
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const dailyRes = await query(
        `SELECT COALESCE(SUM(amount), 0)::int AS daily_total
         FROM resource_transactions
         WHERE user_id = $1 AND source = 'trade' AND resource_type = 'gold' AND created_at >= $2`,
        [userId, todayStart.toISOString()]
      ).catch(() => ({ rows: [{ daily_total: 0 }] }));
      const dailyTotal = Number(dailyRes.rows[0].daily_total);

      if (dailyTotal + goldEarned > DAILY_TRADE_GOLD_LIMIT) {
        const remaining = Math.max(0, DAILY_TRADE_GOLD_LIMIT - dailyTotal);
        return res.status(400).json({
          success: false,
          message: `Günlük dönüşüm limitine ulaştınız. Bugün kalan limit: ${remaining.toLocaleString('tr-TR')} altın (max ${DAILY_TRADE_GOLD_LIMIT.toLocaleString('tr-TR')}/gün)`,
        });
      }

      // Kaynağı düş
      await query(
        'UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = $3',
        [qty, userId, resourceType]
      );

      // Altın ekle (kapasite kontrolü yok, günlük limit yeterli)
      await query(
        'UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = $3',
        [goldEarned, userId, 'gold']
      );

      // Günlük dönüşüm logu
      await query(
        `INSERT INTO resource_transactions (user_id, resource_type, amount, source, meta)
         VALUES ($1, 'gold', $2, 'trade', $3)`,
        [userId, goldEarned, JSON.stringify({ resource_type: resourceType, amount: qty })]
      ).catch(() => {});

      // Güncel bakiyeleri döndür
      const updated = await query(
        'SELECT resource_type, amount FROM resources WHERE user_id = $1',
        [userId]
      );

      // Günlük görev takibi
      await TaskController.trackProgress(userId, 'daily_trade');

      res.json({
        success: true,
        data: {
          gold_earned: goldEarned,
          resource_spent: qty,
          resource_type: resourceType,
          resources: updated.rows,
        },
      });
    } catch (error) {
      console.error('Trade convert error:', error);
      res.status(500).json({ success: false, message: 'Ticaret basarisiz', error: error.message });
    }
  }
}

module.exports = TradeController;
