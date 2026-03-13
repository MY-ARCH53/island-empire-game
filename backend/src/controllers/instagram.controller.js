const { query } = require('../config/database');
const https = require('https');

// Instagram Graph API — tüm takipçileri çek
async function fetchAllFollowers() {
  const token      = process.env.INSTAGRAM_ACCESS_TOKEN;
  const businessId = process.env.INSTAGRAM_BUSINESS_ID;
  if (!token || !businessId) throw new Error('Env değişkenleri eksik');

  const followers = new Set();
  let url = `https://graph.facebook.com/v19.0/${businessId}/followers?fields=username&limit=100&access_token=${token}`;

  while (url) {
    const data = await fetchJSON(url);
    if (data.error) throw new Error(data.error.message);
    (data.data || []).forEach(f => followers.add(f.username.toLowerCase()));
    url = data.paging?.next || null;
  }
  return followers;
}

// Belirli bir kullanıcı takip ediyor mu?
async function checkIfFollowing(username) {
  const followers = await fetchAllFollowers();
  return followers.has(username.toLowerCase());
}

// Basit JSON fetch (node https)
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

class InstagramController {

  // POST /api/instagram/request
  static async requestBoost(req, res) {
    try {
      const { userId, instagramUsername } = req.body;
      if (!userId || !instagramUsername) {
        return res.status(400).json({ success: false, message: 'userId ve instagramUsername gerekli' });
      }

      const cleanUsername = instagramUsername.toLowerCase().replace('@', '').trim();

      const current = await query(
        'SELECT instagram_boost_active FROM users WHERE id = $1', [userId]
      );
      if (current.rows[0]?.instagram_boost_active) {
        return res.status(400).json({ success: false, message: 'Boost zaten aktif!' });
      }

      // Otomatik API kontrolü
      if (process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ID) {
        try {
          const isFollowing = await checkIfFollowing(cleanUsername);

          if (isFollowing) {
            await query(
              `UPDATE users SET instagram_username=$1, instagram_boost_active=TRUE,
               instagram_request_status='approved', instagram_verified_at=NOW() WHERE id=$2`,
              [cleanUsername, userId]
            );
            return res.json({ success: true, message: '✅ Takip doğrulandı! Boost aktif edildi.' });
          } else {
            await query(
              `UPDATE users SET instagram_username=$1, instagram_request_status='not_following',
               instagram_boost_active=FALSE WHERE id=$2`,
              [cleanUsername, userId]
            );
            return res.status(400).json({
              success: false,
              message: `❌ @${process.env.INSTAGRAM_HANDLE || 'hesabımızı'} takip etmiyorsunuz. Önce takip edin, sonra tekrar deneyin.`
            });
          }
        } catch (apiErr) {
          console.warn('[Instagram] API kontrolü başarısız, manuel onaya düşüldü:', apiErr.message);
          // API hatası → manuel onay sistemine düş
        }
      }

      // Fallback: manuel onay
      await query(
        `UPDATE users SET instagram_username=$1, instagram_request_status='pending',
         instagram_boost_active=FALSE, instagram_verified_at=NULL WHERE id=$2`,
        [cleanUsername, userId]
      );
      res.json({ success: true, message: '📩 İsteğin alındı! Admin inceledikten sonra boost aktif edilecek.' });

    } catch (err) {
      console.error('[Instagram] requestBoost hatası:', err.message);
      res.status(500).json({ success: false, message: 'İstek gönderilemedi' });
    }
  }

  // GET /api/instagram/status/:userId
  static async getStatus(req, res) {
    try {
      const { userId } = req.params;
      const result = await query(
        `SELECT instagram_username, instagram_boost_active,
                instagram_request_status, instagram_verified_at
         FROM users WHERE id = $1`, [userId]
      );
      if (!result.rows.length) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
      }
      const { instagram_username, instagram_boost_active, instagram_request_status, instagram_verified_at } = result.rows[0];
      res.json({
        success: true,
        data: {
          username: instagram_username,
          active: instagram_boost_active,
          requestStatus: instagram_request_status,
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
