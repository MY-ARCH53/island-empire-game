const { query } = require('../config/database');

class InstagramController {

  // POST /api/instagram/request  — kullanıcı istek gönderir
  static async requestBoost(req, res) {
    try {
      const { userId, instagramUsername } = req.body;

      if (!userId || !instagramUsername) {
        return res.status(400).json({ success: false, message: 'userId ve instagramUsername gerekli' });
      }

      const cleanUsername = instagramUsername.toLowerCase().replace('@', '').trim();

      // Zaten aktif boost varsa
      const current = await query(
        'SELECT instagram_boost_active, instagram_request_status FROM users WHERE id = $1',
        [userId]
      );
      if (current.rows[0]?.instagram_boost_active) {
        return res.status(400).json({ success: false, message: 'Boost zaten aktif!' });
      }

      // İstek kaydet
      await query(
        `UPDATE users
         SET instagram_username = $1,
             instagram_request_status = 'pending',
             instagram_boost_active = FALSE,
             instagram_verified_at = NULL
         WHERE id = $2`,
        [cleanUsername, userId]
      );

      res.json({
        success: true,
        message: '📩 İsteğin alındı! Admin inceledikten sonra boost aktif edilecek.',
      });
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
         FROM users WHERE id = $1`,
        [userId]
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
          requestStatus: instagram_request_status, // null | 'pending' | 'approved' | 'rejected'
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
