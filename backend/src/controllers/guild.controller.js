const { query } = require('../config/database');

// Kale seviyesi başına savunma gücü
const CASTLE_DEF_PER_LEVEL = 500;
// Asker üretim maliyeti (her 10 asker için)
const TROOP_COST = { infantry: { wood: 50, food: 30 }, archer: { wood: 80, food: 20 }, cavalry: { food: 100, gold: 50 } };
// Kale yükseltme maliyeti (seviye başına bağış puanı)
const CASTLE_UPGRADE_COST = [0, 500, 1500, 4000, 10000, 25000, 60000, 150000, 400000, 1000000];

class GuildController {
  // ────────────────────────────────────────────
  // TEMEL GUILD İŞLEMLERİ
  // ────────────────────────────────────────────

  static async createGuild(req, res) {
    try {
      const { name, description } = req.body;
      const leaderId = req.userId;

      if (!name || name.length < 3)
        return res.status(400).json({ success: false, message: 'Klan ismi en az 3 karakter olmalıdır' });

      const memberCheck = await query('SELECT id FROM guild_members WHERE user_id = $1', [leaderId]);
      if (memberCheck.rows.length > 0)
        return res.status(400).json({ success: false, message: 'Zaten bir klana üyesiniz' });

      const guildResult = await query(
        'INSERT INTO guilds (name, description, leader_id) VALUES ($1, $2, $3) RETURNING *',
        [name, description, leaderId]
      );
      const guild = guildResult.rows[0];

      await query('INSERT INTO guild_members (guild_id, user_id, role, contribution_points) VALUES ($1, $2, $3, 0)', [guild.id, leaderId, 'leader']);
      await query('INSERT INTO guild_troops (guild_id) VALUES ($1) ON CONFLICT DO NOTHING', [guild.id]);

      for (const rt of ['gold', 'wood', 'food', 'energy'])
        await query('INSERT INTO guild_storage (guild_id, resource_type, amount) VALUES ($1, $2, 0)', [guild.id, rt]);

      res.json({ success: true, message: 'Klan oluşturuldu! 🏰', data: { guild } });
    } catch (error) {
      console.error('Create guild error:', error);
      if (error.code === '23505')
        return res.status(400).json({ success: false, message: 'Bu isimde bir klan zaten var' });
      res.status(500).json({ success: false, message: 'Klan oluşturulamadı' });
    }
  }

  static async listGuilds(req, res) {
    try {
      const sql = `
        SELECT g.*, u.username AS leader_name,
          (SELECT COUNT(*) FROM guild_members WHERE guild_id = g.id) AS member_count
        FROM guilds g JOIN users u ON g.leader_id = u.id
        ORDER BY g.weekly_stars DESC, g.total_stars DESC, g.created_at DESC
      `;
      const result = await query(sql);
      res.json({ success: true, data: { guilds: result.rows } });
    } catch (error) {
      console.error('List guilds error:', error);
      res.status(500).json({ success: false, message: 'Klanlar getirilemedi' });
    }
  }

  static async getGuildDetails(req, res) {
    try {
      const { guildId } = req.query;

      const guildResult = await query(
        'SELECT g.*, u.username AS leader_name FROM guilds g JOIN users u ON g.leader_id = u.id WHERE g.id = $1',
        [guildId]
      );
      if (guildResult.rows.length === 0)
        return res.status(404).json({ success: false, message: 'Klan bulunamadı' });

      const membersResult = await query(
        `SELECT gm.*, u.username, u.level, u.league
         FROM guild_members gm JOIN users u ON gm.user_id = u.id
         WHERE gm.guild_id = $1
         ORDER BY CASE gm.role WHEN 'leader' THEN 1 WHEN 'co-leader' THEN 2 WHEN 'officer' THEN 3 ELSE 4 END, gm.contribution_points DESC`,
        [guildId]
      );

      const storageResult = await query('SELECT * FROM guild_storage WHERE guild_id = $1', [guildId]);
      const troopsResult = await query('SELECT * FROM guild_troops WHERE guild_id = $1', [guildId]);

      res.json({
        success: true,
        data: {
          guild: guildResult.rows[0],
          members: membersResult.rows,
          storage: storageResult.rows,
          troops: troopsResult.rows[0] || null,
        }
      });
    } catch (error) {
      console.error('Get guild details error:', error);
      res.status(500).json({ success: false, message: 'Klan detayları getirilemedi' });
    }
  }

  static async getUserGuild(req, res) {
    try {
      const userId = req.userId;
      const sql = `
        SELECT g.*, gm.role, gm.contribution_points, u.username AS leader_name
        FROM guild_members gm
        JOIN guilds g ON gm.guild_id = g.id
        JOIN users u ON g.leader_id = u.id
        WHERE gm.user_id = $1
      `;
      const result = await query(sql, [userId]);
      res.json({ success: true, data: { guild: result.rows[0] || null } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Klan bilgisi getirilemedi' });
    }
  }

  // ────────────────────────────────────────────
  // LİDER YETKİLERİ
  // ────────────────────────────────────────────

  // Klan adını değiştir (3 ayda 1)
  static async renameGuild(req, res) {
    try {
      const { guildId, newName } = req.body;
      const userId = req.userId;

      if (!newName || newName.length < 3)
        return res.status(400).json({ success: false, message: 'Klan adı en az 3 karakter olmalıdır' });

      const guildResult = await query('SELECT * FROM guilds WHERE id = $1', [guildId]);
      if (!guildResult.rows[0]) return res.status(404).json({ success: false, message: 'Klan bulunamadı' });
      const guild = guildResult.rows[0];

      if (parseInt(guild.leader_id) !== parseInt(userId))
        return res.status(403).json({ success: false, message: 'Sadece kurucu klan adını değiştirebilir' });

      if (guild.name_changed_at) {
        const monthsAgo = (Date.now() - new Date(guild.name_changed_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAgo < 3)
          return res.status(400).json({ success: false, message: `Klan adı 3 ayda bir değiştirilebilir. Kalan: ${Math.ceil(3 - monthsAgo * 30)} gün` });
      }

      await query('UPDATE guilds SET name = $1, name_changed_at = NOW() WHERE id = $2', [newName, guildId]);
      res.json({ success: true, message: 'Klan adı değiştirildi!' });
    } catch (error) {
      if (error.code === '23505') return res.status(400).json({ success: false, message: 'Bu isimde bir klan zaten var' });
      res.status(500).json({ success: false, message: 'Ad değiştirilemedi' });
    }
  }

  // Klanı dağıt
  static async disbandGuild(req, res) {
    try {
      const { guildId } = req.body;
      const userId = req.userId;

      const guildResult = await query('SELECT leader_id FROM guilds WHERE id = $1', [guildId]);
      if (!guildResult.rows[0]) return res.status(404).json({ success: false, message: 'Klan bulunamadı' });

      if (parseInt(guildResult.rows[0].leader_id) !== parseInt(userId))
        return res.status(403).json({ success: false, message: 'Sadece kurucu klanı dağıtabilir' });

      // CASCADE ile tüm ilişkili veriler silinir
      await query('DELETE FROM guilds WHERE id = $1', [guildId]);
      res.json({ success: true, message: 'Klan dağıtıldı.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Klan dağıtılamadı' });
    }
  }

  // İlan tahtası güncelle
  static async updateBulletin(req, res) {
    try {
      const { guildId, bulletin } = req.body;
      const userId = req.userId;

      const memberResult = await query(
        "SELECT role FROM guild_members WHERE user_id = $1 AND guild_id = $2",
        [userId, guildId]
      );
      if (!memberResult.rows[0] || !['leader', 'co-leader'].includes(memberResult.rows[0].role))
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });

      await query('UPDATE guilds SET bulletin = $1 WHERE id = $2', [bulletin, guildId]);
      res.json({ success: true, message: 'İlan tahtası güncellendi' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Güncellenemedi' });
    }
  }

  // Üye rolünü değiştir
  static async changeMemberRole(req, res) {
    try {
      const { guildId, targetUserId, newRole } = req.body;
      const userId = req.userId;

      const validRoles = ['co-leader', 'officer', 'member'];
      if (!validRoles.includes(newRole))
        return res.status(400).json({ success: false, message: 'Geçersiz rol' });

      const myRole = await query(
        "SELECT role FROM guild_members WHERE user_id = $1 AND guild_id = $2",
        [userId, guildId]
      );
      if (!myRole.rows[0] || !['leader', 'co-leader'].includes(myRole.rows[0].role))
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });

      // co-leader rolü sadece lider verebilir
      if (newRole === 'co-leader' && myRole.rows[0].role !== 'leader')
        return res.status(403).json({ success: false, message: 'Co-leader rolünü sadece kurucu verebilir' });

      await query(
        "UPDATE guild_members SET role = $1 WHERE user_id = $2 AND guild_id = $3 AND role != 'leader'",
        [newRole, targetUserId, guildId]
      );
      res.json({ success: true, message: 'Rol güncellendi' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Rol değiştirilemedi' });
    }
  }

  // Üyeyi at
  static async kickMember(req, res) {
    try {
      const { guildId, targetUserId } = req.body;
      const userId = req.userId;

      const myRole = await query(
        "SELECT role FROM guild_members WHERE user_id = $1 AND guild_id = $2",
        [userId, guildId]
      );
      if (!myRole.rows[0] || !['leader', 'co-leader', 'officer'].includes(myRole.rows[0].role))
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });

      const targetRole = await query(
        "SELECT role FROM guild_members WHERE user_id = $1 AND guild_id = $2",
        [targetUserId, guildId]
      );
      if (!targetRole.rows[0]) return res.status(404).json({ success: false, message: 'Üye bulunamadı' });
      if (targetRole.rows[0].role === 'leader') return res.status(403).json({ success: false, message: 'Kurucu atılamaz' });

      await query("DELETE FROM guild_members WHERE user_id = $1 AND guild_id = $2", [targetUserId, guildId]);
      res.json({ success: true, message: 'Üye klan dan çıkarıldı' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Üye atılamadı' });
    }
  }

  // ────────────────────────────────────────────
  // BAŞVURU SİSTEMİ
  // ────────────────────────────────────────────

  static async applyToGuild(req, res) {
    try {
      const { guildId, message } = req.body;
      const userId = req.userId;

      const memberCheck = await query('SELECT id FROM guild_members WHERE user_id = $1', [userId]);
      if (memberCheck.rows.length > 0)
        return res.status(400).json({ success: false, message: 'Zaten bir klana üyesiniz' });

      const appCheck = await query(
        "SELECT id FROM guild_applications WHERE guild_id = $1 AND user_id = $2 AND status = 'pending'",
        [guildId, userId]
      );
      if (appCheck.rows.length > 0)
        return res.status(400).json({ success: false, message: 'Zaten başvurunuz var' });

      await query(
        "INSERT INTO guild_applications (guild_id, user_id, message, status) VALUES ($1, $2, $3, 'pending')",
        [guildId, userId, message]
      );
      res.json({ success: true, message: 'Başvurunuz gönderildi! 📨' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Başvuru gönderilemedi' });
    }
  }

  static async getApplications(req, res) {
    try {
      const { guildId } = req.query;
      const sql = `
        SELECT ga.*, u.username, u.level, u.league
        FROM guild_applications ga JOIN users u ON ga.user_id = u.id
        WHERE ga.guild_id = $1 AND ga.status = 'pending'
        ORDER BY ga.created_at DESC
      `;
      const result = await query(sql, [guildId]);
      res.json({ success: true, data: { applications: result.rows } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Başvurular getirilemedi' });
    }
  }

  static async acceptApplication(req, res) {
    try {
      const { applicationId, guildId } = req.body;
      const userId = req.userId;

      const myRole = await query("SELECT role FROM guild_members WHERE user_id = $1 AND guild_id = $2", [userId, guildId]);
      if (!myRole.rows[0] || !['leader', 'co-leader', 'officer'].includes(myRole.rows[0].role))
        return res.status(403).json({ success: false, message: 'Yetkiniz yok' });

      const appResult = await query("SELECT * FROM guild_applications WHERE id = $1 AND status = 'pending'", [applicationId]);
      if (!appResult.rows[0]) return res.status(404).json({ success: false, message: 'Başvuru bulunamadı' });

      const limitCheck = await query(
        "SELECT g.member_limit, (SELECT COUNT(*) FROM guild_members WHERE guild_id = g.id) AS cnt FROM guilds g WHERE g.id = $1",
        [guildId]
      );
      if (parseInt(limitCheck.rows[0].cnt) >= limitCheck.rows[0].member_limit)
        return res.status(400).json({ success: false, message: 'Klan dolu' });

      await query("UPDATE guild_applications SET status = 'accepted', responded_at = NOW() WHERE id = $1", [applicationId]);
      await query("INSERT INTO guild_members (guild_id, user_id, role) VALUES ($1, $2, 'member')", [guildId, appResult.rows[0].user_id]);
      res.json({ success: true, message: 'Başvuru kabul edildi! 🎉' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Başvuru kabul edilemedi' });
    }
  }

  static async rejectApplication(req, res) {
    try {
      const { applicationId } = req.body;
      const result = await query(
        "UPDATE guild_applications SET status = 'rejected', responded_at = NOW() WHERE id = $1 AND status = 'pending'",
        [applicationId]
      );
      if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Başvuru bulunamadı' });
      res.json({ success: true, message: 'Başvuru reddedildi' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Başvuru reddedilemedi' });
    }
  }

  static async leaveGuild(req, res) {
    try {
      const { guildId } = req.body;
      const userId = req.userId;

      const memberResult = await query("SELECT role FROM guild_members WHERE user_id = $1 AND guild_id = $2", [userId, guildId]);
      if (!memberResult.rows[0]) return res.status(404).json({ success: false, message: 'Klan üyesi değilsiniz' });
      if (memberResult.rows[0].role === 'leader')
        return res.status(400).json({ success: false, message: 'Kurucu ayrılamaz. Önce liderliği devredin' });

      await query("DELETE FROM guild_members WHERE user_id = $1", [userId]);
      res.json({ success: true, message: 'Klandan ayrıldınız' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Ayrılamadı' });
    }
  }

  // ────────────────────────────────────────────
  // BAĞIŞ VE KALE
  // ────────────────────────────────────────────

  static async donate(req, res) {
    try {
      const { guildId, resourceType, amount } = req.body;
      const userId = req.userId;

      if (amount <= 0 || amount > 10000)
        return res.status(400).json({ success: false, message: 'Miktar 1-10000 arasında olmalıdır' });

      const resourceCheck = await query(
        'SELECT amount FROM resources WHERE user_id = $1 AND resource_type = $2',
        [userId, resourceType]
      );
      if (!resourceCheck.rows[0] || resourceCheck.rows[0].amount < amount)
        return res.status(400).json({ success: false, message: 'Yetersiz kaynak' });

      await query('UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = $3', [amount, userId, resourceType]);
      await query('UPDATE guild_storage SET amount = amount + $1 WHERE guild_id = $2 AND resource_type = $3', [amount, guildId, resourceType]);
      await query('UPDATE guild_members SET contribution_points = contribution_points + $1 WHERE user_id = $2 AND guild_id = $3', [amount, userId, guildId]);
      await query('INSERT INTO guild_donations (guild_id, user_id, resource_type, amount) VALUES ($1, $2, $3, $4)', [guildId, userId, resourceType, amount]);

      // Kale yükseltme kontrolü
      await GuildController._checkCastleUpgrade(guildId);

      res.json({ success: true, message: `${amount} ${resourceType} bağışlandı! 🎁` });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Bağış yapılamadı' });
    }
  }

  // Toplam bağışa göre kale seviyesini otomatik yükselt
  static async _checkCastleUpgrade(guildId) {
    try {
      const totalDonations = await query(
        'SELECT SUM(amount) AS total FROM guild_donations WHERE guild_id = $1',
        [guildId]
      );
      const total = parseInt(totalDonations.rows[0].total || 0);
      const guild = await query('SELECT castle_level FROM guilds WHERE id = $1', [guildId]);
      let currentLevel = guild.rows[0].castle_level;
      const maxLevel = CASTLE_UPGRADE_COST.length - 1;

      while (currentLevel < maxLevel && total >= CASTLE_UPGRADE_COST[currentLevel + 1]) {
        currentLevel++;
      }
      await query('UPDATE guilds SET castle_level = $1 WHERE id = $2', [currentLevel, guildId]);
    } catch (e) {
      console.error('Castle upgrade check error:', e.message);
    }
  }

  // Kale bilgisi
  static async getCastleInfo(req, res) {
    try {
      const { guildId } = req.query;
      const guild = await query('SELECT castle_level FROM guilds WHERE id = $1', [guildId]);
      if (!guild.rows[0]) return res.status(404).json({ success: false, message: 'Klan bulunamadı' });

      const level = guild.rows[0].castle_level;
      const maxLevel = CASTLE_UPGRADE_COST.length - 1;
      const nextCost = level < maxLevel ? CASTLE_UPGRADE_COST[level + 1] : null;
      const totalDonations = await query('SELECT SUM(amount) AS total FROM guild_donations WHERE guild_id = $1', [guildId]);
      const total = parseInt(totalDonations.rows[0].total || 0);
      const defPower = level * CASTLE_DEF_PER_LEVEL;

      res.json({ success: true, data: { level, maxLevel, defPower, nextLevelCost: nextCost, totalDonations: total, progress: nextCost ? Math.min(100, Math.floor((total / nextCost) * 100)) : 100 } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Kale bilgisi getirilemedi' });
    }
  }

  // ────────────────────────────────────────────
  // ASKER SİSTEMİ
  // ────────────────────────────────────────────

  static async recruitTroops(req, res) {
    try {
      const { guildId, troopType, count } = req.body;
      const userId = req.userId;

      const myRole = await query("SELECT role FROM guild_members WHERE user_id = $1 AND guild_id = $2", [userId, guildId]);
      if (!myRole.rows[0] || !['leader', 'co-leader', 'officer'].includes(myRole.rows[0].role))
        return res.status(403).json({ success: false, message: 'Sadece yetkililer asker üretebilir' });

      const cost = TROOP_COST[troopType];
      if (!cost) return res.status(400).json({ success: false, message: 'Geçersiz asker tipi' });

      // Klan deposundan kaynak düş
      for (const [resType, perTen] of Object.entries(cost)) {
        const totalCost = Math.floor((count / 10) * perTen);
        const storageRow = await query(
          'SELECT amount FROM guild_storage WHERE guild_id = $1 AND resource_type = $2',
          [guildId, resType]
        );
        if (!storageRow.rows[0] || storageRow.rows[0].amount < totalCost)
          return res.status(400).json({ success: false, message: `Klan deposunda yetersiz ${resType}` });
        await query('UPDATE guild_storage SET amount = amount - $1 WHERE guild_id = $2 AND resource_type = $3', [totalCost, guildId, resType]);
      }

      await query(
        `INSERT INTO guild_troops (guild_id, ${troopType}) VALUES ($1, $2)
         ON CONFLICT (guild_id) DO UPDATE SET ${troopType} = guild_troops.${troopType} + $2, updated_at = NOW()`,
        [guildId, count]
      );
      res.json({ success: true, message: `${count} ${troopType} askeri üretildi!` });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Asker üretilemedi' });
    }
  }

  static async getTroops(req, res) {
    try {
      const { guildId } = req.query;
      const result = await query('SELECT * FROM guild_troops WHERE guild_id = $1', [guildId]);
      res.json({ success: true, data: { troops: result.rows[0] || { infantry: 0, archer: 0, cavalry: 0 } } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Asker bilgisi getirilemedi' });
    }
  }

  // ────────────────────────────────────────────
  // SAVAŞ SİSTEMİ
  // ────────────────────────────────────────────

  static async startWar(req, res) {
    try {
      const { attackerGuildId, defenderGuildId } = req.body;
      const userId = req.userId;

      const myRole = await query("SELECT role FROM guild_members WHERE user_id = $1 AND guild_id = $2", [userId, attackerGuildId]);
      if (!myRole.rows[0] || !['leader', 'co-leader'].includes(myRole.rows[0].role))
        return res.status(403).json({ success: false, message: 'Savaş başlatmak için Co-Leader veya üstü gerekli' });

      if (parseInt(attackerGuildId) === parseInt(defenderGuildId))
        return res.status(400).json({ success: false, message: 'Kendi klanınıza savaş açamazsınız' });

      // Aktif savaş var mı?
      const activeWar = await query(
        "SELECT id FROM guild_wars WHERE (attacker_guild_id = $1 OR defender_guild_id = $1) AND status != 'ended'",
        [attackerGuildId]
      );
      if (activeWar.rows.length > 0)
        return res.status(400).json({ success: false, message: 'Zaten aktif bir savaşınız var' });

      // 24 saat hazırlık, sonra savaş başlar
      const warStartAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const result = await query(
        "INSERT INTO guild_wars (attacker_guild_id, defender_guild_id, status, war_start_at) VALUES ($1, $2, 'preparation', $3) RETURNING *",
        [attackerGuildId, defenderGuildId, warStartAt]
      );

      // Haftalık yıldız güncelle (savaş açıldığında değil, kazanılınca)
      res.json({ success: true, message: 'Savaş ilanı gönderildi! Savaş 24 saat sonra başlar. ⚔️', data: { war: result.rows[0] } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Savaş başlatılamadı' });
    }
  }

  static async getActiveWar(req, res) {
    try {
      const { guildId } = req.query;
      const sql = `
        SELECT gw.*,
          ag.name AS attacker_name, ag.castle_level AS attacker_castle,
          dg.name AS defender_name, dg.castle_level AS defender_castle
        FROM guild_wars gw
        JOIN guilds ag ON ag.id = gw.attacker_guild_id
        JOIN guilds dg ON dg.id = gw.defender_guild_id
        WHERE (gw.attacker_guild_id = $1 OR gw.defender_guild_id = $1) AND gw.status != 'ended'
        ORDER BY gw.started_at DESC LIMIT 1
      `;
      const result = await query(sql, [guildId]);
      res.json({ success: true, data: { war: result.rows[0] || null } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Savaş bilgisi getirilemedi' });
    }
  }

  static async getWarHistory(req, res) {
    try {
      const { guildId } = req.query;
      const sql = `
        SELECT gw.*,
          ag.name AS attacker_name, dg.name AS defender_name
        FROM guild_wars gw
        JOIN guilds ag ON ag.id = gw.attacker_guild_id
        JOIN guilds dg ON dg.id = gw.defender_guild_id
        WHERE (gw.attacker_guild_id = $1 OR gw.defender_guild_id = $1) AND gw.status = 'ended'
        ORDER BY gw.ended_at DESC LIMIT 10
      `;
      const result = await query(sql, [guildId]);
      res.json({ success: true, data: { history: result.rows } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Savaş geçmişi getirilemedi' });
    }
  }

  // Savaş saldırısı kaydet
  static async recordWarAttack(req, res) {
    try {
      const { warId, defenderId, stars, damagePercent } = req.body;
      const attackerId = req.userId;

      const warResult = await query("SELECT * FROM guild_wars WHERE id = $1 AND status = 'active'", [warId]);
      if (!warResult.rows[0]) return res.status(400).json({ success: false, message: 'Aktif savaş bulunamadı' });

      // Zaten saldırdı mı?
      const prevAttack = await query(
        'SELECT id FROM guild_war_attacks WHERE war_id = $1 AND attacker_id = $2',
        [warId, attackerId]
      );
      if (prevAttack.rows.length > 0)
        return res.status(400).json({ success: false, message: 'Bu savaşta zaten saldırdınız' });

      await query(
        'INSERT INTO guild_war_attacks (war_id, attacker_id, defender_id, stars, damage_percent) VALUES ($1, $2, $3, $4, $5)',
        [warId, attackerId, defenderId, stars, damagePercent]
      );

      const war = warResult.rows[0];
      const isAttacker = await query("SELECT id FROM guild_members WHERE user_id = $1 AND guild_id = $2", [attackerId, war.attacker_guild_id]);

      if (isAttacker.rows.length > 0) {
        await query('UPDATE guild_wars SET attacker_stars = attacker_stars + $1 WHERE id = $2', [stars, warId]);
      } else {
        await query('UPDATE guild_wars SET defender_stars = defender_stars + $1 WHERE id = $2', [stars, warId]);
      }

      res.json({ success: true, message: `Saldırı kaydedildi! ${stars} yıldız kazandınız! ⭐` });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Saldırı kaydedilemedi' });
    }
  }

  // ────────────────────────────────────────────
  // SOHBET
  // ────────────────────────────────────────────

  static async getChatMessages(req, res) {
    try {
      const { guildId } = req.query;
      const sql = `
        SELECT gc.*, u.username
        FROM guild_chat gc JOIN users u ON gc.user_id = u.id
        WHERE gc.guild_id = $1
        ORDER BY gc.created_at DESC LIMIT 50
      `;
      const result = await query(sql, [guildId]);
      res.json({ success: true, data: { messages: result.rows.reverse() } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Mesajlar getirilemedi' });
    }
  }

  static async sendMessage(req, res) {
    try {
      const { guildId, message } = req.body;
      const userId = req.userId;

      if (!message || message.length === 0)
        return res.status(400).json({ success: false, message: 'Mesaj boş olamaz' });

      const result = await query(
        'INSERT INTO guild_chat (guild_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
        [guildId, userId, message]
      );
      const userResult = await query('SELECT username FROM users WHERE id = $1', [userId]);
      res.json({ success: true, data: { message: { ...result.rows[0], username: userResult.rows[0].username } } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Mesaj gönderilemedi' });
    }
  }
}

module.exports = GuildController;
