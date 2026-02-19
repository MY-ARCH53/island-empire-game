const { query } = require('../config/database');

class ProductionController {
  // Üretim başlat
  static async startProduction(req, res) {
    try {
      const { buildingId } = req.body;

      // Bina bilgisini al
      const buildingSql = 'SELECT * FROM buildings WHERE id = $1';
      const buildingResult = await query(buildingSql, [buildingId]);
      
      if (buildingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Bina bulunamadı'
        });
      }

      const building = buildingResult.rows[0];

// Bina yükseltiliyorsa üretim başlatma
if (building.status === 'upgrading') {
  return res.status(400).json({
    success: false,
    message: 'Bina yukseltiliyor, uretim baslatılamaz'
  });
}

      // Zaten üretim var mı kontrol et
      const checkSql = `
        SELECT * FROM productions 
        WHERE building_id = $1 AND collected = false
      `;
      const existingProduction = await query(checkSql, [buildingId]);

      if (existingProduction.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu bina zaten üretimde'
        });
      }

      // Üretim süresi: 5 dakika (test için)
      const productionTime = 5 * 60 * 1000; // 5 dakika (ms)
      const completesAt = new Date(Date.now() + productionTime);

      // Üretim oluştur
      const insertSql = `
        INSERT INTO productions (building_id, product_type, quantity, completes_at)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const quantity = building.production_rate; // Saatlik üretim
      const result = await query(insertSql, [
        buildingId,
        building.production_type,
        quantity,
        completesAt
      ]);

      // Bina durumunu güncelle
      await query(
        'UPDATE buildings SET status = $1 WHERE id = $2',
        ['producing', buildingId]
      );

      res.json({
        success: true,
        message: 'Üretim başladı! 🌾',
        data: {
          production: result.rows[0]
        }
      });
    } catch (error) {
      console.error('Start production error:', error);
      res.status(500).json({
        success: false,
        message: 'Üretim başlatılamadı',
        error: error.message
      });
    }
  }

  // Üretimi topla
  static async collectProduction(req, res) {
    try {
      const { productionId } = req.params;
      const { userId } = req.body;

      // Üretim bilgisini al
      const productionSql = 'SELECT * FROM productions WHERE id = $1';
      const productionResult = await query(productionSql, [productionId]);

      if (productionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Üretim bulunamadı'
        });
      }

      const production = productionResult.rows[0];

      // Zaten toplandı mı?
      if (production.collected) {
        return res.status(400).json({
          success: false,
          message: 'Bu üretim zaten toplandı'
        });
      }

      // Üretim bitti mi?
      const now = new Date();
      const completesAt = new Date(production.completes_at);

      if (now < completesAt) {
        return res.status(400).json({
          success: false,
          message: 'Üretim henüz bitmedi',
          data: {
            remainingTime: Math.ceil((completesAt - now) / 1000) // saniye
          }
        });
      }

      // Kaynağı artır
      const resourceType = production.product_type === 'wheat' ? 'food' : production.product_type;
      
      const updateResourceSql = `
        UPDATE resources 
        SET amount = amount + $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2 AND resource_type = $3
        RETURNING *
      `;
      
      await query(updateResourceSql, [production.quantity, userId, resourceType]);

      // Üretimi toplandı olarak işaretle
      await query(
        'UPDATE productions SET collected = true WHERE id = $1',
        [productionId]
      );

      // Binayı idle yap
      await query(
        'UPDATE buildings SET status = $1 WHERE id = $2',
        ['idle', production.building_id]
      );

      res.json({
        success: true,
        message: `${production.quantity} ${resourceType} toplandı! 🎉`,
        data: {
          collected: {
            type: resourceType,
            amount: production.quantity
          }
        }
      });
    } catch (error) {
      console.error('Collect production error:', error);
      res.status(500).json({
        success: false,
        message: 'Üretim toplanamadı',
        error: error.message
      });
    }
  }

  // Bina üretimlerini getir
  static async getBuildingProductions(req, res) {
    try {
      const { buildingId } = req.params;

      const sql = `
        SELECT * FROM productions 
        WHERE building_id = $1 
        ORDER BY started_at DESC
      `;
      
      const result = await query(sql, [buildingId]);

      res.json({
        success: true,
        data: { productions: result.rows }
      });
    } catch (error) {
      console.error('Get productions error:', error);
      res.status(500).json({
        success: false,
        message: 'Üretimler getirilemedi',
        error: error.message
      });
    }
  }
}

module.exports = ProductionController;