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

      if (currentLevel >= 20) {
        return res.status(400).json({
          success: false,
          message: 'Maksimum seviyeye ulasildi (Lv20)'
        });
      }

      const newLevel = currentLevel + 1;

      // Excel ekonomi tablosuna göre yükseltme maliyetleri (index = hedef level)
      const UPGRADE_COSTS = [
        { gold: 0,         wood: 0        }, // Lv0 (kullanılmaz)
        { gold: 0,         wood: 0        }, // Lv1 (başlangıç)
        { gold: 350,       wood: 175      }, // Lv2
        { gold: 612,       wood: 306      }, // Lv3
        { gold: 1072,      wood: 536      }, // Lv4
        { gold: 1876,      wood: 938      }, // Lv5
        { gold: 3283,      wood: 1641     }, // Lv6
        { gold: 5745,      wood: 2872     }, // Lv7
        { gold: 10053,     wood: 5027     }, // Lv8
        { gold: 17593,     wood: 8796     }, // Lv9
        { gold: 30787,     wood: 15394    }, // Lv10
        { gold: 53878,     wood: 26939    }, // Lv11
        { gold: 94286,     wood: 47143    }, // Lv12
        { gold: 165001,    wood: 82501    }, // Lv13
        { gold: 288752,    wood: 144376   }, // Lv14
        { gold: 505316,    wood: 252658   }, // Lv15
        { gold: 884302,    wood: 442151   }, // Lv16
        { gold: 1547529,   wood: 773764   }, // Lv17
        { gold: 2708176,   wood: 1354088  }, // Lv18
        { gold: 4739307,   wood: 2369654  }, // Lv19
        { gold: 8293788,   wood: 4146894  }, // Lv20
      ];

      const goldCost = UPGRADE_COSTS[newLevel].gold;
      const woodCost = UPGRADE_COSTS[newLevel].wood;

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

      const newProductionRate = Math.floor(building.production_rate * 1.13);
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
