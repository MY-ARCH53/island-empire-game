const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/database');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Token gerekli' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Gecersiz token' });
    }

    const result = await query('SELECT is_admin FROM users WHERE id = $1', [decoded.userId]);

    if (!result.rows[0]?.is_admin) {
      return res.status(403).json({ success: false, message: 'Yetkisiz erisim' });
    }

    req.adminId = decoded.userId;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Kimlik dogrulama hatasi' });
  }
};
