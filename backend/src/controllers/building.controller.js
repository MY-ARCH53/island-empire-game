const { query } = require('../config/database');

class BuildingController {
  static async upgradeBuilding(req, res) {
    try {
      const buildingId = req.body.buildingId;
      const userId = req.body.userId;

      const buildingSql = 'SELECT * FROM buildings WHERE id = $1';
      const buildingResult = await query(buildingSql, [buildingId]);

      if (buildingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Bina bulunamadi'
        });
      }

      const building = buildingResult.rows[0];
      const currentLevel = building.level;
      const newLevel = currentLevel + 1;
      const goldCost = 200 * currentLevel;
      const woodCost = 100 * currentLevel;

      const resourcesSql = 'SELECT * FROM resources WHERE user_id = $1';
      const resourcesResult = await query(resourcesSql, [userId]);
      const resources = resourcesResult.rows;

      const gold = resources.find(r => r.resource_type === 'gold');
      const wood = resources.find(r => r.resource_type === 'wood');

      if (!gold || gold.amount < goldCost) {
        return res.status(400).json({
          success: false,
          message: 'Yetersiz altin'
        });
      }

      if (!wood || wood.amount < woodCost) {
        return res.status(400).json({
          success: false,
          message: 'Yetersiz odun'
        });
      }

      await query(
        'UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = $3',
        [goldCost, userId, 'gold']
      );

      await query(
        'UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = $3',
        [woodCost, userId, 'wood']
      );

      const newProductionRate = Math.floor(building.production_rate * 1.3);
      const upgradeTime = 2 * 60 * 1000;
      const upgradeCompletesAt = new Date(Date.now() + upgradeTime);

      await query(
        'UPDATE buildings SET level = $1, production_rate = $2, status = $3, upgrade_started_at = CURRENT_TIMESTAMP, upgrade_completes_at = $4 WHERE id = $5',
        [newLevel, newProductionRate, 'upgrading', upgradeCompletesAt, buildingId]
      );

      res.json({
        success: true,
        message: 'Yukseltme basladi',
        data: {
          newLevel: newLevel,
          cost: { gold: goldCost, wood: woodCost },
          newProductionRate: newProductionRate
        }
      });
    } catch (error) {
      console.error('Upgrade error:', error);
      res.status(500).json({
        success: false,
        message: 'Hata olustu',
        error: error.message
      });
    }
  }

  static async completeUpgrade(req, res) {
    try {
      const buildingId = req.params.buildingId;

      const buildingSql = 'SELECT * FROM buildings WHERE id = $1';
      const buildingResult = await query(buildingSql, [buildingId]);

      if (buildingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Bina bulunamadi'
        });
      }

      const building = buildingResult.rows[0];

      if (building.status !== 'upgrading') {
        return res.status(400).json({
          success: false,
          message: 'Yukseltilmiyor'
        });
      }

      const now = new Date();
      const completesAt = new Date(building.upgrade_completes_at);

      if (now < completesAt) {
        const remainingSeconds = Math.ceil((completesAt - now) / 1000);
        return res.status(400).json({
          success: false,
          message: 'Henuz bitmedi',
          data: { remainingTime: remainingSeconds }
        });
      }

      await query(
        'UPDATE buildings SET status = $1, upgrade_started_at = NULL, upgrade_completes_at = NULL WHERE id = $2',
        ['idle', buildingId]
      );

      res.json({
        success: true,
        message: 'Tamamlandi',
        data: {
          level: building.level,
          productionRate: building.production_rate
        }
      });
    } catch (error) {
      console.error('Complete error:', error);
      res.status(500).json({
        success: false,
        message: 'Hata olustu'
      });
    }
  }
}

module.exports = BuildingController;
