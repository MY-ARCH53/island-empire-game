/**
 * "Kan Adası: Online" — Godot sunucusu ↔ Node backend arası internal API
 * doğrulaması. Kullanıcı JWT'si DEĞİL, sadece Godot sunucusunun bildiği
 * paylaşılan bir sır (INTERNAL_SERVER_SECRET) ile korunur — bkz.
 * plans/humble-chasing-galaxy.md "Veri sorumluluk ayrımı" bölümü.
 */
module.exports = (req, res, next) => {
  const provided = req.headers['x-internal-secret'];
  const expected = process.env.INTERNAL_SERVER_SECRET;

  if (!expected) {
    console.error('INTERNAL_SERVER_SECRET .env dosyasinda tanimli degil!');
    return res.status(500).json({ success: false, message: 'Sunucu yapılandırma hatası' });
  }
  if (!provided || provided !== expected) {
    return res.status(401).json({ success: false, message: 'Yetkisiz internal istek' });
  }
  next();
};
