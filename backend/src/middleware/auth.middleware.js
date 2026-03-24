const { verifyToken } = require('../utils/jwt');

/**
 * JWT kimlik doğrulama middleware'i.
 * Token'ı doğrular, req.userId'yi set eder.
 * Ayrıca body/query'den gelen userId'yi token'daki ile ezer —
 * böylece kullanıcı başkasının userId'sini göndererek sahte işlem yapamaz.
 */
module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Oturum gerekli' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: 'Geçersiz veya süresi dolmuş oturum' });
    }

    // Token'dan gelen gerçek userId'yi set et
    req.userId = decoded.userId;

    // Body ve query'deki userId'yi token'dakiyle ezer — sahte userId koruması
    if (req.body) req.body.userId = decoded.userId;
    if (req.query && req.query.userId !== undefined) req.query.userId = String(decoded.userId);

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Kimlik doğrulama hatası' });
  }
};
