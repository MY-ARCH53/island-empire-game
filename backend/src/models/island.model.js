const { query } = require('../config/database');

class IslandModel {
  // Ada oluştur
  static async create({ userId, name, type, specialty, level = 1 }) {
    try {
      const sql = `
        INSERT INTO islands (user_id, name, type, specialty, level, is_discovered)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *
      `;
      const result = await query(sql, [userId, name, type, specialty, level]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Kullanıcının adalarını getir
  static async findByUserId(userId) {
    try {
      const sql = 'SELECT * FROM islands WHERE user_id = $1 ORDER BY created_at ASC';
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = IslandModel;