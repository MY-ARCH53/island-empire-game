const { query } = require('../config/database');

class MarketplaceController {
  static getPrices(req, res) {
    const prices = {
      gold: { buy: 0, sell: 0 },
      wood: { buy: 15, sell: 10 },
      food: { buy: 20, sell: 12 },
      energy: { buy: 25, sell: 15 }
    };

    res.json({
      success: true,
      data: { prices }
    });
  }

  static async buyResource(req, res) {
    try {
      const { userId, resourceType, amount } = req.body;

      const prices = {
        wood: 15,
        food: 20,
        energy: 25
      };

      if (!prices[resourceType]) {
        return res.status(400).json({
          success: false,
          message: 'Bu kaynak alinamaz'
        });
      }

      const totalCost = prices[resourceType] * amount;

      const goldSql = 'SELECT * FROM resources WHERE user_id = $1 AND resource_type = $2';
      const goldResult = await query(goldSql, [userId, 'gold']);

      if (goldResult.rows.length === 0 || goldResult.rows[0].amount < totalCost) {
        return res.status(400).json({
          success: false,
          message: 'Yetersiz altin'
        });
      }

      await query(
        'UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = $3',
        [totalCost, userId, 'gold']
      );

      await query(
        'UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = $3',
        [amount, userId, resourceType]
      );

      await query(
        'INSERT INTO marketplace_transactions (user_id, transaction_type, resource_type, amount, price) VALUES ($1, $2, $3, $4, $5)',
        [userId, 'buy', resourceType, amount, prices[resourceType]]
      );

      res.json({
        success: true,
        message: 'Satin alma basarili',
        data: {
          resourceType,
          amount,
          totalCost
        }
      });
    } catch (error) {
      console.error('Buy resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Satin alma basarisiz',
        error: error.message
      });
    }
  }

  static async sellResource(req, res) {
    try {
      const { userId, resourceType, amount } = req.body;

      const prices = {
        wood: 10,
        food: 12,
        energy: 15
      };

      if (!prices[resourceType]) {
        return res.status(400).json({
          success: false,
          message: 'Bu kaynak satilamaz'
        });
      }

      const totalEarned = prices[resourceType] * amount;

      const resourceSql = 'SELECT * FROM resources WHERE user_id = $1 AND resource_type = $2';
      const resourceResult = await query(resourceSql, [userId, resourceType]);

      if (resourceResult.rows.length === 0 || resourceResult.rows[0].amount < amount) {
        return res.status(400).json({
          success: false,
          message: 'Yetersiz kaynak'
        });
      }

      await query(
        'UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = $3',
        [amount, userId, resourceType]
      );

      await query(
        'UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = $3',
        [totalEarned, userId, 'gold']
      );

      await query(
        'INSERT INTO marketplace_transactions (user_id, transaction_type, resource_type, amount, price) VALUES ($1, $2, $3, $4, $5)',
        [userId, 'sell', resourceType, amount, prices[resourceType]]
      );

      res.json({
        success: true,
        message: 'Satis basarili',
        data: {
          resourceType,
          amount,
          totalEarned
        }
      });
    } catch (error) {
      console.error('Sell resource error:', error);
      res.status(500).json({
        success: false,
        message: 'Satis basarisiz',
        error: error.message
      });
    }
  }

  static async getTransactions(req, res) {
    try {
      const { userId } = req.query;

      const sql = `
        SELECT * FROM marketplace_transactions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 20
      `;

      const result = await query(sql, [userId]);

      res.json({
        success: true,
        data: { transactions: result.rows }
      });
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Islemler getirilemedi'
      });
    }
  }
}

module.exports = MarketplaceController;