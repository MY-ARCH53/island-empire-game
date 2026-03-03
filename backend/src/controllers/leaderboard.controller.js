const { query } = require('../config/database');

class LeaderboardController {
  // Tüm sıralama — ölçüt: altın miktarı
  static async getLeaderboard(req, res) {
    try {
      const sql = `
        SELECT
          u.id,
          u.username,
          u.level,
          u.league,
          COALESCE(r.amount, 0) AS gold,
          CASE
            WHEN (SELECT COUNT(*) FROM islands WHERE user_id = u.id) > 0
              THEN (SELECT COUNT(*) FROM islands WHERE user_id = u.id)
            WHEN COALESCE(r.amount, 0) >= 1500000 THEN 7
            WHEN COALESCE(r.amount, 0) >= 750000  THEN 5 + (u.id % 2)
            WHEN COALESCE(r.amount, 0) >= 250000  THEN 3 + (u.id % 2)
            ELSE 1 + (u.id % 2)
          END AS island_count,
          ROW_NUMBER() OVER (ORDER BY COALESCE(r.amount, 0) DESC, u.id ASC) AS rank
        FROM users u
        LEFT JOIN resources r
          ON r.user_id = u.id AND r.resource_type = 'gold'
        WHERE u.is_admin = FALSE
        ORDER BY gold DESC
        LIMIT 50
      `;

      const result = await query(sql);

      const leaderboard = result.rows.map(row => ({
        id:           row.id,
        username:     row.username,
        level:        row.level,
        league:       row.league,
        gold:         Math.floor(parseFloat(row.gold)),
        island_count: parseInt(row.island_count),
        rank:         parseInt(row.rank),
      }));

      res.json({ success: true, data: { leaderboard } });
    } catch (error) {
      console.error('Leaderboard error:', error);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // Oyuncunun kendi sıralaması
  static async getUserRank(req, res) {
    try {
      const { userId } = req.query;

      const sql = `
        SELECT
          u.id,
          u.username,
          u.level,
          u.league,
          COALESCE(r.amount, 0) AS gold,
          CASE
            WHEN (SELECT COUNT(*) FROM islands WHERE user_id = u.id) > 0
              THEN (SELECT COUNT(*) FROM islands WHERE user_id = u.id)
            WHEN COALESCE(r.amount, 0) >= 1500000 THEN 7
            WHEN COALESCE(r.amount, 0) >= 750000  THEN 5 + (u.id % 2)
            WHEN COALESCE(r.amount, 0) >= 250000  THEN 3 + (u.id % 2)
            ELSE 1 + (u.id % 2)
          END AS island_count,
          (
            SELECT COUNT(*) + 1
            FROM users u2
            LEFT JOIN resources r2
              ON r2.user_id = u2.id AND r2.resource_type = 'gold'
            WHERE COALESCE(r2.amount, 0) > COALESCE(r.amount, 0)
               OR (COALESCE(r2.amount, 0) = COALESCE(r.amount, 0) AND u2.id < u.id)
          ) AS rank
        FROM users u
        LEFT JOIN resources r
          ON r.user_id = u.id AND r.resource_type = 'gold'
        WHERE u.id = $1
      `;

      const result = await query(sql, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Oyuncu bulunamadi' });
      }

      const row = result.rows[0];
      const userRank = {
        id:           row.id,
        username:     row.username,
        level:        row.level,
        league:       row.league,
        gold:         Math.floor(parseFloat(row.gold)),
        island_count: parseInt(row.island_count),
        rank:         parseInt(row.rank),
      };

      res.json({ success: true, data: { userRank } });
    } catch (error) {
      console.error('User rank error:', error);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }
}

module.exports = LeaderboardController;
