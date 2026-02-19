const { query } = require('../config/database');

class GuildController {
  // Guild oluştur
  static async createGuild(req, res) {
    try {
      const { name, description, leaderId } = req.body;

      if (!name || name.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Guild ismi en az 3 karakter olmalidir'
        });
      }

      // Kullanıcının zaten guild'i var mı?
      const memberCheckSql = `SELECT * FROM guild_members WHERE user_id = $1`;
      const memberCheck = await query(memberCheckSql, [leaderId]);

      if (memberCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Zaten bir guild\'e uyelsiniz'
        });
      }

      // Guild oluştur
      const createGuildSql = `
        INSERT INTO guilds (name, description, leader_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const guildResult = await query(createGuildSql, [name, description, leaderId]);
      const guild = guildResult.rows[0];

      // Lider olarak ekle
      const addLeaderSql = `
        INSERT INTO guild_members (guild_id, user_id, role, contribution_points)
        VALUES ($1, $2, 'leader', 0)
      `;
      await query(addLeaderSql, [guild.id, leaderId]);

      // Depo oluştur (4 kaynak tipi)
      const resourceTypes = ['gold', 'wood', 'food', 'energy'];
      for (const resourceType of resourceTypes) {
        const storageSql = `
          INSERT INTO guild_storage (guild_id, resource_type, amount)
          VALUES ($1, $2, 0)
        `;
        await query(storageSql, [guild.id, resourceType]);
      }

      res.json({
        success: true,
        message: 'Guild olusturuldu! 🏰',
        data: { guild }
      });
    } catch (error) {
      console.error('Create guild error:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Bu isimde bir guild zaten var'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Guild olusturulamadi'
      });
    }
  }

  // Tüm guild'leri listele
  static async listGuilds(req, res) {
    try {
      const sql = `
        SELECT 
          g.*,
          u.username as leader_name,
          (SELECT COUNT(*) FROM guild_members WHERE guild_id = g.id) as member_count
        FROM guilds g
        JOIN users u ON g.leader_id = u.id
        ORDER BY g.total_points DESC, g.created_at DESC
      `;
      const result = await query(sql);

      res.json({
        success: true,
        data: { guilds: result.rows }
      });
    } catch (error) {
      console.error('List guilds error:', error);
      res.status(500).json({
        success: false,
        message: 'Guild\'ler getirilemedi'
      });
    }
  }

  // Guild detayları
  static async getGuildDetails(req, res) {
    try {
      const { guildId } = req.query;

      const guildSql = `
        SELECT 
          g.*,
          u.username as leader_name
        FROM guilds g
        JOIN users u ON g.leader_id = u.id
        WHERE g.id = $1
      `;
      const guildResult = await query(guildSql, [guildId]);

      if (guildResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Guild bulunamadi'
        });
      }

      const membersSql = `
        SELECT 
          gm.*,
          u.username,
          u.level,
          u.league
        FROM guild_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.guild_id = $1
        ORDER BY 
          CASE gm.role 
            WHEN 'leader' THEN 1 
            WHEN 'officer' THEN 2 
            ELSE 3 
          END,
          gm.contribution_points DESC
      `;
      const membersResult = await query(membersSql, [guildId]);

      const storageSql = `
        SELECT * FROM guild_storage WHERE guild_id = $1
      `;
      const storageResult = await query(storageSql, [guildId]);

      res.json({
        success: true,
        data: {
          guild: guildResult.rows[0],
          members: membersResult.rows,
          storage: storageResult.rows
        }
      });
    } catch (error) {
      console.error('Get guild details error:', error);
      res.status(500).json({
        success: false,
        message: 'Guild detaylari getirilemedi'
      });
    }
  }

  // Kullanıcının guild'i
  static async getUserGuild(req, res) {
    try {
      const { userId } = req.query;

      const sql = `
        SELECT 
          g.*,
          gm.role,
          gm.contribution_points,
          u.username as leader_name
        FROM guild_members gm
        JOIN guilds g ON gm.guild_id = g.id
        JOIN users u ON g.leader_id = u.id
        WHERE gm.user_id = $1
      `;
      const result = await query(sql, [userId]);

      if (result.rows.length === 0) {
        return res.json({
          success: true,
          data: { guild: null }
        });
      }

      res.json({
        success: true,
        data: { guild: result.rows[0] }
      });
    } catch (error) {
      console.error('Get user guild error:', error);
      res.status(500).json({
        success: false,
        message: 'Guild bilgisi getirilemedi'
      });
    }
  }

  // Guild'e başvur
  static async applyToGuild(req, res) {
    try {
      const { guildId, userId, message } = req.body;

      // Zaten üye mi?
      const memberCheckSql = `SELECT * FROM guild_members WHERE user_id = $1`;
      const memberCheck = await query(memberCheckSql, [userId]);

      if (memberCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Zaten bir guild\'e uyelsiniz'
        });
      }

      // Bekleyen başvuru var mı?
      const appCheckSql = `
        SELECT * FROM guild_applications 
        WHERE guild_id = $1 AND user_id = $2 AND status = 'pending'
      `;
      const appCheck = await query(appCheckSql, [guildId, userId]);

      if (appCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Zaten basvurunuz var'
        });
      }

      // Başvuru yap
      const insertSql = `
        INSERT INTO guild_applications (guild_id, user_id, message, status)
        VALUES ($1, $2, $3, 'pending')
      `;
      await query(insertSql, [guildId, userId, message]);

      res.json({
        success: true,
        message: 'Basvurunuz gonderildi! 📨'
      });
    } catch (error) {
      console.error('Apply to guild error:', error);
      res.status(500).json({
        success: false,
        message: 'Basvuru gonderilemedi'
      });
    }
  }

  // Başvuruları görüntüle (Lider/Officer)
  static async getApplications(req, res) {
    try {
      const { guildId } = req.query;

      const sql = `
        SELECT 
          ga.*,
          u.username,
          u.level,
          u.league
        FROM guild_applications ga
        JOIN users u ON ga.user_id = u.id
        WHERE ga.guild_id = $1 AND ga.status = 'pending'
        ORDER BY ga.created_at DESC
      `;
      const result = await query(sql, [guildId]);

      res.json({
        success: true,
        data: { applications: result.rows }
      });
    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Basvurular getirilemedi'
      });
    }
  }

  // Başvuruyu kabul et
  static async acceptApplication(req, res) {
    try {
      const { applicationId, guildId } = req.body;

      // Başvuruyu getir
      const appSql = `
        SELECT * FROM guild_applications 
        WHERE id = $1 AND status = 'pending'
      `;
      const appResult = await query(appSql, [applicationId]);

      if (appResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Basvuru bulunamadi'
        });
      }

      const application = appResult.rows[0];

      // Üye limitini kontrol et
      const memberCountSql = `
        SELECT 
          g.member_limit,
          (SELECT COUNT(*) FROM guild_members WHERE guild_id = g.id) as current_members
        FROM guilds g
        WHERE g.id = $1
      `;
      const memberCountResult = await query(memberCountSql, [guildId]);
      const { member_limit, current_members } = memberCountResult.rows[0];

      if (parseInt(current_members) >= member_limit) {
        return res.status(400).json({
          success: false,
          message: 'Guild dolu'
        });
      }

      // Başvuruyu kabul et
      const updateSql = `
        UPDATE guild_applications 
        SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      await query(updateSql, [applicationId]);

      // Üye olarak ekle
      const insertMemberSql = `
        INSERT INTO guild_members (guild_id, user_id, role)
        VALUES ($1, $2, 'member')
      `;
      await query(insertMemberSql, [application.guild_id, application.user_id]);

      res.json({
        success: true,
        message: 'Basvuru kabul edildi! 🎉'
      });
    } catch (error) {
      console.error('Accept application error:', error);
      res.status(500).json({
        success: false,
        message: 'Basvuru kabul edilemedi'
      });
    }
  }

  // Başvuruyu reddet
  static async rejectApplication(req, res) {
    try {
      const { applicationId } = req.body;

      const updateSql = `
        UPDATE guild_applications 
        SET status = 'rejected', responded_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'pending'
      `;
      const result = await query(updateSql, [applicationId]);

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Basvuru bulunamadi'
        });
      }

      res.json({
        success: true,
        message: 'Basvuru reddedildi'
      });
    } catch (error) {
      console.error('Reject application error:', error);
      res.status(500).json({
        success: false,
        message: 'Basvuru reddedilemedi'
      });
    }
  }

  // Guild'den ayrıl
  static async leaveGuild(req, res) {
    try {
      const { userId, guildId } = req.body;

      // Lider mi kontrol et
      const memberSql = `SELECT role FROM guild_members WHERE user_id = $1 AND guild_id = $2`;
      const memberResult = await query(memberSql, [userId, guildId]);

      if (memberResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Guild uyesi degilsiniz'
        });
      }

      if (memberResult.rows[0].role === 'leader') {
        return res.status(400).json({
          success: false,
          message: 'Lider ayrilamaz. Once liderligi devredin'
        });
      }

      // Üyelikten çıkar
      const deleteSql = `DELETE FROM guild_members WHERE user_id = $1`;
      await query(deleteSql, [userId]);

      res.json({
        success: true,
        message: 'Guild\'den ayrildiniz'
      });
    } catch (error) {
      console.error('Leave guild error:', error);
      res.status(500).json({
        success: false,
        message: 'Ayrilamadi'
      });
    }
  }

  // Bağış yap
  static async donate(req, res) {
    try {
      const { userId, guildId, resourceType, amount } = req.body;

      if (amount <= 0 || amount > 100) {
        return res.status(400).json({
          success: false,
          message: 'Miktar 1-100 arasinda olmalidir'
        });
      }

      // Kaynağı kontrol et
      const resourceCheckSql = `
        SELECT amount FROM resources 
        WHERE user_id = $1 AND resource_type = $2
      `;
      const resourceCheck = await query(resourceCheckSql, [userId, resourceType]);

      if (resourceCheck.rows.length === 0 || resourceCheck.rows[0].amount < amount) {
        return res.status(400).json({
          success: false,
          message: 'Yetersiz kaynak'
        });
      }

      // Kaynağı düş
      const deductSql = `
        UPDATE resources 
        SET amount = amount - $1 
        WHERE user_id = $2 AND resource_type = $3
      `;
      await query(deductSql, [amount, userId, resourceType]);

      // Depoya ekle
      const addToStorageSql = `
        UPDATE guild_storage 
        SET amount = amount + $1 
        WHERE guild_id = $2 AND resource_type = $3
      `;
      await query(addToStorageSql, [amount, guildId, resourceType]);

      // Contribution puanı ekle
      const updateContributionSql = `
        UPDATE guild_members 
        SET contribution_points = contribution_points + $1 
        WHERE user_id = $2 AND guild_id = $3
      `;
      await query(updateContributionSql, [amount, userId, guildId]);

      // Bağış kaydı
      const donationSql = `
        INSERT INTO guild_donations (guild_id, user_id, resource_type, amount)
        VALUES ($1, $2, $3, $4)
      `;
      await query(donationSql, [guildId, userId, resourceType, amount]);

      res.json({
        success: true,
        message: 'Bagis yapildi! 🎁'
      });
    } catch (error) {
      console.error('Donate error:', error);
      res.status(500).json({
        success: false,
        message: 'Bagis yapilamadi'
      });
    }
  }

  // Sohbet mesajları
  static async getChatMessages(req, res) {
    try {
      const { guildId } = req.query;

      const sql = `
        SELECT 
          gc.*,
          u.username
        FROM guild_chat gc
        JOIN users u ON gc.user_id = u.id
        WHERE gc.guild_id = $1
        ORDER BY gc.created_at DESC
        LIMIT 50
      `;
      const result = await query(sql, [guildId]);

      res.json({
        success: true,
        data: { messages: result.rows.reverse() }
      });
    } catch (error) {
      console.error('Get chat messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Mesajlar getirilemedi'
      });
    }
  }

  // Mesaj gönder
  static async sendMessage(req, res) {
    try {
      const { guildId, userId, message } = req.body;

      if (!message || message.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Mesaj bos olamaz'
        });
      }

      const insertSql = `
        INSERT INTO guild_chat (guild_id, user_id, message)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const result = await query(insertSql, [guildId, userId, message]);

      // Kullanıcı adını al
      const userSql = `SELECT username FROM users WHERE id = $1`;
      const userResult = await query(userSql, [userId]);

      res.json({
        success: true,
        data: {
          message: {
            ...result.rows[0],
            username: userResult.rows[0].username
          }
        }
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Mesaj gonderilemedi'
      });
    }
  }
}

module.exports = GuildController;