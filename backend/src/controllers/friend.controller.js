const { query } = require('../config/database');

class FriendController {
  // Arkadaş ara
  static async searchUsers(req, res) {
    try {
      const { username, userId } = req.query;

      if (!username || username.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'En az 2 karakter giriniz'
        });
      }

      const searchSql = `
        SELECT id, username, level, league 
        FROM users 
        WHERE username ILIKE $1 AND id != $2
        LIMIT 10
      `;
      const result = await query(searchSql, [`%${username}%`, userId]);

      res.json({
        success: true,
        data: { users: result.rows }
      });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Arama basarisiz'
      });
    }
  }

  // Arkadaşlık isteği gönder
  static async sendFriendRequest(req, res) {
    try {
      const { senderId, receiverId } = req.body;

      if (senderId === receiverId) {
        return res.status(400).json({
          success: false,
          message: 'Kendinize istek gonderemezsiniz'
        });
      }

      // Zaten arkadaş mı kontrol et
      const friendshipCheckSql = `
        SELECT * FROM friendships 
        WHERE (user_id = $1 AND friend_id = $2) 
        OR (user_id = $2 AND friend_id = $1)
      `;
      const friendshipCheck = await query(friendshipCheckSql, [senderId, receiverId]);

      if (friendshipCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Zaten arkadassiniz'
        });
      }

      // Bekleyen istek var mı kontrol et
      const requestCheckSql = `
        SELECT * FROM friend_requests 
        WHERE ((sender_id = $1 AND receiver_id = $2) 
        OR (sender_id = $2 AND receiver_id = $1))
        AND status = 'pending'
      `;
      const requestCheck = await query(requestCheckSql, [senderId, receiverId]);

      if (requestCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Zaten bekleyen bir istek var'
        });
      }

      // İstek gönder
      const insertSql = `
        INSERT INTO friend_requests (sender_id, receiver_id, status)
        VALUES ($1, $2, 'pending')
        RETURNING *
      `;
      await query(insertSql, [senderId, receiverId]);

      res.json({
        success: true,
        message: 'Arkadaslik istegi gonderildi!'
      });
    } catch (error) {
      console.error('Send friend request error:', error);
      res.status(500).json({
        success: false,
        message: 'Istek gonderilemedi'
      });
    }
  }

  // Gelen istekleri görüntüle
  static async getPendingRequests(req, res) {
    try {
      const { userId } = req.query;

      const sql = `
        SELECT 
          fr.id,
          fr.sender_id,
          u.username,
          u.level,
          u.league,
          fr.created_at
        FROM friend_requests fr
        JOIN users u ON fr.sender_id = u.id
        WHERE fr.receiver_id = $1 AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
      `;
      const result = await query(sql, [userId]);

      res.json({
        success: true,
        data: { requests: result.rows }
      });
    } catch (error) {
      console.error('Get pending requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Istekler getirilemedi'
      });
    }
  }

  // İsteği kabul et
  static async acceptFriendRequest(req, res) {
    try {
      const { requestId, userId } = req.body;

      // İsteği getir
      const getRequestSql = `
        SELECT * FROM friend_requests 
        WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
      `;
      const requestResult = await query(getRequestSql, [requestId, userId]);

      if (requestResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Istek bulunamadi'
        });
      }

      const request = requestResult.rows[0];

      // İsteği kabul et
      const updateSql = `
        UPDATE friend_requests 
        SET status = 'accepted', responded_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `;
      await query(updateSql, [requestId]);

      // İki yönlü arkadaşlık oluştur
      const insertFriendship1 = `
        INSERT INTO friendships (user_id, friend_id) 
        VALUES ($1, $2)
      `;
      await query(insertFriendship1, [request.sender_id, request.receiver_id]);

      const insertFriendship2 = `
        INSERT INTO friendships (user_id, friend_id) 
        VALUES ($1, $2)
      `;
      await query(insertFriendship2, [request.receiver_id, request.sender_id]);

      res.json({
        success: true,
        message: 'Arkadaslik istegi kabul edildi!'
      });
    } catch (error) {
      console.error('Accept friend request error:', error);
      res.status(500).json({
        success: false,
        message: 'Istek kabul edilemedi'
      });
    }
  }

  // İsteği reddet
  static async rejectFriendRequest(req, res) {
    try {
      const { requestId, userId } = req.body;

      const updateSql = `
        UPDATE friend_requests 
        SET status = 'rejected', responded_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
      `;
      const result = await query(updateSql, [requestId, userId]);

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Istek bulunamadi'
        });
      }

      res.json({
        success: true,
        message: 'Istek reddedildi'
      });
    } catch (error) {
      console.error('Reject friend request error:', error);
      res.status(500).json({
        success: false,
        message: 'Istek reddedilemedi'
      });
    }
  }

  // Arkadaş listesi
  static async getFriends(req, res) {
    try {
      const { userId } = req.query;

      const sql = `
        SELECT 
          f.id,
          f.friend_id,
          u.username,
          u.level,
          u.league,
          (SELECT COUNT(*) FROM islands WHERE user_id = u.id) as island_count,
          f.created_at
        FROM friendships f
        JOIN users u ON f.friend_id = u.id
        WHERE f.user_id = $1
        ORDER BY u.username ASC
      `;
      const result = await query(sql, [userId]);

      res.json({
        success: true,
        data: { friends: result.rows }
      });
    } catch (error) {
      console.error('Get friends error:', error);
      res.status(500).json({
        success: false,
        message: 'Arkadaslar getirilemedi'
      });
    }
  }

  // Arkadaşı sil
  static async removeFriend(req, res) {
    try {
      const { userId, friendId } = req.body;

      // İki yönlü arkadaşlığı sil
      const deleteSql1 = `
        DELETE FROM friendships 
        WHERE user_id = $1 AND friend_id = $2
      `;
      await query(deleteSql1, [userId, friendId]);

      const deleteSql2 = `
        DELETE FROM friendships 
        WHERE user_id = $1 AND friend_id = $2
      `;
      await query(deleteSql2, [friendId, userId]);

      res.json({
        success: true,
        message: 'Arkadas silindi'
      });
    } catch (error) {
      console.error('Remove friend error:', error);
      res.status(500).json({
        success: false,
        message: 'Arkadas silinemedi'
      });
    }
  }

  // Kaynak gönder
  static async sendGift(req, res) {
    try {
      const { senderId, receiverId, resourceType, amount } = req.body;

      // Günlük limit kontrolü (örnek: günde 3 hediye)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const limitCheckSql = `
        SELECT COUNT(*) as gift_count 
        FROM resource_gifts 
        WHERE sender_id = $1 AND created_at >= $2
      `;
      const limitCheck = await query(limitCheckSql, [senderId, todayStart]);

      if (parseInt(limitCheck.rows[0].gift_count) >= 3) {
        return res.status(400).json({
          success: false,
          message: 'Gunluk hediye limitine ulastiniz (3/3)'
        });
      }


      // Miktar kontrolü (maksimum 10)
if (amount > 10) {
  return res.status(400).json({
    success: false,
    message: 'Maksimum 10 kaynak gonderebilirsiniz'
  });
}

if (amount < 1) {
  return res.status(400).json({
    success: false,
    message: 'En az 1 kaynak gondermelisiniz'
  });
}

      // Arkadaş mı kontrol et
      const friendCheckSql = `
        SELECT * FROM friendships 
        WHERE user_id = $1 AND friend_id = $2
      `;
      const friendCheck = await query(friendCheckSql, [senderId, receiverId]);

      if (friendCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Sadece arkadaslara hediye gonderebilirsiniz'
        });
      }

      // Kaynağı kontrol et
      const resourceCheckSql = `
        SELECT amount FROM resources 
        WHERE user_id = $1 AND resource_type = $2
      `;
      const resourceCheck = await query(resourceCheckSql, [senderId, resourceType]);

      if (resourceCheck.rows.length === 0 || resourceCheck.rows[0].amount < amount) {
        return res.status(400).json({
          success: false,
          message: 'Yetersiz kaynak'
        });
      }

      // Kaynağı gönder
      const deductSql = `
        UPDATE resources 
        SET amount = amount - $1 
        WHERE user_id = $2 AND resource_type = $3
      `;
      await query(deductSql, [amount, senderId, resourceType]);

      const addSql = `
        UPDATE resources 
        SET amount = amount + $1 
        WHERE user_id = $2 AND resource_type = $3
      `;
      await query(addSql, [amount, receiverId, resourceType]);

      // Kaydı tut
      const insertSql = `
        INSERT INTO resource_gifts (sender_id, receiver_id, resource_type, amount)
        VALUES ($1, $2, $3, $4)
      `;
      await query(insertSql, [senderId, receiverId, resourceType, amount]);

      res.json({
        success: true,
        message: 'Hediye gonderildi! 🎁'
      });
    } catch (error) {
      console.error('Send gift error:', error);
      res.status(500).json({
        success: false,
        message: 'Hediye gonderilemedi'
      });
    }
  }
}

module.exports = FriendController;