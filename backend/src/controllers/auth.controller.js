const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const UserModel = require('../models/user.model');
const IslandModel = require('../models/island.model');
const GameInitService = require('../services/gameInit.service');
const { sendPasswordResetEmail } = require('../services/email.service');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

class AuthController {
  static async register(req, res) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Kullanici adi, email ve sifre gerekli'
        });
      }

      // Email format kontrolü
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Gecersiz email adresi' });
      }

      // Kullanıcı adı kontrolü
      const existingUser = await UserModel.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Bu kullanici adi zaten kullaniliyor'
        });
      }

      // Email tekrar kontrolü
      const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu email adresi zaten kayitli'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertSql = `
        INSERT INTO users (username, email, password_hash, level, experience, league)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, username, level, experience, league
      `;

      const result = await query(insertSql, [
        username,
        email.toLowerCase().trim(),
        hashedPassword,
        1,
        0,
        'Ticaret'
      ]);

      const user = result.rows[0];

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        success: true,
        message: 'Kayit basarili',
        token,
        user: {
          id: user.id,
          username: user.username,
          level: user.level,
          league: user.league
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Kayit sirasinda hata olustu',
        error: error.message
      });
    }
  }

  static async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Kullanici adi ve sifre gerekli'
        });
      }

      const userSql = 'SELECT * FROM users WHERE username = $1';
      const userResult = await query(userSql, [username]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Kullanici bulunamadi' });
      }

      const user = userResult.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Hatali sifre' });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        message: 'Giris basarili',
        token,
        user: {
          id: user.id,
          username: user.username,
          level: user.level,
          league: user.league,
          experience: user.experience,
          is_admin: user.is_admin || false
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Giris sirasinda hata olustu',
        error: error.message
      });
    }
  }

  static async startGame(req, res) {
    try {
      const { userId } = req.body;

      const existingIslands = await IslandModel.findByUserId(userId);
      if (existingIslands.length > 0) {
        return res.status(400).json({ success: false, message: 'Oyun zaten baslatilmis' });
      }

      const { island, buildings, resources } = await GameInitService.initializeNewPlayer(userId);

      res.status(201).json({
        success: true,
        message: 'Oyun baslatildi',
        data: { island, buildings, resources }
      });
    } catch (error) {
      console.error('Start game error:', error);
      res.status(500).json({
        success: false,
        message: 'Oyun baslatilamadi',
        error: error.message
      });
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email adresi gerekli' });
      }

      const userRes = await query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase().trim()]);

      // Güvenlik: email kayıtlı olsa da olmasa da aynı mesajı dön
      if (userRes.rows.length === 0) {
        return res.json({ success: true, message: 'Sifre sifirlama linki email adresinize gonderildi.' });
      }

      const user = userRes.rows[0];

      // Önceki geçerli tokenleri iptal et
      await query(
        'UPDATE password_resets SET used = true WHERE user_id = $1 AND used = false',
        [user.id]
      );

      // Yeni token oluştur (1 saat geçerli)
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await query(
        'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );

      await sendPasswordResetEmail(user.email, token);

      res.json({ success: true, message: 'Sifre sifirlama linki email adresinize gonderildi.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Hata olustu', error: error.message });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ success: false, message: 'Token ve yeni sifre gerekli' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Sifre en az 6 karakter olmali' });
      }

      // Token sorgula
      const tokenRes = await query(
        'SELECT * FROM password_resets WHERE token = $1 AND used = false AND expires_at > NOW()',
        [token]
      );

      if (tokenRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Gecersiz veya suresi dolmus link' });
      }

      const resetRecord = tokenRes.rows[0];
      const hashedPassword = await bcrypt.hash(password, 10);

      // Şifreyi güncelle
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, resetRecord.user_id]);

      // Token'ı kullanıldı olarak işaretle
      await query('UPDATE password_resets SET used = true WHERE id = $1', [resetRecord.id]);

      res.json({ success: true, message: 'Sifreniz basariyla guncellendi. Giris yapabilirsiniz.' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, message: 'Hata olustu', error: error.message });
    }
  }
}

module.exports = AuthController;
