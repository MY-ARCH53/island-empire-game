const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

// Bot adı üretmek için listeler
const BOT_PREFIXES = ['Kaptan','Korsan','Ada','Deniz','Fırtına','Ejder','Aslan',
                      'Şimşek','Gemi','Kılıç','Kalkan','Kaya','Liman','Rüzgar','Dalgaç'];
const BOT_SUFFIXES = ['Reis','Bey','Han','Aga','Kurt','Doğan','Yıldız','Demir','Taş','Ocak'];

class AdminController {
  // Tüm kullanıcıları getir (botlar hariç)
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
        WHERE (u.is_bot = FALSE OR u.is_bot IS NULL)
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
        query('SELECT COUNT(*) as total FROM users WHERE (is_bot = FALSE OR is_bot IS NULL)'),
        query('SELECT COUNT(*) as total FROM battles'),
        query('SELECT COUNT(*) as total FROM guilds'),
        query("SELECT COUNT(*) as total FROM users WHERE last_login > NOW() - INTERVAL '24 hours' AND (is_bot = FALSE OR is_bot IS NULL)"),
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
      const resources = req.body;

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

  // ── BOT YÖNETİMİ ──────────────────────────────────────────────────────────

  // Bot listesi
  static async getBots(req, res) {
    try {
      const sql = `
        SELECT
          u.id,
          u.username,
          u.level,
          u.shield_until,
          u.created_at,
          COALESCE(a.total_power, 0)    AS total_power,
          COALESCE(a.archer_count, 0)   AS archer_count,
          COALESCE(a.infantry_count, 0) AS infantry_count,
          COALESCE(a.cavalry_count, 0)  AS cavalry_count,
          (SELECT COUNT(*) FROM battles WHERE attacker_id = u.id)::int    AS attack_count,
          (SELECT MAX(created_at) FROM battles WHERE attacker_id = u.id)  AS last_attack_at
        FROM users u
        LEFT JOIN armies a ON a.user_id = u.id
        WHERE u.is_bot = TRUE
        ORDER BY u.id ASC
      `;
      const result = await query(sql);
      const countRes = await query('SELECT COUNT(*) AS total FROM users WHERE is_bot = TRUE');

      res.json({
        success: true,
        data: {
          bots: result.rows,
          total: parseInt(countRes.rows[0].total),
        }
      });
    } catch (error) {
      console.error('Admin getBots error:', error);
      res.status(500).json({ success: false, message: 'Botlar getirilemedi', error: error.message });
    }
  }

  // Bot oluştur
  static async createBots(req, res) {
    try {
      const count = Math.min(parseInt(req.body.count) || 1000, 1000);

      // Zaten bot var mı?
      const existingRes = await query('SELECT COUNT(*) AS total FROM users WHERE is_bot = TRUE');
      const existing = parseInt(existingRes.rows[0].total);
      if (existing >= count) {
        return res.status(400).json({
          success: false,
          message: `Zaten ${existing} bot mevcut.`
        });
      }

      const startFrom = existing + 1;
      const toCreate = count - existing;
      const passwordHash = await bcrypt.hash('bot_password_secret', 8);

      let created = 0;
      for (let i = startFrom; i <= startFrom + toCreate - 1; i++) {
        const prefix = BOT_PREFIXES[(i - 1) % BOT_PREFIXES.length];
        const suffix = BOT_SUFFIXES[Math.floor((i - 1) / BOT_PREFIXES.length) % BOT_SUFFIXES.length];
        const username = `${prefix}${suffix}${String(i).padStart(3, '0')}`;
        const email = `bot_${i}@bot.islandsempire.com`;

        // Rastgele ordu gücü: 3 seviye (zayıf / orta / güçlü)
        const tier = Math.random();
        let archerCount, infantryCount, cavalryCount;
        if (tier < 0.4) {
          // Zayıf bot: 50-200 güç
          archerCount   = Math.floor(Math.random() * 20 + 5);
          infantryCount = Math.floor(Math.random() * 20 + 5);
          cavalryCount  = Math.floor(Math.random() * 8 + 2);
        } else if (tier < 0.8) {
          // Orta bot: 200-500 güç
          archerCount   = Math.floor(Math.random() * 40 + 20);
          infantryCount = Math.floor(Math.random() * 40 + 20);
          cavalryCount  = Math.floor(Math.random() * 20 + 8);
        } else {
          // Güçlü bot: 500-900 güç
          archerCount   = Math.floor(Math.random() * 60 + 50);
          infantryCount = Math.floor(Math.random() * 60 + 50);
          cavalryCount  = Math.floor(Math.random() * 40 + 20);
        }
        const totalPower = archerCount * 3 + infantryCount * 2 + cavalryCount * 5;

        try {
          const userRes = await query(
            `INSERT INTO users (username, email, password_hash, is_bot, is_active, level)
             VALUES ($1, $2, $3, TRUE, TRUE, $4)
             ON CONFLICT (username) DO NOTHING
             RETURNING id`,
            [username, email, passwordHash, Math.floor(Math.random() * 10 + 1)]
          );

          if (userRes.rows.length === 0) continue; // Conflict, atla
          const botId = userRes.rows[0].id;

          // Ordu oluştur
          await query(
            `INSERT INTO armies (user_id, archer_count, infantry_count, cavalry_count, total_power)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) DO NOTHING`,
            [botId, archerCount, infantryCount, cavalryCount, totalPower]
          );

          // Kaynaklar oluştur
          const gold  = Math.floor(Math.random() * 4500 + 500);
          const wood  = Math.floor(Math.random() * 2500 + 500);
          const food  = Math.floor(Math.random() * 1500 + 300);
          for (const [type, amount, cap] of [
            ['gold', gold, 10000], ['wood', wood, 5000],
            ['food', food, 3000],  ['energy', 100, 200],
          ]) {
            await query(
              `INSERT INTO resources (user_id, resource_type, amount, capacity)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT DO NOTHING`,
              [botId, type, amount, cap]
            );
          }
          created++;
        } catch (innerErr) {
          // Tekil bot hatasını atla, devam et
        }
      }

      res.json({
        success: true,
        message: `${created} bot oluşturuldu.`,
        data: { created }
      });
    } catch (error) {
      console.error('Admin createBots error:', error);
      res.status(500).json({ success: false, message: 'Botlar oluşturulamadı', error: error.message });
    }
  }

  // Bot saldırısı tetikle
  static async triggerBotAttack(req, res) {
    try {
      const count = Math.min(parseInt(req.body.count) || 1, 50);

      // Kalkanı olmayan rastgele botlar seç
      const botsRes = await query(`
        SELECT u.id, a.total_power, a.archer_count, a.infantry_count, a.cavalry_count
        FROM users u
        JOIN armies a ON a.user_id = u.id
        WHERE u.is_bot = TRUE
          AND a.total_power > 0
          AND (u.shield_until IS NULL OR u.shield_until < NOW())
        ORDER BY RANDOM()
        LIMIT $1
      `, [count]);

      if (botsRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Uygun bot bulunamadı (hepsinin kalkanı aktif olabilir).' });
      }

      const results = [];

      for (const bot of botsRes.rows) {
        // Kalkanı olmayan, admin olmayan, botun yenebileceği gerçek oyuncuyu seç
        const maxTargetPower = Math.floor(bot.total_power * 1.5) + 10;
        const targetRes = await query(`
          SELECT u.id, u.username, a.total_power,
                 r.amount AS gold_amount
          FROM users u
          JOIN armies a ON a.user_id = u.id
          LEFT JOIN resources r ON r.user_id = u.id AND r.resource_type = 'gold'
          WHERE (u.is_bot = FALSE OR u.is_bot IS NULL)
            AND u.is_active = TRUE
            AND u.is_admin = FALSE
            AND u.id != $1
            AND (u.shield_until IS NULL OR u.shield_until < NOW())
            AND COALESCE(a.total_power, 0) <= $2
          ORDER BY RANDOM()
          LIMIT 1
        `, [bot.id, maxTargetPower]);

        if (targetRes.rows.length === 0) continue;
        const target = targetRes.rows[0];

        // ── Savaş hesabı (attackPlayer ile aynı mantık) ──
        const defenderArmyRes = await query('SELECT * FROM armies WHERE user_id = $1', [target.id]);
        const defenderArmy = defenderArmyRes.rows[0] || { total_power: 0, archer_count: 0, infantry_count: 0, cavalry_count: 0 };

        const defenderBonus = Math.floor(defenderArmy.total_power * 0.2);
        const attackerPowerRoll = bot.total_power + Math.random() * 30 - 15;
        const defenderPowerRoll = (defenderArmy.total_power + defenderBonus) + Math.random() * 30 - 15;
        const winner = attackerPowerRoll >= defenderPowerRoll ? 'attacker' : 'defender';

        let rewardGold = 0, rewardWood = 0, rewardFood = 0;

        if (winner === 'attacker') {
          // Yağma
          const lootRate = 0.1 + Math.random() * 0.1;
          const defResourcesRes = await query(
            `SELECT resource_type, amount FROM resources WHERE user_id = $1 AND resource_type IN ('gold','wood','food')`,
            [target.id]
          );
          const defResources = {};
          defResourcesRes.rows.forEach(r => { defResources[r.resource_type] = r.amount; });

          rewardGold = Math.floor((defResources.gold || 0) * lootRate);
          rewardWood = Math.floor((defResources.wood || 0) * lootRate);
          rewardFood = Math.floor((defResources.food || 0) * lootRate);

          // Kaynakları transfer et (bot kazanır — botun kaynakları artar, hedefin azalır)
          for (const [type, amount] of [['gold', rewardGold], ['wood', rewardWood], ['food', rewardFood]]) {
            if (amount > 0) {
              await query(`UPDATE resources SET amount = GREATEST(0, amount - $1) WHERE user_id = $2 AND resource_type = $3`, [amount, target.id, type]);
              await query(`UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = $3`, [amount, bot.id, type]);
            }
          }

          // Savunana 3 saatlik kalkan ver
          const shieldUntil = new Date(Date.now() + 3 * 60 * 60 * 1000);
          await query(`UPDATE users SET shield_until = $1 WHERE id = $2`, [shieldUntil, target.id]);

          // Savunma kayıpları
          const defLossRate = 0.2 + Math.random() * 0.2;
          await query(`
            UPDATE armies SET
              archer_count   = GREATEST(0, archer_count   - $1),
              infantry_count = GREATEST(0, infantry_count - $2),
              cavalry_count  = GREATEST(0, cavalry_count  - $3),
              total_power    = GREATEST(0, total_power    - $4)
            WHERE user_id = $5
          `, [
            Math.floor(defenderArmy.archer_count * defLossRate),
            Math.floor(defenderArmy.infantry_count * defLossRate),
            Math.floor(defenderArmy.cavalry_count * defLossRate),
            Math.floor(defenderArmy.total_power * defLossRate),
            target.id
          ]);

          // Bot kayıpları (küçük)
          const botLossRate = 0.05 + Math.random() * 0.1;
          await query(`
            UPDATE armies SET
              archer_count   = GREATEST(0, archer_count   - $1),
              infantry_count = GREATEST(0, infantry_count - $2),
              cavalry_count  = GREATEST(0, cavalry_count  - $3),
              total_power    = GREATEST(0, total_power    - $4)
            WHERE user_id = $5
          `, [
            Math.floor(bot.archer_count * botLossRate),
            Math.floor(bot.infantry_count * botLossRate),
            Math.floor(bot.cavalry_count * botLossRate),
            Math.floor(bot.total_power * botLossRate),
            bot.id
          ]);
        } else {
          // Saldıran bot kaybetti — daha fazla kayıp
          const botLossRate = 0.25 + Math.random() * 0.2;
          await query(`
            UPDATE armies SET
              archer_count   = GREATEST(0, archer_count   - $1),
              infantry_count = GREATEST(0, infantry_count - $2),
              cavalry_count  = GREATEST(0, cavalry_count  - $3),
              total_power    = GREATEST(0, total_power    - $4)
            WHERE user_id = $5
          `, [
            Math.floor(bot.archer_count * botLossRate),
            Math.floor(bot.infantry_count * botLossRate),
            Math.floor(bot.cavalry_count * botLossRate),
            Math.floor(bot.total_power * botLossRate),
            bot.id
          ]);
        }

        // Savaşı kaydet (defender raporlarında görünsün)
        const battleRes = await query(`
          INSERT INTO battles (attacker_id, defender_id, battle_type, attacker_power, defender_power, winner, reward_gold, reward_wood, reward_food)
          VALUES ($1, $2, 'pvp', $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [bot.id, target.id, Math.round(attackerPowerRoll), Math.round(defenderPowerRoll), winner, rewardGold, rewardWood, rewardFood]);

        results.push({
          battle_id: battleRes.rows[0].id,
          bot_id: bot.id,
          target_id: target.id,
          target_username: target.username,
          winner,
          reward_gold: rewardGold,
        });
      }

      res.json({
        success: true,
        message: `${results.length} bot saldırısı gerçekleştirildi.`,
        data: { results }
      });
    } catch (error) {
      console.error('Admin triggerBotAttack error:', error);
      res.status(500).json({ success: false, message: 'Bot saldırısı başlatılamadı', error: error.message });
    }
  }
  // Tüm bot ordularına toplu güç ekle
  static async boostBotArmies(req, res) {
    try {
      const a = Math.max(0, parseInt(req.body.archerAdd)   || 0);
      const i = Math.max(0, parseInt(req.body.infantryAdd) || 0);
      const c = Math.max(0, parseInt(req.body.cavalryAdd)  || 0);
      const powerAdd = a * 3 + i * 2 + c * 5;

      if (powerAdd === 0) {
        return res.status(400).json({ success: false, message: 'En az 1 asker eklenmelidir.' });
      }

      await query(`
        UPDATE armies SET
          archer_count   = archer_count   + $1,
          infantry_count = infantry_count + $2,
          cavalry_count  = cavalry_count  + $3,
          total_power    = total_power    + $4
        WHERE user_id IN (SELECT id FROM users WHERE is_bot = TRUE)
      `, [a, i, c, powerAdd]);

      const countRes = await query('SELECT COUNT(*) as cnt FROM users WHERE is_bot = TRUE');
      res.json({
        success: true,
        message: `${countRes.rows[0].cnt} bota güç eklendi (+${powerAdd} güç/bot).`,
      });
    } catch (error) {
      console.error('Admin boostBotArmies error:', error);
      res.status(500).json({ success: false, message: 'Güç eklenemedi', error: error.message });
    }
  }

  // Belirli bir kullanıcıya bot saldırısı
  static async attackSpecificUser(req, res) {
    try {
      const { targetUserId, botCount = 1 } = req.body;
      const count = Math.min(parseInt(botCount) || 1, 10);

      const userRes = await query(
        'SELECT id, username, is_active FROM users WHERE id = $1',
        [targetUserId]
      );
      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
      }
      const target = userRes.rows[0];
      if (!target.is_active) {
        return res.status(400).json({ success: false, message: 'Kullanıcı aktif değil.' });
      }

      const botsRes = await query(`
        SELECT u.id, a.total_power, a.archer_count, a.infantry_count, a.cavalry_count
        FROM users u
        JOIN armies a ON a.user_id = u.id
        WHERE u.is_bot = TRUE AND a.total_power > 0
        ORDER BY RANDOM()
        LIMIT $1
      `, [count]);

      if (botsRes.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Uygun bot bulunamadı.' });
      }

      const defArmyRes = await query('SELECT * FROM armies WHERE user_id = $1', [targetUserId]);
      const defArmy = defArmyRes.rows[0] || { total_power: 0, archer_count: 0, infantry_count: 0, cavalry_count: 0 };

      const results = [];

      for (const bot of botsRes.rows) {
        const defBonus = Math.floor(defArmy.total_power * 0.2);
        const atkRoll = bot.total_power + Math.random() * 30 - 15;
        const defRoll = (defArmy.total_power + defBonus) + Math.random() * 30 - 15;
        const winner = atkRoll >= defRoll ? 'attacker' : 'defender';

        let rewardGold = 0, rewardWood = 0, rewardFood = 0;

        if (winner === 'attacker') {
          const lootRate = 0.1 + Math.random() * 0.1;
          const resRes = await query(
            `SELECT resource_type, amount FROM resources WHERE user_id = $1 AND resource_type IN ('gold','wood','food')`,
            [targetUserId]
          );
          const res2 = {};
          resRes.rows.forEach(r => { res2[r.resource_type] = r.amount; });
          rewardGold = Math.floor((res2.gold || 0) * lootRate);
          rewardWood = Math.floor((res2.wood || 0) * lootRate);
          rewardFood = Math.floor((res2.food || 0) * lootRate);

          for (const [type, amount] of [['gold', rewardGold], ['wood', rewardWood], ['food', rewardFood]]) {
            if (amount > 0) {
              await query(`UPDATE resources SET amount = GREATEST(0, amount - $1) WHERE user_id = $2 AND resource_type = $3`, [amount, targetUserId, type]);
            }
          }

          const shieldUntil = new Date(Date.now() + 3 * 60 * 60 * 1000);
          await query(`UPDATE users SET shield_until = $1 WHERE id = $2`, [shieldUntil, targetUserId]);

          const defLoss = 0.2 + Math.random() * 0.2;
          await query(`
            UPDATE armies SET
              archer_count   = GREATEST(0, archer_count   - $1),
              infantry_count = GREATEST(0, infantry_count - $2),
              cavalry_count  = GREATEST(0, cavalry_count  - $3),
              total_power    = GREATEST(0, total_power    - $4)
            WHERE user_id = $5
          `, [
            Math.floor(defArmy.archer_count * defLoss),
            Math.floor(defArmy.infantry_count * defLoss),
            Math.floor(defArmy.cavalry_count * defLoss),
            Math.floor(defArmy.total_power * defLoss),
            targetUserId,
          ]);
        }

        const battleRes = await query(`
          INSERT INTO battles (attacker_id, defender_id, battle_type, attacker_power, defender_power, winner, reward_gold, reward_wood, reward_food)
          VALUES ($1, $2, 'pvp', $3, $4, $5, $6, $7, $8) RETURNING id
        `, [bot.id, targetUserId, Math.round(atkRoll), Math.round(defRoll), winner, rewardGold, rewardWood, rewardFood]);

        results.push({ battle_id: battleRes.rows[0].id, bot_id: bot.id, winner, reward_gold: rewardGold });
      }

      res.json({
        success: true,
        message: `${results.length} bot "${target.username}"a saldırdı.`,
        data: { target_username: target.username, results },
      });
    } catch (error) {
      console.error('Admin attackSpecificUser error:', error);
      res.status(500).json({ success: false, message: 'Saldırı başlatılamadı', error: error.message });
    }
  }

  // ── ÖDÜL TALEPLERİ ────────────────────────────────────────────────────────

  // GET /api/admin/prize-requests
  static async getPrizeRequests(req, res) {
    try {
      const result = await query(
        `SELECT pr.id, pr.prize_name, pr.tlcoin_cost, pr.status, pr.admin_note,
                pr.created_at, pr.updated_at,
                u.username, u.email
         FROM prize_requests pr
         JOIN users u ON u.id = pr.user_id
         ORDER BY
           CASE pr.status WHEN 'pending' THEN 0 ELSE 1 END,
           pr.created_at DESC`
      );
      res.json({ success: true, data: { requests: result.rows } });
    } catch (error) {
      console.error('Admin getPrizeRequests error:', error);
      res.status(500).json({ success: false, message: 'Talepler alinamadi', error: error.message });
    }
  }

  // PUT /api/admin/prize-requests/:id
  // Body: { status: 'approved'|'rejected', adminNote?: string }
  static async updatePrizeRequest(req, res) {
    try {
      const { id } = req.params;
      const { status, adminNote } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Gecersiz durum' });
      }

      // Reddedilirse TLCoin iade et
      if (status === 'rejected') {
        const reqRow = await query(
          'SELECT user_id, tlcoin_cost FROM prize_requests WHERE id = $1',
          [id]
        );
        if (reqRow.rows[0]) {
          await query(
            'UPDATE users SET tlcoin_balance = tlcoin_balance + $1 WHERE id = $2',
            [reqRow.rows[0].tlcoin_cost, reqRow.rows[0].user_id]
          );
        }
      }

      await query(
        `UPDATE prize_requests SET status = $1, admin_note = $2, updated_at = NOW() WHERE id = $3`,
        [status, adminNote || null, id]
      );

      res.json({ success: true, data: { message: 'Talep guncellendi' } });
    } catch (error) {
      console.error('Admin updatePrizeRequest error:', error);
      res.status(500).json({ success: false, message: 'Guncelleme basarisiz', error: error.message });
    }
  }

  // ── Instagram Boost İstekleri ─────────────────────────────────────────────

  // GET /api/admin/instagram-requests
  static async getInstagramRequests(req, res) {
    try {
      const result = await query(`
        SELECT id, username, instagram_username, instagram_boost_active,
               instagram_request_status, instagram_verified_at, created_at
        FROM users
        WHERE instagram_username IS NOT NULL
        ORDER BY
          CASE instagram_request_status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
          created_at DESC
      `);
      res.json({ success: true, data: { requests: result.rows } });
    } catch (error) {
      console.error('Admin getInstagramRequests error:', error);
      res.status(500).json({ success: false, message: 'İstekler getirilemedi', error: error.message });
    }
  }

  // PUT /api/admin/instagram-requests/:userId
  static async reviewInstagramRequest(req, res) {
    try {
      const { userId } = req.params;
      const { action } = req.body; // 'approve' | 'reject'

      if (action === 'approve') {
        await query(
          `UPDATE users
           SET instagram_boost_active = TRUE,
               instagram_request_status = 'approved',
               instagram_verified_at = NOW()
           WHERE id = $1`,
          [userId]
        );
        res.json({ success: true, message: 'Boost onaylandı ve aktif edildi.' });
      } else if (action === 'reject') {
        await query(
          `UPDATE users
           SET instagram_boost_active = FALSE,
               instagram_request_status = 'rejected',
               instagram_username = NULL,
               instagram_verified_at = NULL
           WHERE id = $1`,
          [userId]
        );
        res.json({ success: true, message: 'İstek reddedildi.' });
      } else {
        res.status(400).json({ success: false, message: 'Geçersiz action (approve | reject)' });
      }
    } catch (error) {
      console.error('Admin reviewInstagramRequest error:', error);
      res.status(500).json({ success: false, message: 'İşlem başarısız', error: error.message });
    }
  }

  // PUT /api/admin/instagram-requests/:userId/revoke  — aktif bostu iptal et
  static async revokeInstagramBoost(req, res) {
    try {
      const { userId } = req.params;
      await query(
        `UPDATE users
         SET instagram_boost_active = FALSE,
             instagram_request_status = NULL,
             instagram_username = NULL,
             instagram_verified_at = NULL
         WHERE id = $1`,
        [userId]
      );
      res.json({ success: true, message: 'Boost iptal edildi.' });
    } catch (error) {
      console.error('Admin revokeInstagramBoost error:', error);
      res.status(500).json({ success: false, message: 'İptal başarısız', error: error.message });
    }
  }
}

module.exports = AdminController;
