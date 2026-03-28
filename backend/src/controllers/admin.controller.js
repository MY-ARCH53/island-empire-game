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
          (SELECT json_object_agg(resource_type, amount) FROM resources WHERE user_id = u.id) as resources,
          COALESCE(a.total_power, 0)    AS army_power,
          COALESCE(a.archer_count, 0)   AS archer_count,
          COALESCE(a.infantry_count, 0) AS infantry_count,
          COALESCE(a.cavalry_count, 0)  AS cavalry_count,
          COALESCE(u.tlcoin_balance, 0) AS tlcoin_balance
        FROM users u
        LEFT JOIN armies a ON a.user_id = u.id
        WHERE (u.is_bot = FALSE OR u.is_bot IS NULL) AND u.is_active = TRUE
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

  // POST /api/admin/seeds/boost-armies — seed oyunculara toplu ordu güç ekle
  static async boostSeedArmies(req, res) {
    try {
      const { archerAdd = 0, infantryAdd = 0, cavalryAdd = 0 } = req.body;
      const powerAdd = archerAdd * 3 + infantryAdd * 2 + cavalryAdd * 5;

      if (powerAdd === 0) {
        return res.status(400).json({ success: false, message: 'En az bir asker türü için değer girin.' });
      }

      // Seed kullanıcılar: @islandsempire.com e-postalı, bot olmayan, admin olmayan
      // Ordusu olmayanlar için önce INSERT, sonra UPDATE
      const seedsRes = await query(
        `SELECT id FROM users WHERE email LIKE '%@islandsempire.com' AND (is_bot = FALSE OR is_bot IS NULL) AND is_admin = FALSE`
      );
      const seedIds = seedsRes.rows.map(r => r.id);

      if (seedIds.length === 0) {
        return res.status(404).json({ success: false, message: 'Seed oyuncu bulunamadı.' });
      }

      // Ordusu olmayanlara önce INSERT
      await query(`
        INSERT INTO armies (user_id, archer_count, infantry_count, cavalry_count, total_power)
        SELECT id, 0, 0, 0, 0 FROM users
        WHERE email LIKE '%@islandsempire.com'
          AND (is_bot = FALSE OR is_bot IS NULL)
          AND is_admin = FALSE
          AND id NOT IN (SELECT user_id FROM armies)
      `);

      // Hepsine ekle
      const result = await query(`
        UPDATE armies SET
          archer_count   = archer_count   + $1,
          infantry_count = infantry_count + $2,
          cavalry_count  = cavalry_count  + $3,
          total_power    = total_power    + $4
        WHERE user_id IN (
          SELECT id FROM users
          WHERE email LIKE '%@islandsempire.com'
            AND (is_bot = FALSE OR is_bot IS NULL)
            AND is_admin = FALSE
        )
      `, [archerAdd, infantryAdd, cavalryAdd, powerAdd]);

      res.json({
        success: true,
        message: `${result.rowCount} seed oyuncusunun ordusu güçlendirildi (+${powerAdd} güç/oyuncu).`,
        data: { updated: result.rowCount, powerAdd },
      });
    } catch (error) {
      console.error('Admin boostSeedArmies error:', error);
      res.status(500).json({ success: false, message: 'Hata oluştu', error: error.message });
    }
  }

  // Seed oyunculara toplu kaynak ekle
  static async boostSeedResources(req, res) {
    try {
      const { goldAdd = 0, woodAdd = 0, foodAdd = 0 } = req.body;

      if (!goldAdd && !woodAdd && !foodAdd) {
        return res.status(400).json({ success: false, message: 'En az bir kaynak türü için değer girin.' });
      }

      const seedsRes = await query(
        `SELECT id FROM users WHERE email LIKE '%@islandsempire.com' AND (is_bot = FALSE OR is_bot IS NULL) AND is_admin = FALSE`
      );
      const seedIds = seedsRes.rows.map(r => r.id);

      if (seedIds.length === 0) {
        return res.status(404).json({ success: false, message: 'Seed oyuncu bulunamadı.' });
      }

      for (const [type, amount] of [['gold', goldAdd], ['wood', woodAdd], ['food', foodAdd]]) {
        if (!amount) continue;
        // Kapasiteyi de güncelle (admin sınır gözetmez)
        await query(`
          UPDATE resources SET amount = amount + $1, capacity = GREATEST(capacity, amount + $1)
          WHERE user_id = ANY($2) AND resource_type = $3
        `, [amount, seedIds, type]);
      }

      res.json({
        success: true,
        message: `${seedIds.length} seed oyuncusuna kaynak eklendi.`,
        data: { updated: seedIds.length, goldAdd, woodAdd, foodAdd },
      });
    } catch (error) {
      console.error('Admin boostSeedResources error:', error);
      res.status(500).json({ success: false, message: 'Hata oluştu', error: error.message });
    }
  }

  // Seed oyunculara rastgele aralıkta kaynak ata (SET, not ADD)
  static async setSeedResources(req, res) {
    try {
      const { goldMin = 0, goldMax = 0, woodMin = 0, woodMax = 0, foodMin = 0, foodMax = 0 } = req.body;

      const seedsRes = await query(
        `SELECT id FROM users WHERE email LIKE '%@islandsempire.com' AND (is_bot = FALSE OR is_bot IS NULL) AND is_admin = FALSE`
      );
      const seedIds = seedsRes.rows.map(r => r.id);

      if (seedIds.length === 0) {
        return res.status(404).json({ success: false, message: 'Seed oyuncu bulunamadı.' });
      }

      let updated = 0;
      for (const userId of seedIds) {
        const gold = goldMin + Math.floor(Math.random() * (goldMax - goldMin + 1));
        const wood = woodMin + Math.floor(Math.random() * (woodMax - woodMin + 1));
        const food = foodMin + Math.floor(Math.random() * (foodMax - foodMin + 1));

        for (const [type, amount] of [['gold', gold], ['wood', wood], ['food', food]]) {
          await query(
            `UPDATE resources SET amount = $1, capacity = GREATEST(capacity, $1) WHERE user_id = $2 AND resource_type = $3`,
            [amount, userId, type]
          );
        }
        updated++;
      }

      res.json({
        success: true,
        message: `${updated} seed oyuncusunun kaynakları güncellendi.`,
        data: { updated, goldMin, goldMax, woodMin, woodMax, foodMin, foodMax },
      });
    } catch (error) {
      console.error('Admin setSeedResources error:', error);
      res.status(500).json({ success: false, message: 'Hata oluştu', error: error.message });
    }
  }

  // İki oyuncuyu zorla savaştır (limit/kalkan kontrolü yok)
  static async forceBattle(req, res) {
    try {
      const { attackerId, defenderId } = req.body;

      if (!attackerId || !defenderId) {
        return res.status(400).json({ success: false, message: 'attackerId ve defenderId gerekli.' });
      }
      if (parseInt(attackerId) === parseInt(defenderId)) {
        return res.status(400).json({ success: false, message: 'İki oyuncu aynı olamaz.' });
      }

      const [attackerRes, defenderRes, attackerArmyRes, defenderArmyRes] = await Promise.all([
        query('SELECT id, username FROM users WHERE id = $1', [attackerId]),
        query('SELECT id, username FROM users WHERE id = $1', [defenderId]),
        query('SELECT * FROM armies WHERE user_id = $1', [attackerId]),
        query('SELECT * FROM armies WHERE user_id = $1', [defenderId]),
      ]);

      if (!attackerRes.rows[0]) return res.status(404).json({ success: false, message: 'Saldıran oyuncu bulunamadı.' });
      if (!defenderRes.rows[0]) return res.status(404).json({ success: false, message: 'Savunan oyuncu bulunamadı.' });

      const attacker = attackerRes.rows[0];
      const defender = defenderRes.rows[0];
      const attackerArmy = attackerArmyRes.rows[0] || { total_power: 0 };
      const defenderArmy = defenderArmyRes.rows[0] || { total_power: 0 };

      const attackerPower = Math.max(1, attackerArmy.total_power) + Math.floor(Math.random() * 30) - 15;
      const defenderPower = Math.max(1, defenderArmy.total_power) + Math.floor(Math.random() * 30) - 15;
      const winner = attackerPower >= defenderPower ? 'attacker' : 'defender';
      const winnerId = winner === 'attacker' ? attacker.id : defender.id;
      const loserId  = winner === 'attacker' ? defender.id : attacker.id;

      // Kaybeden oyuncudan kaynak al
      const lootRate = 0.1 + Math.random() * 0.1;
      const [goldRes, woodRes, foodRes] = await Promise.all([
        query(`SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'gold'`, [loserId]),
        query(`SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'wood'`,  [loserId]),
        query(`SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'food'`,  [loserId]),
      ]);
      const rewardGold = Math.floor((goldRes.rows[0]?.amount || 0) * lootRate);
      const rewardWood = Math.floor((woodRes.rows[0]?.amount || 0) * lootRate);
      const rewardFood = Math.floor((foodRes.rows[0]?.amount || 0) * lootRate);
      const rewardXp   = Math.floor(Math.random() * 50) + 20;

      // Kaynakları transfer et
      if (rewardGold > 0 || rewardWood > 0 || rewardFood > 0) {
        await Promise.all([
          rewardGold && query(`UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'gold'`, [rewardGold, loserId]),
          rewardWood && query(`UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'wood'`,  [rewardWood, loserId]),
          rewardFood && query(`UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'food'`,  [rewardFood, loserId]),
          rewardGold && query(`UPDATE resources SET amount = LEAST(amount + $1, capacity) WHERE user_id = $2 AND resource_type = 'gold'`, [rewardGold, winnerId]),
          rewardWood && query(`UPDATE resources SET amount = LEAST(amount + $1, capacity) WHERE user_id = $2 AND resource_type = 'wood'`,  [rewardWood, winnerId]),
          rewardFood && query(`UPDATE resources SET amount = LEAST(amount + $1, capacity) WHERE user_id = $2 AND resource_type = 'food'`,  [rewardFood, winnerId]),
        ].filter(Boolean));
      }

      // XP ekle
      await query('UPDATE users SET experience = experience + $1 WHERE id = $2', [rewardXp, winnerId]);

      // Savaşı kaydet
      await query(`
        INSERT INTO battles (attacker_id, defender_id, battle_type, attacker_power, defender_power, winner, reward_gold, reward_wood, reward_food, reward_xp)
        VALUES ($1, $2, 'pvp', $3, $4, $5, $6, $7, $8, $9)
      `, [attacker.id, defender.id, attackerPower, defenderPower, winner, rewardGold, rewardWood, rewardFood, rewardXp]);

      res.json({
        success: true,
        message: `Savaş tamamlandı! Kazanan: ${winner === 'attacker' ? attacker.username : defender.username}`,
        data: {
          attacker: attacker.username, attackerPower,
          defender: defender.username, defenderPower,
          winner: winner === 'attacker' ? attacker.username : defender.username,
          rewardGold, rewardWood, rewardFood, rewardXp,
        },
      });
    } catch (error) {
      console.error('Admin forceBattle error:', error);
      res.status(500).json({ success: false, message: 'Savaş başlatılamadı', error: error.message });
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

  // ── OTOMATİK SALDIRI KURALLARI ────────────────────────────────────────────
  static async getAutoAttackRules(req, res) {
    const { getRules } = require('../services/autoAttackWorker');
    res.json({ success: true, data: { rules: getRules() } });
  }

  static async toggleAutoAttackRule(req, res) {
    const { toggleRule } = require('../services/autoAttackWorker');
    const { id } = req.body;
    const rule = toggleRule(id);
    if (!rule) return res.status(404).json({ success: false, message: 'Kural bulunamadı' });
    res.json({ success: true, data: { rule }, message: `${rule.label} ${rule.active ? 'aktif' : 'pasif'} edildi` });
  }

  static async setCustomThreshold(req, res) {
    const { setCustomThreshold, getRules } = require('../services/autoAttackWorker');
    const threshold = parseInt(req.body.threshold);
    if (!threshold || threshold < 1) return res.status(400).json({ success: false, message: 'Geçersiz eşik değeri' });
    setCustomThreshold(threshold);
    res.json({ success: true, data: { rules: getRules() }, message: `Özel eşik ${threshold.toLocaleString('tr-TR')} olarak güncellendi` });
  }

  // ── BAN YÖNETİMİ ──────────────────────────────────────────────────────────

  // Oyuncuyu banla
  static async banUser(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const result = await query(
        `UPDATE users
         SET is_active = FALSE, ban_reason = $1, banned_at = NOW()
         WHERE id = $2 AND (is_bot = FALSE OR is_bot IS NULL)
         RETURNING id, username`,
        [reason || null, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Oyuncu bulunamadi' });
      }

      res.json({ success: true, message: `${result.rows[0].username} banlandi` });
    } catch (error) {
      console.error('Admin banUser error:', error);
      res.status(500).json({ success: false, message: 'Ban islemi basarisiz', error: error.message });
    }
  }

  // Banı kaldır
  static async unbanUser(req, res) {
    try {
      const { id } = req.params;

      const result = await query(
        `UPDATE users
         SET is_active = TRUE, ban_reason = NULL, banned_at = NULL
         WHERE id = $1
         RETURNING id, username`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Oyuncu bulunamadi' });
      }

      res.json({ success: true, message: `${result.rows[0].username} bani kaldirildi` });
    } catch (error) {
      console.error('Admin unbanUser error:', error);
      res.status(500).json({ success: false, message: 'Ban kaldirma basarisiz', error: error.message });
    }
  }

  // Banlı oyuncuları getir
  static async getBannedUsers(req, res) {
    try {
      const sql = `
        SELECT
          u.id,
          u.username,
          u.email,
          u.level,
          u.experience,
          u.created_at,
          u.last_login,
          u.ban_reason,
          u.banned_at,
          COALESCE(a.total_power, 0)    AS army_power,
          COALESCE(a.archer_count, 0)   AS archer_count,
          COALESCE(a.infantry_count, 0) AS infantry_count,
          COALESCE(a.cavalry_count, 0)  AS cavalry_count,
          COALESCE((SELECT amount FROM resources WHERE user_id = u.id AND resource_type = 'gold' LIMIT 1), 0) AS gold,
          COALESCE((SELECT amount FROM resources WHERE user_id = u.id AND resource_type = 'food' LIMIT 1), 0) AS food,
          COALESCE((SELECT amount FROM resources WHERE user_id = u.id AND resource_type = 'wood' LIMIT 1), 0) AS wood,
          (SELECT COUNT(*) FROM battles WHERE attacker_id = u.id OR defender_id = u.id)::int AS total_battles,
          (SELECT COUNT(*) FROM battles
           WHERE (attacker_id = u.id AND winner = 'attacker')
              OR (defender_id = u.id AND winner = 'defender'))::int AS battle_wins
        FROM users u
        LEFT JOIN armies a ON a.user_id = u.id
        WHERE u.is_active = FALSE AND (u.is_bot = FALSE OR u.is_bot IS NULL)
        ORDER BY u.banned_at DESC NULLS LAST
      `;
      const result = await query(sql);
      res.json({ success: true, data: { users: result.rows } });
    } catch (error) {
      console.error('Admin getBannedUsers error:', error);
      res.status(500).json({ success: false, message: 'Banli oyuncular getirilemedi', error: error.message });
    }
  }

  // ── ADMIN2: Detaylı oyuncu listesi ────────────────────────────────────────
  static async getDetailedPlayers(req, res) {
    try {
      const sql = `
        SELECT
          u.id,
          u.username,
          u.email,
          u.level,
          u.experience,
          u.created_at,
          u.last_login,
          u.last_seen,
          u.is_active,
          COALESCE(a.total_power, 0)    AS army_power,
          COALESCE(a.archer_count, 0)   AS archer_count,
          COALESCE(a.infantry_count, 0) AS infantry_count,
          COALESCE(a.cavalry_count, 0)  AS cavalry_count,
          COALESCE(r_gold.amount, 0)    AS gold,
          COALESCE(r_food.amount, 0)    AS food,
          COALESCE(r_wood.amount, 0)    AS wood,
          COALESCE(bt.total_battles, 0) AS total_battles,
          COALESCE(bw.wins, 0)          AS battle_wins,
          COALESCE(ic.island_count, 0)  AS island_count
        FROM users u
        LEFT JOIN armies a ON a.user_id = u.id
        LEFT JOIN resources r_gold ON r_gold.user_id = u.id AND r_gold.resource_type = 'gold'
        LEFT JOIN resources r_food ON r_food.user_id = u.id AND r_food.resource_type = 'food'
        LEFT JOIN resources r_wood ON r_wood.user_id = u.id AND r_wood.resource_type = 'wood'
        LEFT JOIN (
          SELECT user_id, SUM(cnt) AS total_battles FROM (
            SELECT attacker_id AS user_id, COUNT(*) AS cnt FROM battles GROUP BY attacker_id
            UNION ALL
            SELECT defender_id AS user_id, COUNT(*) AS cnt FROM battles WHERE defender_id IS NOT NULL GROUP BY defender_id
          ) t GROUP BY user_id
        ) bt ON bt.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) AS wins FROM (
            SELECT attacker_id AS user_id FROM battles WHERE winner = 'attacker'
            UNION ALL
            SELECT defender_id AS user_id FROM battles WHERE winner = 'defender' AND defender_id IS NOT NULL
          ) w GROUP BY user_id
        ) bw ON bw.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) AS island_count FROM islands GROUP BY user_id
        ) ic ON ic.user_id = u.id
        WHERE (u.is_bot = FALSE OR u.is_bot IS NULL)
        ORDER BY u.created_at DESC
      `;
      const result = await query(sql);
      res.json({ success: true, data: { players: result.rows } });
    } catch (error) {
      console.error('Admin2 getDetailedPlayers error:', error);
      res.status(500).json({ success: false, message: 'Oyuncular getirilemedi', error: error.message });
    }
  }

  // ── ADMIN2: Tek oyuncu detayı + savaşları ─────────────────────────────────
  static async getPlayerDetail(req, res) {
    try {
      const { id } = req.params;

      const [playerRes, battlesRes] = await Promise.all([
        query(`
          SELECT
            u.id, u.username, u.email, u.level, u.experience,
            u.created_at, u.last_login, u.is_active,
            COALESCE(a.total_power, 0)    AS army_power,
            COALESCE(a.archer_count, 0)   AS archer_count,
            COALESCE(a.infantry_count, 0) AS infantry_count,
            COALESCE(a.cavalry_count, 0)  AS cavalry_count,
            COALESCE((SELECT amount FROM resources WHERE user_id = u.id AND resource_type = 'gold' LIMIT 1), 0) AS gold,
            COALESCE((SELECT amount FROM resources WHERE user_id = u.id AND resource_type = 'food' LIMIT 1), 0) AS food,
            COALESCE((SELECT amount FROM resources WHERE user_id = u.id AND resource_type = 'wood' LIMIT 1), 0) AS wood
          FROM users u
          LEFT JOIN armies a ON a.user_id = u.id
          WHERE u.id = $1
        `, [id]),
        query(`
          SELECT
            b.*,
            a.username AS attacker_name,
            d.username AS defender_name,
            CASE WHEN b.winner = 'attacker' THEN a.username
                 WHEN b.winner = 'defender' THEN d.username
                 ELSE NULL END AS winner_name,
            CASE WHEN b.winner = 'attacker' THEN b.attacker_id
                 WHEN b.winner = 'defender' THEN b.defender_id
                 ELSE NULL END AS winner_id
          FROM battles b
          JOIN users a ON a.id = b.attacker_id
          LEFT JOIN users d ON d.id = b.defender_id
          WHERE b.attacker_id = $1 OR b.defender_id = $1
          ORDER BY b.created_at DESC
        `, [id]),
      ]);

      if (playerRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Oyuncu bulunamadi' });
      }

      res.json({
        success: true,
        data: {
          player: playerRes.rows[0],
          battles: battlesRes.rows,
        },
      });
    } catch (error) {
      console.error('Admin2 getPlayerDetail error:', error);
      res.status(500).json({ success: false, message: 'Oyuncu detayi getirilemedi', error: error.message });
    }
  }

  // ── ADMIN2: Tüm savaşlar ──────────────────────────────────────────────────
  static async getAllBattles(req, res) {
    try {
      const limit  = Math.min(parseInt(req.query.limit)  || 200, 500);
      const offset = parseInt(req.query.offset) || 0;

      const [battlesRes, countRes] = await Promise.all([
        query(`
          SELECT
            b.id,
            b.battle_type,
            b.attacker_power,
            b.defender_power,
            b.reward_gold,
            b.reward_wood,
            b.reward_food,
            b.reward_xp,
            b.created_at,
            a.username  AS attacker_name,
            a.id        AS attacker_id,
            d.username  AS defender_name,
            d.id        AS defender_id,
            CASE WHEN b.winner = 'attacker' THEN a.username
                 WHEN b.winner = 'defender' THEN d.username
                 ELSE NULL END AS winner_name,
            CASE WHEN b.winner = 'attacker' THEN b.attacker_id
                 WHEN b.winner = 'defender' THEN b.defender_id
                 ELSE NULL END AS winner_id
          FROM battles b
          JOIN users a ON a.id = b.attacker_id
          LEFT JOIN users d ON d.id = b.defender_id
          ORDER BY b.created_at DESC
          LIMIT $1 OFFSET $2
        `, [limit, offset]),
        query('SELECT COUNT(*) AS total FROM battles'),
      ]);

      res.json({
        success: true,
        data: {
          battles: battlesRes.rows,
          total: parseInt(countRes.rows[0].total),
          limit,
          offset,
        },
      });
    } catch (error) {
      console.error('Admin2 getAllBattles error:', error);
      res.status(500).json({ success: false, message: 'Savaslar getirilemedi', error: error.message });
    }
  }

  // ── ADMIN2: Aktivite metrikleri ───────────────────────────────────────────
  static async getActivityMetrics(req, res) {
    try {
      const [
        totalRes, todayRes, weekRes, neverRes,
        last30Res, onlineRes,
        topBattlersRes, topResourcesRes,
      ] = await Promise.all([
        query("SELECT COUNT(*) AS total FROM users WHERE (is_bot = FALSE OR is_bot IS NULL)"),
        query("SELECT COUNT(*) AS total FROM users WHERE last_login > NOW() - INTERVAL '24 hours' AND (is_bot = FALSE OR is_bot IS NULL)"),
        query("SELECT COUNT(*) AS total FROM users WHERE last_login > NOW() - INTERVAL '7 days'  AND (is_bot = FALSE OR is_bot IS NULL)"),
        query("SELECT COUNT(*) AS total FROM users WHERE last_login IS NULL AND (is_bot = FALSE OR is_bot IS NULL)"),
        query("SELECT COUNT(*) AS total FROM users WHERE created_at > NOW() - INTERVAL '30 days' AND (is_bot = FALSE OR is_bot IS NULL)"),
        query("SELECT COUNT(*) AS total FROM users WHERE (last_seen > NOW() - INTERVAL '5 minutes' OR last_login > NOW() - INTERVAL '5 minutes') AND (is_bot = FALSE OR is_bot IS NULL)"),
        query(`
          SELECT u.id, u.username, COUNT(b.id)::int AS battle_count,
                 SUM(CASE WHEN (b.attacker_id = u.id AND b.winner = 'attacker')
                               OR (b.defender_id = u.id AND b.winner = 'defender')
                          THEN 1 ELSE 0 END)::int AS wins
          FROM users u
          JOIN battles b ON b.attacker_id = u.id OR b.defender_id = u.id
          WHERE (u.is_bot = FALSE OR u.is_bot IS NULL)
          GROUP BY u.id, u.username
          ORDER BY battle_count DESC
          LIMIT 10
        `),
        query(`
          SELECT u.id, u.username, COALESCE(r.amount, 0) AS gold
          FROM users u
          LEFT JOIN resources r ON r.user_id = u.id AND r.resource_type = 'gold'
          WHERE (u.is_bot = FALSE OR u.is_bot IS NULL)
          ORDER BY r.amount DESC NULLS LAST
          LIMIT 10
        `),
      ]);

      res.json({
        success: true,
        data: {
          total_players:       parseInt(totalRes.rows[0].total),
          active_today:        parseInt(todayRes.rows[0].total),
          active_week:         parseInt(weekRes.rows[0].total),
          never_logged_in:     parseInt(neverRes.rows[0].total),
          registered_last_30d: parseInt(last30Res.rows[0].total),
          online_now:          parseInt(onlineRes.rows[0].total),
          top_battlers:        topBattlersRes.rows,
          top_by_gold:         topResourcesRes.rows,
        },
      });
    } catch (error) {
      console.error('Admin2 getActivityMetrics error:', error);
      res.status(500).json({ success: false, message: 'Metrikler getirilemedi', error: error.message });
    }
  }

  // Destek konuşmalarını getir (admin)
  static async getSupportConversations(req, res) {
    try {
      const sql = `
        SELECT DISTINCT ON (sm.user_id)
          sm.user_id, u.username,
          sm.message AS last_message,
          sm.created_at AS last_time,
          (SELECT COUNT(*) FROM support_messages WHERE user_id = sm.user_id AND is_admin_reply = FALSE AND is_read = FALSE) AS unread_count
        FROM support_messages sm
        JOIN users u ON u.id = sm.user_id
        ORDER BY sm.user_id, sm.created_at DESC
      `;
      const result = await query(sql);
      res.json({ success: true, data: { conversations: result.rows } });
    } catch (error) {
      console.error('getSupportConversations error:', error);
      res.status(500).json({ success: false, message: 'Getirilemedi', error: error.message });
    }
  }

  // Belirli kullanıcının destek mesajlarını getir (admin)
  static async getSupportThread(req, res) {
    try {
      const { userId } = req.params;
      const result = await query(
        `SELECT sm.*, u.username FROM support_messages sm
         JOIN users u ON u.id = sm.user_id
         WHERE sm.user_id = $1 ORDER BY sm.created_at ASC`,
        [userId]
      );
      // Okunmamış kullanıcı mesajlarını okundu yap
      await query(
        `UPDATE support_messages SET is_read = TRUE WHERE user_id = $1 AND is_admin_reply = FALSE AND is_read = FALSE`,
        [userId]
      );
      res.json({ success: true, data: { messages: result.rows } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Getirilemedi', error: error.message });
    }
  }

  // Admin cevap gönder
  static async replySupportMessage(req, res) {
    try {
      const { userId } = req.params;
      const { message } = req.body;
      if (!message || message.trim().length === 0)
        return res.status(400).json({ success: false, message: 'Mesaj boş olamaz' });

      const result = await query(
        `INSERT INTO support_messages (user_id, message, is_admin_reply) VALUES ($1, $2, TRUE) RETURNING *`,
        [userId, message.trim()]
      );
      res.json({ success: true, data: { message: result.rows[0] } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Cevap gönderilemedi', error: error.message });
    }
  }

  // Guild sohbet mesajlarını getir
  static async getGuildChats(req, res) {
    try {
      const { guildId, limit = 100 } = req.query;

      let sql, params;
      if (guildId) {
        sql = `
          SELECT gc.id, gc.message, gc.created_at,
                 u.username, u.id AS user_id,
                 g.name AS guild_name, g.id AS guild_id
          FROM guild_chat gc
          JOIN users u ON u.id = gc.user_id
          JOIN guilds g ON g.id = gc.guild_id
          WHERE gc.guild_id = $1
          ORDER BY gc.created_at DESC
          LIMIT $2
        `;
        params = [guildId, limit];
      } else {
        sql = `
          SELECT gc.id, gc.message, gc.created_at,
                 u.username, u.id AS user_id,
                 g.name AS guild_name, g.id AS guild_id
          FROM guild_chat gc
          JOIN users u ON u.id = gc.user_id
          JOIN guilds g ON g.id = gc.guild_id
          ORDER BY gc.created_at DESC
          LIMIT $1
        `;
        params = [limit];
      }

      const messagesRes = await query(sql, params);

      const guildsRes = await query(
        'SELECT id, name FROM guilds ORDER BY name ASC'
      );

      res.json({
        success: true,
        data: {
          messages: messagesRes.rows,
          guilds: guildsRes.rows,
        }
      });
    } catch (error) {
      console.error('Admin getGuildChats error:', error);
      res.status(500).json({ success: false, message: 'Sohbet mesajlari getirilemedi', error: error.message });
    }
  }

  // Guild mesajı sil
  static async deleteGuildMessage(req, res) {
    try {
      const { id } = req.params;
      await query('DELETE FROM guild_chat WHERE id = $1', [id]);
      res.json({ success: true, message: 'Mesaj silindi' });
    } catch (error) {
      console.error('Admin deleteGuildMessage error:', error);
      res.status(500).json({ success: false, message: 'Mesaj silinemedi', error: error.message });
    }
  }

  // ── TLCoin İşlem Geçmişi ──────────────────────────────────────────────────

  // GET /api/admin/tlcoin-transactions?userId=&type=&source=&page=1&limit=50
  static async getTLCoinTransactions(req, res) {
    try {
      const { userId, type, source, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const conditions = [];
      const values = [];
      let idx = 1;

      if (userId) { conditions.push(`t.user_id = $${idx++}`); values.push(userId); }
      if (type)   { conditions.push(`t.type = $${idx++}`);    values.push(type); }
      if (source) { conditions.push(`t.source = $${idx++}`);  values.push(source); }

      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

      const sql = `
        SELECT t.id, t.user_id, u.username, t.type, t.amount, t.source,
               t.meta, t.balance_after, t.created_at
        FROM tlcoin_transactions t
        JOIN users u ON u.id = t.user_id
        ${where}
        ORDER BY t.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `;
      values.push(parseInt(limit), offset);
      const result = await query(sql, values);

      const countSql = `SELECT COUNT(*) FROM tlcoin_transactions t ${where}`;
      const countResult = await query(countSql, values.slice(0, -2));

      // İstatistikler
      const statsSql = `
        SELECT
          COUNT(*) FILTER (WHERE type = 'earn')  AS earn_count,
          COUNT(*) FILTER (WHERE type = 'spend') AS spend_count,
          COUNT(*) FILTER (WHERE type = 'refund') AS refund_count,
          COALESCE(SUM(amount) FILTER (WHERE type = 'earn'),   0) AS total_earned,
          COALESCE(SUM(amount) FILTER (WHERE type = 'spend'),  0) AS total_spent,
          COALESCE(SUM(amount) FILTER (WHERE type = 'refund'), 0) AS total_refunded,
          COUNT(DISTINCT user_id) AS unique_users
        FROM tlcoin_transactions
      `;
      const stats = await query(statsSql);

      res.json({
        success: true,
        data: {
          transactions: result.rows,
          total: parseInt(countResult.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          stats: stats.rows[0],
        }
      });
    } catch (error) {
      console.error('Admin getTLCoinTransactions error:', error);
      res.status(500).json({ success: false, message: 'İşlemler alınamadı' });
    }
  }

  // GET /api/admin/tlcoin-stats — Kullanıcı bazlı özet
  static async getTLCoinUserStats(req, res) {
    try {
      const sql = `
        SELECT
          u.id, u.username, u.tlcoin_balance,
          COUNT(t.id) AS tx_count,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'earn'),  0) AS total_earned,
          COALESCE(SUM(t.amount) FILTER (WHERE t.type = 'spend'), 0) AS total_spent,
          MAX(t.created_at) AS last_tx_at
        FROM users u
        LEFT JOIN tlcoin_transactions t ON t.user_id = u.id
        WHERE u.is_bot = false AND (u.tlcoin_balance > 0 OR t.id IS NOT NULL)
        GROUP BY u.id, u.username, u.tlcoin_balance
        ORDER BY u.tlcoin_balance DESC
        LIMIT 100
      `;
      const result = await query(sql);
      res.json({ success: true, data: { users: result.rows } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Kullanıcı istatistikleri alınamadı' });
    }
  }
}

module.exports = AdminController;
