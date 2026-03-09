const { query } = require('../config/database');

// Banlı oyuncuların tüm game API isteklerini engeller
module.exports = async (req, res, next) => {
  const userId =
    req.query.userId ||
    req.body.userId  ||
    req.body.attackerId ||
    req.body.senderId   ||
    req.body.user_id;

  if (!userId) return next();

  try {
    const result = await query(
      'SELECT is_active, ban_reason FROM users WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];
    if (user && user.is_active === false) {
      return res.status(403).json({
        success: false,
        banned: true,
        message: user.ban_reason
          ? `Hesabınız banlandı: ${user.ban_reason}`
          : 'Hesabınız banlandı. Lütfen yönetici ile iletişime geçin.',
      });
    }
  } catch {
    // kontrol başarısız olursa geçir
  }

  next();
};
