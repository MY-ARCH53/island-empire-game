const { query } = require('../config/database');

const MAX_MSG_LENGTH = 200;

class ChatController {
  // Global sohbet - son 50 mesaj
  static async getGlobalMessages(req, res) {
    try {
      const { since } = req.query; // timestamp - sadece yeni mesajları al
      let sql, params;

      if (since) {
        sql = `
          SELECT gc.id, gc.message, gc.created_at, u.username, u.level, u.league
          FROM global_chat gc
          JOIN users u ON u.id = gc.user_id
          WHERE gc.created_at > $1
          ORDER BY gc.created_at ASC
        `;
        params = [new Date(parseInt(since))];
      } else {
        sql = `
          SELECT gc.id, gc.message, gc.created_at, u.username, u.level, u.league
          FROM global_chat gc
          JOIN users u ON u.id = gc.user_id
          ORDER BY gc.created_at DESC
          LIMIT 50
        `;
        params = [];
      }

      const result = await query(sql, params);
      const messages = since ? result.rows : result.rows.reverse();

      res.json({ success: true, data: { messages } });
    } catch (error) {
      console.error('getGlobalMessages error:', error);
      res.status(500).json({ success: false, message: 'Mesajlar getirilemedi' });
    }
  }

  // Global mesaj gönder
  static async sendGlobalMessage(req, res) {
    try {
      const { message } = req.body;
      const userId = req.userId;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Mesaj boş olamaz' });
      }
      if (message.length > MAX_MSG_LENGTH) {
        return res.status(400).json({ success: false, message: `Mesaj en fazla ${MAX_MSG_LENGTH} karakter olabilir` });
      }

      // Spam koruması: son 3 saniyede mesaj attı mı?
      const spamCheck = await query(
        `SELECT id FROM global_chat WHERE user_id = $1 AND created_at > NOW() - INTERVAL '3 seconds'`,
        [userId]
      );
      if (spamCheck.rows.length > 0) {
        return res.status(429).json({ success: false, message: 'Çok hızlı mesaj gönderiyorsun, biraz bekle' });
      }

      const result = await query(
        `INSERT INTO global_chat (user_id, message) VALUES ($1, $2) RETURNING id, message, created_at`,
        [userId, message.trim()]
      );

      const userRes = await query('SELECT username, level, league FROM users WHERE id = $1', [userId]);
      const msg = { ...result.rows[0], ...userRes.rows[0] };

      res.json({ success: true, data: { message: msg } });
    } catch (error) {
      console.error('sendGlobalMessage error:', error);
      res.status(500).json({ success: false, message: 'Mesaj gönderilemedi' });
    }
  }

  // Özel mesaj gönder
  static async sendPrivateMessage(req, res) {
    try {
      const { receiverId, message } = req.body;
      const senderId = req.userId;

      if (parseInt(receiverId) === parseInt(senderId)) {
        return res.status(400).json({ success: false, message: 'Kendinize mesaj gönderemezsiniz' });
      }
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'Mesaj boş olamaz' });
      }
      if (message.length > MAX_MSG_LENGTH) {
        return res.status(400).json({ success: false, message: `Mesaj en fazla ${MAX_MSG_LENGTH} karakter olabilir` });
      }

      // Alıcı var mı?
      const receiverCheck = await query('SELECT id FROM users WHERE id = $1 AND is_active = TRUE', [receiverId]);
      if (receiverCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
      }

      const result = await query(
        `INSERT INTO private_messages (sender_id, receiver_id, message) VALUES ($1, $2, $3) RETURNING *`,
        [senderId, receiverId, message.trim()]
      );

      res.json({ success: true, data: { message: result.rows[0] } });
    } catch (error) {
      console.error('sendPrivateMessage error:', error);
      res.status(500).json({ success: false, message: 'Mesaj gönderilemedi' });
    }
  }

  // İkili konuşma mesajları
  static async getConversation(req, res) {
    try {
      const { otherId } = req.params;
      const userId = req.userId;

      const sql = `
        SELECT pm.*,
               s.username AS sender_username,
               r.username AS receiver_username
        FROM private_messages pm
        JOIN users s ON s.id = pm.sender_id
        JOIN users r ON r.id = pm.receiver_id
        WHERE (pm.sender_id = $1 AND pm.receiver_id = $2)
           OR (pm.sender_id = $2 AND pm.receiver_id = $1)
        ORDER BY pm.created_at ASC
        LIMIT 100
      `;
      const result = await query(sql, [userId, otherId]);

      // Okunmamış mesajları okundu işaretle
      await query(
        `UPDATE private_messages SET is_read = TRUE WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
        [otherId, userId]
      );

      res.json({ success: true, data: { messages: result.rows } });
    } catch (error) {
      console.error('getConversation error:', error);
      res.status(500).json({ success: false, message: 'Mesajlar getirilemedi' });
    }
  }

  // Konuşma listesi (son mesajlaşılan kişiler)
  static async getConversationList(req, res) {
    try {
      const userId = req.userId;

      const sql = `
        SELECT DISTINCT ON (other_id)
          other_id,
          other_username,
          last_message,
          last_time,
          unread_count
        FROM (
          SELECT
            CASE WHEN pm.sender_id = $1 THEN pm.receiver_id ELSE pm.sender_id END AS other_id,
            CASE WHEN pm.sender_id = $1 THEN r.username ELSE s.username END AS other_username,
            pm.message AS last_message,
            pm.created_at AS last_time,
            (SELECT COUNT(*) FROM private_messages
             WHERE sender_id = CASE WHEN pm.sender_id = $1 THEN pm.receiver_id ELSE pm.sender_id END
               AND receiver_id = $1 AND is_read = FALSE) AS unread_count
          FROM private_messages pm
          JOIN users s ON s.id = pm.sender_id
          JOIN users r ON r.id = pm.receiver_id
          WHERE pm.sender_id = $1 OR pm.receiver_id = $1
          ORDER BY pm.created_at DESC
        ) sub
        ORDER BY other_id, last_time DESC
      `;
      const result = await query(sql, [userId]);

      res.json({ success: true, data: { conversations: result.rows } });
    } catch (error) {
      console.error('getConversationList error:', error);
      res.status(500).json({ success: false, message: 'Konuşmalar getirilemedi' });
    }
  }

  // Toplam okunmamış mesaj sayısı
  static async getUnreadCount(req, res) {
    try {
      const userId = req.userId;
      const result = await query(
        `SELECT COUNT(*) AS count FROM private_messages WHERE receiver_id = $1 AND is_read = FALSE`,
        [userId]
      );
      res.json({ success: true, data: { unread: parseInt(result.rows[0].count) } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Hata' });
    }
  }
}

module.exports = ChatController;
