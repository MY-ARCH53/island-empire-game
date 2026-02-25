const { query } = require('../config/database');
const IslandModel = require('../models/island.model');
const GameInitService = require('../services/gameInit.service');

class IslandController {
  // Keşfedilebilir adaları getir
  static async getDiscoverableIslands(req, res) {
    try {
      const { userId } = req.query;

      // Kullanıcının mevcut ada sayısı
      const userIslandsSql = 'SELECT COUNT(*) as count FROM islands WHERE user_id = $1';
      const userIslandsResult = await query(userIslandsSql, [userId]);
      const islandCount = parseInt(userIslandsResult.rows[0].count);

      if (islandCount >= 7) {
        return res.json({
          success: true,
          data: { islands: [] },
          message: 'Maksimum ada sayisina ulasildi'
        });
      }

      // Ada keşif maliyet tablosu (index = mevcut ada sayısı)
      const ISLAND_COSTS = [
        { gold: 0,          wood: 0         }, // 1. ada (başlangıç - ücretsiz)
        { gold: 5000,       wood: 3000      }, // 2. ada - Balıkçı Adası
        { gold: 50000,      wood: 25000     }, // 3. ada - Orman Adası
        { gold: 500000,     wood: 250000    }, // 4. ada - Maden Adası
        { gold: 3000000,    wood: 1500000   }, // 5. ada - Ticaret Adası
        { gold: 15000000,   wood: 8000000   }, // 6. ada - Kraliyet Adası
        { gold: 45000000,   wood: 22000000  }, // 7. ada - Ejderha Adası
      ];
      const currentCost = ISLAND_COSTS[islandCount] || ISLAND_COSTS[ISLAND_COSTS.length - 1];

      // Sıradaki ada — isim ve bonus sıraya göre sabit
      const ISLAND_PROGRESSION = [
        null, // 1. ada (Ana Ada - başlangıçta verilir)
        { name: 'Balıkçı Adası',  specialty: 'Balık ticareti +%5',      type: 'fishing',  bonus: 'trade'   },
        { name: 'Orman Adası',    specialty: 'Odun üretimi +%10',        type: 'forest',   bonus: 'wood'    },
        { name: 'Maden Adası',    specialty: 'Maden üretimi +%15',       type: 'mining',   bonus: 'gold'    },
        { name: 'Ticaret Adası',  specialty: 'Ticaret oranı +%10',       type: 'trade',    bonus: 'trade'   },
        { name: 'Kraliyet Adası', specialty: 'Tüm üretim +%8',           type: 'royal',    bonus: 'all'     },
        { name: 'Ejderha Adası',  specialty: 'Efsanevi güç x1.5',        type: 'dragon',   bonus: 'legend'  },
      ];

      const nextIsland = ISLAND_PROGRESSION[islandCount] || ISLAND_PROGRESSION[ISLAND_PROGRESSION.length - 1];
      const randomIslands = [{
        id: 'discover_0',
        name: nextIsland.name,
        specialty: nextIsland.specialty,
        type: nextIsland.type,
        bonus: nextIsland.bonus,
        cost: { gold: currentCost.gold, wood: currentCost.wood }
      }];

      res.json({
        success: true,
        data: { islands: randomIslands }
      });
    } catch (error) {
      console.error('Get discoverable islands error:', error);
      res.status(500).json({
        success: false,
        message: 'Hata olustu'
      });
    }
  }

  // Ada keşfet ve kolonileştir
  static async discoverIsland(req, res) {
    try {
      const { userId, islandName, islandType, specialty, bonus } = req.body;

      // Kullanıcının ada sayısı kontrolü
      const userIslandsSql = 'SELECT COUNT(*) as count FROM islands WHERE user_id = $1';
      const userIslandsResult = await query(userIslandsSql, [userId]);
      const islandCount = parseInt(userIslandsResult.rows[0].count);

      if (islandCount >= 7) {
        return res.status(400).json({
          success: false,
          message: 'Maksimum ada sayisina ulasildiniz'
        });
      }

      // Maliyet hesapla (sabit tablo)
      const ISLAND_COSTS = [
        { gold: 0,          wood: 0         }, // 1. ada
        { gold: 5000,       wood: 3000      }, // 2. ada
        { gold: 50000,      wood: 25000     }, // 3. ada
        { gold: 500000,     wood: 250000    }, // 4. ada
        { gold: 3000000,    wood: 1500000   }, // 5. ada
        { gold: 15000000,   wood: 8000000   }, // 6. ada
        { gold: 45000000,   wood: 22000000  }, // 7. ada
      ];
      const costEntry = ISLAND_COSTS[islandCount] || ISLAND_COSTS[ISLAND_COSTS.length - 1];
      const goldCost = costEntry.gold;
      const woodCost = costEntry.wood;

      // Kaynakları kontrol et
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

      // Kaynakları azalt
      await query(
        'UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = $3',
        [goldCost, userId, 'gold']
      );
      await query(
        'UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = $3',
        [woodCost, userId, 'wood']
      );

      // Ada oluştur
      const island = await IslandModel.create({
        userId,
        name: islandName,
        type: islandType,
        specialty: specialty,
        level: 1
      });

      // Adaya 4 binayı otomatik ekle
      await GameInitService.initializeIslandBuildings(island.id);

      // Oyuncu unvanını güncelle (yeni ada sayısına göre)
      const RANKS = ['Köylü', 'Çırak', 'Tüccar', 'Usta', 'Baron', 'Lord', 'Efsane'];
      const newRank = RANKS[islandCount] || 'Efsane'; // islandCount = eski sayı, yeni = +1
      await query('UPDATE users SET league = $1 WHERE id = $2', [newRank, userId]);

      res.json({
        success: true,
        message: 'Ada kesf edildi',
        data: {
          island,
          cost: { gold: goldCost, wood: woodCost },
          newRank,
        }
      });
    } catch (error) {
      console.error('Discover island error:', error);
      res.status(500).json({
        success: false,
        message: 'Ada kesfi basarisiz',
        error: error.message
      });
    }
  }
}

module.exports = IslandController;