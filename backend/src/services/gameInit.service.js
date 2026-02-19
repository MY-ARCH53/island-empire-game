const IslandModel = require('../models/island.model');
const BuildingModel = require('../models/building.model');
const ResourceModel = require('../models/resource.model');

// Her adada olacak 4 sabit bina
const ISLAND_BUILDINGS = [
  { type: 'trafo',           name: 'Trafo',           productionRate: 50, productionType: 'energy' },
  { type: 'tarla',           name: 'Tarla',           productionRate: 45, productionType: 'food'   },
  { type: 'odun_fabrikasi',  name: 'Odun Fabrikası',  productionRate: 40, productionType: 'wood'   },
  { type: 'maden',           name: 'Maden',           productionRate: 35, productionType: 'gold'   },
];

class GameInitService {
  // Yeni oyuncuyu başlat
  static async initializeNewPlayer(userId) {
    try {
      console.log(`🎮 Yeni oyuncu başlatılıyor: ${userId}`);

      // 1. Ana Ada oluştur
      const island = await IslandModel.create({
        userId,
        name: 'Ana Ada',
        type: 'main',
        specialty: 'Dengeli üretim',
        level: 1
      });

      console.log(`✅ Ana ada oluşturuldu: ${island.name}`);

      // 2. 4 binayı oluştur
      const buildings = [];
      for (const config of ISLAND_BUILDINGS) {
        const building = await BuildingModel.create({
          islandId: island.id,
          type: config.type,
          name: config.name,
          level: 1,
          productionRate: config.productionRate,
          productionType: config.productionType
        });
        buildings.push(building);
        console.log(`✅ Bina oluşturuldu: ${building.name}`);
      }

      // 3. İlk kaynakları ver
      const initialResources = [
        { resourceType: 'gold',   amount: 1000, capacity: 10000 },
        { resourceType: 'wood',   amount: 500,  capacity: 5000  },
        { resourceType: 'food',   amount: 300,  capacity: 3000  },
        { resourceType: 'energy', amount: 100,  capacity: 200   },
      ];

      for (const res of initialResources) {
        await ResourceModel.upsert({
          userId,
          ...res
        });
      }

      console.log(`✅ İlk kaynaklar verildi`);

      return {
        island,
        buildings,
        resources: initialResources
      };
    } catch (error) {
      console.error('❌ Oyun başlatma hatası:', error);
      throw error;
    }
  }

  // Ada keşfedildiğinde 4 binayı oluştur
  static async initializeIslandBuildings(islandId) {
    try {
      const buildings = [];
      for (const config of ISLAND_BUILDINGS) {
        const building = await BuildingModel.create({
          islandId,
          type: config.type,
          name: config.name,
          level: 1,
          productionRate: config.productionRate,
          productionType: config.productionType
        });
        buildings.push(building);
      }
      console.log(`✅ Ada ${islandId} için 4 bina oluşturuldu`);
      return buildings;
    } catch (error) {
      console.error('❌ Ada binaları oluşturma hatası:', error);
      throw error;
    }
  }
}

module.exports = GameInitService;
