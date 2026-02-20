const { query } = require('../config/database');

class AdminController {
  // Tüm kullanıcıları getir
  static async getUsers(req, res) {
    try {
      const sql = `
        SELECT
          u.id,
          u.username,
          u.email,
          u.level,
          u.experience,
          u.league,
          u.total_points,
          u.is_active,
          u.is_admin,
          u.shield_until,
          u.created_at,
          u.last_login,
          (SELECT COUNT(*) FROM islands WHERE user_id = u.id) as island_count,
          (SELECT COUNT(*) FROM battles WHERE attacker_id = u.id OR defender_id = u.id) as battle_count,
          (SELECT gm.guild_id FROM guild_members gm WHERE gm.user_id = u.id LIMIT 1) as guild_id,
          (SELECT g.name FROM guilds g JOIN guild_members gm ON g.id = gm.guild_id WHERE gm.user_id = u.id LIMIT 1) as guild_name,
          (SELECT json_object_agg(resource_type, amount) FROM resources WHERE user_id = u.id) as resources
        FROM users u
        ORDER BY u.created_at DESC
      `;
      const result = await query(sql);

      res.json({ success: true, data: { users: result.rows } });
    } catch (error) {
      console.error('Admin getUsers error:', error);
      res.status(500).json({ success: false, message: 'Kullanicilar getirilemedi', error: error.message });
    }
  }

  // Oyun istatistikleri
  static async getStats(req, res) {
    try {
      const [usersRes, battlesRes, guildsRes, activeRes] = await Promise.all([
        query('SELECT COUNT(*) as total FROM users'),
        query('SELECT COUNT(*) as total FROM battles'),
        query('SELECT COUNT(*) as total FROM guilds'),
        query("SELECT COUNT(*) as total FROM users WHERE last_login > NOW() - INTERVAL '24 hours'"),
      ]);

      res.json({
        success: true,
        data: {
          total_users: parseInt(usersRes.rows[0].total),
          total_battles: parseInt(battlesRes.rows[0].total),
          total_guilds: parseInt(guildsRes.rows[0].total),
          active_today: parseInt(activeRes.rows[0].total),
        }
      });
    } catch (error) {
      console.error('Admin getStats error:', error);
      res.status(500).json({ success: false, message: 'Istatistikler getirilemedi' });
    }
  }

  // Kullanıcı güncelle
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { level, experience, league, is_active, is_admin } = req.body;

      const fields = [];
      const values = [];
      let idx = 1;

      if (level !== undefined)      { fields.push(`level = $${idx++}`);      values.push(level); }
      if (experience !== undefined) { fields.push(`experience = $${idx++}`); values.push(experience); }
      if (league !== undefined)     { fields.push(`league = $${idx++}`);     values.push(league); }
      if (is_active !== undefined)  { fields.push(`is_active = $${idx++}`);  values.push(is_active); }
      if (is_admin !== undefined)   { fields.push(`is_admin = $${idx++}`);   values.push(is_admin); }

      if (fields.length === 0) {
        return res.status(400).json({ success: false, message: 'Guncellenecek alan yok' });
      }

      values.push(id);
      const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, level, experience, league, is_active, is_admin`;
      const result = await query(sql, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Kullanici bulunamadi' });
      }

      res.json({ success: true, data: { user: result.rows[0] }, message: 'Kullanici guncellendi' });
    } catch (error) {
      console.error('Admin updateUser error:', error);
      res.status(500).json({ success: false, message: 'Kullanici guncellenemedi', error: error.message });
    }
  }

  // Kullanıcı kaynaklarını güncelle
  static async updateResources(req, res) {
    try {
      const { id } = req.params;
      const resources = req.body; // { gold: 1000, wood: 500, ... }

      for (const [resourceType, amount] of Object.entries(resources)) {
        if (['gold', 'wood', 'food', 'energy'].includes(resourceType)) {
          await query(
            'UPDATE resources SET amount = $1 WHERE user_id = $2 AND resource_type = $3',
            [amount, id, resourceType]
          );
        }
      }

      res.json({ success: true, message: 'Kaynaklar guncellendi' });
    } catch (error) {
      console.error('Admin updateResources error:', error);
      res.status(500).json({ success: false, message: 'Kaynaklar guncellenemedi' });
    }
  }

  // Kullanıcı sil
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const result = await query('DELETE FROM users WHERE id = $1 RETURNING username', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Kullanici bulunamadi' });
      }

      res.json({ success: true, message: `${result.rows[0].username} silindi` });
    } catch (error) {
      console.error('Admin deleteUser error:', error);
      res.status(500).json({ success: false, message: 'Kullanici silinemedi' });
    }
  }
}

module.exports = AdminController;
