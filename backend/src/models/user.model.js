const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  // Kullanıcı oluştur
  static async create({ username, email, password, league = 'Ticaret' }) {
    try {
      // Şifreyi hash'le
      const passwordHash = await bcrypt.hash(password, 10);
      
      const sql = `
        INSERT INTO users (username, email, password_hash, league)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, email, level, league, created_at
      `;
      
      const result = await query(sql, [username, email, passwordHash, league]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Email ile kullanıcı bul
  static async findByEmail(email) {
    try {
      const sql = 'SELECT * FROM users WHERE email = $1';
      const result = await query(sql, [email]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Username ile kullanıcı bul
  static async findByUsername(username) {
    try {
      const sql = 'SELECT * FROM users WHERE username = $1';
      const result = await query(sql, [username]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // ID ile kullanıcı bul
  static async findById(id) {
    try {
      const sql = `
        SELECT id, username, email, level, experience, league, total_points, created_at
        FROM users 
        WHERE id = $1
      `;
      const result = await query(sql, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Şifre doğrula
  static async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = UserModel;