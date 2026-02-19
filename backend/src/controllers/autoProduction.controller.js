const { query } = require('../config/database');

class AutoProductionController {
  // Otomatik üretimi etkinleştir (1000 enerji → 4 saat)
  static async activate(req, res) {
    try {
      const { userId } = req.body;

      // Zaten aktif mi?
      const userRes = await query('SELECT auto_production_until FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
      }

      const endsAt = userRes.rows[0].auto_production_until;
      if (endsAt && new Date(endsAt) > new Date()) {
        return res.status(400).json({ success: false, message: 'Otomatik üretim zaten aktif!' });
      }

      // Enerji kontrolü
      const energyRes = await query(
        "SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'energy'",
        [userId]
      );
      const energy = energyRes.rows.length > 0 ? parseFloat(energyRes.rows[0].amount) : 0;
      if (energy < 1000) {
        return res.status(400).json({ success: false, message: 'Yetersiz enerji! 1000 enerji gerekli.' });
      }

      // 1000 enerji düş
      await query(
        "UPDATE resources SET amount = amount - 1000, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND resource_type = 'energy'",
        [userId]
      );

      // 4 saatlik otomatik üretim başlat
      const newEndsAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
      await query('UPDATE users SET auto_production_until = $1 WHERE id = $2', [newEndsAt, userId]);

      res.json({
        success: true,
        message: 'Otomatik üretim başladı! 4 saat boyunca tüm binalar otomatik çalışacak.',
        data: { endsAt: newEndsAt }
      });
    } catch (error) {
      console.error('Auto production activate error:', error);
      res.status(500).json({ success: false, message: 'Hata oluştu', error: error.message });
    }
  }

  // Durum sorgula
  static async getStatus(req, res) {
    try {
      const { userId } = req.query;

      const userRes = await query('SELECT auto_production_until FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
      }

      const endsAt = userRes.rows[0].auto_production_until;
      const now = new Date();
      const active = !!(endsAt && new Date(endsAt) > now);

      res.json({
        success: true,
        data: {
          active,
          endsAt: active ? endsAt : null,
          remainingMs: active ? new Date(endsAt) - now : 0
        }
      });
    } catch (error) {
      console.error('Auto production status error:', error);
      res.status(500).json({ success: false, message: 'Hata oluştu', error: error.message });
    }
  }

  // Otomatik toplama + yeniden başlatma (frontend her 10 saniyede çağırır)
  static async tick(req, res) {
    try {
      const { userId } = req.body;

      // Aktif mi?
      const userRes = await query('SELECT auto_production_until FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
      }

      const endsAt = userRes.rows[0].auto_production_until;
      if (!endsAt || new Date(endsAt) <= new Date()) {
        return res.json({ success: true, data: { active: false, collected: 0, started: 0 } });
      }

      // Kullanıcının tüm binaları (upgrading olmayanlar)
      const buildingsSql = `
        SELECT b.*
        FROM buildings b
        JOIN islands i ON b.island_id = i.id
        WHERE i.user_id = $1 AND b.status != 'upgrading'
      `;
      const buildingsRes = await query(buildingsSql, [userId]);
      const buildings = buildingsRes.rows;

      const now = new Date();
      let collected = 0;
      let started = 0;

      for (const building of buildings) {
        // Tamamlanmış toplanmamış üretim var mı?
        const prodRes = await query(
          'SELECT * FROM productions WHERE building_id = $1 AND collected = false',
          [building.id]
        );

        if (prodRes.rows.length > 0) {
          const production = prodRes.rows[0];
          if (new Date(production.completes_at) <= now) {
            // Kaynağı kullanıcıya ekle
            const resourceType = production.product_type === 'wheat' ? 'food' : production.product_type;
            await query(
              'UPDATE resources SET amount = amount + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND resource_type = $3',
              [production.quantity, userId, resourceType]
            );
            // Üretimi toplandı işaretle
            await query('UPDATE productions SET collected = true WHERE id = $1', [production.id]);
            // Binayı idle yap
            await query("UPDATE buildings SET status = 'idle' WHERE id = $1", [building.id]);
            building.status = 'idle';
            collected++;
          }
        }

        // Bina boşta ise yeni üretim başlat
        if (building.status === 'idle') {
          const productionTime = 5 * 60 * 1000; // 5 dakika
          const completesAt = new Date(Date.now() + productionTime);
          await query(
            'INSERT INTO productions (building_id, product_type, quantity, completes_at) VALUES ($1, $2, $3, $4)',
            [building.id, building.production_type, building.production_rate, completesAt]
          );
          await query("UPDATE buildings SET status = 'producing' WHERE id = $1", [building.id]);
          started++;
        }
      }

      res.json({ success: true, data: { active: true, collected, started } });
    } catch (error) {
      console.error('Auto production tick error:', error);
      res.status(500).json({ success: false, message: 'Hata oluştu', error: error.message });
    }
  }
}

module.exports = AutoProductionController;
