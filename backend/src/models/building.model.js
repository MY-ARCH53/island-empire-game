const { query } = require('../config/database');

class BuildingModel {
  // Bina oluştur
  static async create({ islandId, type, name, level = 1, productionRate, productionType }) {
    try {
      const sql = `
        INSERT INTO buildings (island_id, type, name, level, production_rate, production_type, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'idle')
        RETURNING *
      `;
      const result = await query(sql, [islandId, type, name, level, productionRate, productionType]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Ada binalarını getir
  static async findByIslandId(islandId) {
    try {
      const sql = 'SELECT * FROM buildings WHERE island_id = $1 ORDER BY created_at ASC';
      const result = await query(sql, [islandId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BuildingModel;