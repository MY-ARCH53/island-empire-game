const { query } = require('../config/database');

class ResourceModel {
  // Kaynak oluştur veya güncelle
  static async upsert({ userId, resourceType, amount, capacity = 10000 }) {
    try {
      const sql = `
        INSERT INTO resources (user_id, resource_type, amount, capacity)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, resource_type) 
        DO UPDATE SET amount = $3, updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      const result = await query(sql, [userId, resourceType, amount, capacity]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Kullanıcı kaynaklarını getir
  static async findByUserId(userId) {
    try {
      const sql = 'SELECT * FROM resources WHERE user_id = $1';
      const result = await query(sql, [userId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ResourceModel;