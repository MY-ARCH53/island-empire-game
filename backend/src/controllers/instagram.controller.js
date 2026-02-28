const { query } = require('../config/database');
const https = require('https');

const IG_BUSINESS_ID  = process.env.INSTAGRAM_BUSINESS_ID;
const IG_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

// ── Yardımcı: HTTPS GET → JSON ─────────────────────────────────────────────
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ── Cursor-pagination ile tüm takipçileri çek → Set<username> ────────────
async function fetchAllFollowers() {
  const followers = new Set();

  let nextUrl =
    `https://graph.facebook.com/v19.0/${IG_BUSINESS_ID}/followers` +
    `?fields=username&limit=200&access_token=${IG_ACCESS_TOKEN}`;

  while (nextUrl) {
    const data = await fetchJSON(nextUrl);
    if (data.error) throw new Error(data.error.message);

    for (const f of data.data || []) {
      followers.add(f.username.toLowerCase());
    }

    nextUrl = data.paging?.next || null;
  }

  return followers;
}

// ── Controller ──────────────────────────────────────────────────────────────
class InstagramController {

  // POST /api/instagram/verify
  static async verifyFollow(req, res) {
    try {
      const { userId, instagramUsername } = req.body;

      if (!userId || !instagramUsername) {
        return res.status(400).json({ success: false, message: 'userId ve instagramUsername gerekli' });
      }
      if (!IG_BUSINESS_ID || !IG_ACCESS_TOKEN) {
        return res.status(503).json({ success: false, message: 'Instagram entegrasyonu henüz aktif değil' });
      }

      const cleanUsername = instagramUsername.toLowerCase().replace('@', '').trim();

      const followers = await fetchAllFollowers();
      const isFollowing = followers.has(cleanUsername);

      if (!isFollowing) {
        return res.status(400).json({
          success: false,
          message: `@${cleanUsername} takipçi listesinde bulunamadı. Önce @${process.env.INSTAGRAM_HANDLE || 'hesabımızı'} takip edin!`,
        });
      }

      await query(
        `UPDATE users
         SET instagram_username = $1, instagram_boost_active = TRUE, instagram_verified_at = NOW()
         WHERE id = $2`,
        [cleanUsername, userId]
      );

      res.json({ success: true, message: '🎉 Takip doğrulandı! %20 kaynak bonusu aktif edildi.' });
    } catch (err) {
      console.error('[Instagram] verifyFollow hatası:', err.message);
      res.status(500).json({ success: false, message: 'Doğrulama sırasında hata oluştu: ' + err.message });
    }
  }

  // GET /api/instagram/status/:userId
  static async getStatus(req, res) {
    try {
      const { userId } = req.params;
      const result = await query(
        'SELECT instagram_username, instagram_boost_active, instagram_verified_at FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
      }

      const { instagram_username, instagram_boost_active, instagram_verified_at } = result.rows[0];
      res.json({
        success: true,
        data: {
          username: instagram_username,
          active: instagram_boost_active,
          verifiedAt: instagram_verified_at,
          handle: process.env.INSTAGRAM_HANDLE || '',
        },
      });
    } catch (err) {
      console.error('[Instagram] getStatus hatası:', err.message);
      res.status(500).json({ success: false, message: 'Durum alınamadı' });
    }
  }
}

module.exports = InstagramController;
module.exports.fetchAllFollowers = fetchAllFollowers;
