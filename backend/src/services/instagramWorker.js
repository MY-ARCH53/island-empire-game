const { query } = require('../config/database');
const { fetchAllFollowers } = require('../controllers/instagram.controller');

const DAY_MS = 24 * 60 * 60 * 1000;

async function checkBoostUsers() {
  try {
    const boosted = await query(
      'SELECT id, instagram_username FROM users WHERE instagram_boost_active = TRUE'
    );

    if (!boosted.rows.length) return;

    console.log(`[InstagramWorker] ${boosted.rows.length} boost'lu kullanıcı kontrol ediliyor...`);

    const followers = await fetchAllFollowers();

    for (const u of boosted.rows) {
      if (!followers.has(u.instagram_username.toLowerCase())) {
        await query(
          'UPDATE users SET instagram_boost_active = FALSE WHERE id = $1',
          [u.id]
        );
        console.log(`[InstagramWorker] Kullanıcı ${u.id} (@${u.instagram_username}) takibi bıraktı → boost kaldırıldı`);
      }
    }

    console.log('[InstagramWorker] Kontrol tamamlandı');
  } catch (err) {
    console.error('[InstagramWorker] Hata:', err.message);
  }
}

function startInstagramWorker() {
  // Sunucu başlayınca bir kez çalıştır (env var yoksa sessizce atla)
  if (!process.env.INSTAGRAM_BUSINESS_ID || !process.env.INSTAGRAM_ACCESS_TOKEN) {
    console.log('[InstagramWorker] Env değişkenleri eksik, atlanıyor.');
    return;
  }
  checkBoostUsers();
  setInterval(checkBoostUsers, DAY_MS);
  console.log('[InstagramWorker] Arka plan isci baslatildi (24h aralik)');
}

module.exports = { startInstagramWorker };
