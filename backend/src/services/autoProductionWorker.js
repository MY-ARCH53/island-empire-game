const { query } = require('../config/database');

async function processUserTick(userId) {
  const buildingsSql = `
    SELECT b.*
    FROM buildings b
    JOIN islands i ON b.island_id = i.id
    WHERE i.user_id = $1 AND b.status != 'upgrading'
  `;
  const buildingsRes = await query(buildingsSql, [userId]);
  const buildings = buildingsRes.rows;

  const now = new Date();

  for (const building of buildings) {
    const prodRes = await query(
      'SELECT * FROM productions WHERE building_id = $1 AND collected = false',
      [building.id]
    );

    if (prodRes.rows.length > 0) {
      const production = prodRes.rows[0];
      if (new Date(production.completes_at) <= now) {
        const resourceType = production.product_type === 'wheat' ? 'food' : production.product_type;
        await query(
          'UPDATE resources SET amount = amount + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND resource_type = $3',
          [production.quantity, userId, resourceType]
        );
        await query('UPDATE productions SET collected = true WHERE id = $1', [production.id]);
        await query("UPDATE buildings SET status = 'idle' WHERE id = $1", [building.id]);
        building.status = 'idle';
      }
    }

    if (building.status === 'idle') {
      const waitSec = Math.round(55 * Math.pow(0.98, building.level - 1));
      const completesAt = new Date(Date.now() + waitSec * 1000);
      await query(
        'INSERT INTO productions (building_id, product_type, quantity, completes_at) VALUES ($1, $2, $3, $4)',
        [building.id, building.production_type, building.production_rate, completesAt]
      );
      await query("UPDATE buildings SET status = 'producing' WHERE id = $1", [building.id]);
    }
  }
}

async function runAutoProductionTick() {
  try {
    const usersRes = await query(
      'SELECT id FROM users WHERE auto_production_until > NOW()'
    );

    for (const user of usersRes.rows) {
      await processUserTick(user.id);
    }

    if (usersRes.rows.length > 0) {
      console.log(`[AutoProduction] ${usersRes.rows.length} kullanici icin tick islendi`);
    }
  } catch (error) {
    console.error('[AutoProduction] Worker hatasi:', error.message);
  }
}

function startWorker() {
  // 2 dakikada bir çalıştır
  setInterval(runAutoProductionTick, 2 * 60 * 1000);
  // Sunucu başlayınca da bir kez çalıştır
  runAutoProductionTick();
  console.log('[AutoProduction] Arka plan isci baslatildi (2dk aralik)');
}

module.exports = { startWorker };
