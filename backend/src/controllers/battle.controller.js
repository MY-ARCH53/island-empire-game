const { query } = require('../config/database');

class BattleController {
  // Ordu bilgisini getir veya oluştur
  static async getArmy(req, res) {
    try {
      const { userId } = req.query;

      // Kalkan süresi de dahil
      let armySql = `
        SELECT a.*, u.shield_until
        FROM armies a
        JOIN users u ON a.user_id = u.id
        WHERE a.user_id = $1
      `;
      let armyResult = await query(armySql, [userId]);

      if (armyResult.rows.length === 0) {
        const createSql = `
          INSERT INTO armies (user_id, archer_count, infantry_count, cavalry_count, total_power)
          VALUES ($1, 0, 0, 0, 0)
          RETURNING *
        `;
        armyResult = await query(createSql, [userId]);
        // Yeni kayıt için shield_until ekle
        const shieldRes = await query('SELECT shield_until FROM users WHERE id = $1', [userId]);
        armyResult.rows[0].shield_until = shieldRes.rows[0]?.shield_until ?? null;
      }

      res.json({
        success: true,
        data: { army: armyResult.rows[0] }
      });
    } catch (error) {
      console.error('Get army error:', error);
      res.status(500).json({
        success: false,
        message: 'Ordu bilgisi alinamadi'
      });
    }
  }

  // Asker yetiştir
  static async recruitSoldiers(req, res) {
    try {
      const { userId, type, count } = req.body;

      if (count <= 0 || count > 50) {
        return res.status(400).json({
          success: false,
          message: 'Miktar 1-50 arasinda olmalidir'
        });
      }

      const costs = {
        archer: { gold: 50, food: 20, power: 3 },
        infantry: { gold: 30, food: 15, power: 2 },
        cavalry: { gold: 100, food: 40, power: 5 }
      };

      const cost = costs[type];
      if (!cost) {
        return res.status(400).json({
          success: false,
          message: 'Gecersiz asker tipi'
        });
      }

      const totalGold = cost.gold * count;
      const totalFood = cost.food * count;
      const totalPower = cost.power * count;

      const goldCheckSql = `SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'gold'`;
      const goldCheck = await query(goldCheckSql, [userId]);

      const foodCheckSql = `SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'food'`;
      const foodCheck = await query(foodCheckSql, [userId]);

      if (!goldCheck.rows[0] || goldCheck.rows[0].amount < totalGold) {
        return res.status(400).json({
          success: false,
          message: 'Yetersiz altin'
        });
      }

      if (!foodCheck.rows[0] || foodCheck.rows[0].amount < totalFood) {
        return res.status(400).json({
          success: false,
          message: 'Yetersiz yiyecek'
        });
      }

      const deductGoldSql = `UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'gold'`;
      await query(deductGoldSql, [totalGold, userId]);

      const deductFoodSql = `UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'food'`;
      await query(deductFoodSql, [totalFood, userId]);

      const columnName = `${type}_count`;
      const updateArmySql = `UPDATE armies SET ${columnName} = ${columnName} + $1, total_power = total_power + $2 WHERE user_id = $3 RETURNING *`;
      const result = await query(updateArmySql, [count, totalPower, userId]);

      res.json({
        success: true,
        message: `${count} ${type} yetistirildi! ⚔️`,
        data: { army: result.rows[0] }
      });
    } catch (error) {
      console.error('Recruit soldiers error:', error);
      res.status(500).json({
        success: false,
        message: 'Asker yetistirilemedi'
      });
    }
  }

  // Tüm korsanları listele
  static async listPirates(req, res) {
    try {
      const { userId } = req.query;
      const sql = `SELECT * FROM pirates ORDER BY power ASC`;
      const result = await query(sql);

      let attacks_today = 0;
      if (userId) {
        const countRes = await query(
          `SELECT COUNT(*) FROM pirate_attacks WHERE attacker_id = $1 AND attack_date = CURRENT_DATE`,
          [userId]
        );
        attacks_today = parseInt(countRes.rows[0].count) || 0;
      }

      res.json({
        success: true,
        data: { pirates: result.rows, attacks_today }
      });
    } catch (error) {
      console.error('List pirates error:', error);
      res.status(500).json({
        success: false,
        message: 'Korsanlar listelenemedi'
      });
    }
  }

  // Korsana saldır
  static async attackPirate(req, res) {
    try {
      const { userId, pirateId } = req.body;

      // Günlük limit kontrolü
      const limitRes = await query(
        `SELECT COUNT(*) FROM pirate_attacks WHERE attacker_id = $1 AND attack_date = CURRENT_DATE`,
        [userId]
      );
      if (parseInt(limitRes.rows[0].count) >= 10) {
        return res.status(400).json({
          success: false,
          message: 'Günlük korsan saldırı limitine ulaştınız (10/10)'
        });
      }

      // Saldıran oyuncunun koruma kalkanı varsa iptal et
      await query(
        `UPDATE users SET shield_until = NULL WHERE id = $1 AND shield_until > NOW()`,
        [userId]
      );

      const armySql = `SELECT * FROM armies WHERE user_id = $1`;
      const armyResult = await query(armySql, [userId]);

      if (armyResult.rows.length === 0 || armyResult.rows[0].total_power === 0) {
        return res.status(400).json({
          success: false,
          message: 'Ordunuz yok! Once asker yetistirin'
        });
      }

      const army = armyResult.rows[0];

      const pirateSql = `SELECT * FROM pirates WHERE id = $1`;
      const pirateResult = await query(pirateSql, [pirateId]);

      if (pirateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Korsan bulunamadi'
        });
      }

      const pirate = pirateResult.rows[0];

      const attackerPower = army.total_power + Math.floor(Math.random() * 20) - 10;
      const defenderPower = pirate.power + Math.floor(Math.random() * 20) - 10;

      const winner = attackerPower >= defenderPower ? 'attacker' : 'defender';

      let rewardGold = 0;
      let rewardWood = 0;
      let rewardFood = 0;
      let rewardXp = 0;

      let archerLoss = 0;
      let infantryLoss = 0;
      let cavalryLoss = 0;

      if (winner === 'attacker') {
        rewardGold = pirate.reward_gold;
        rewardWood = pirate.reward_wood;
        rewardFood = pirate.reward_food;
        rewardXp = pirate.reward_xp;

        const lossRate = 0.1 + Math.random() * 0.1;
        archerLoss = Math.floor(army.archer_count * lossRate);
        infantryLoss = Math.floor(army.infantry_count * lossRate);
        cavalryLoss = Math.floor(army.cavalry_count * lossRate);

        const addGoldSql = `UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = 'gold'`;
        await query(addGoldSql, [rewardGold, userId]);

        if (rewardWood > 0) {
          const addWoodSql = `UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = 'wood'`;
          await query(addWoodSql, [rewardWood, userId]);
        }

        if (rewardFood > 0) {
          const addFoodSql = `UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = 'food'`;
          await query(addFoodSql, [rewardFood, userId]);
        }
      } else {
        const lossRate = 0.3 + Math.random() * 0.2;
        archerLoss = Math.floor(army.archer_count * lossRate);
        infantryLoss = Math.floor(army.infantry_count * lossRate);
        cavalryLoss = Math.floor(army.cavalry_count * lossRate);
      }

      const powerLoss = (archerLoss * 3) + (infantryLoss * 2) + (cavalryLoss * 5);

      const updateArmySql = `UPDATE armies SET archer_count = archer_count - $1, infantry_count = infantry_count - $2, cavalry_count = cavalry_count - $3, total_power = total_power - $4 WHERE user_id = $5`;
      await query(updateArmySql, [archerLoss, infantryLoss, cavalryLoss, powerLoss, userId]);

      const battleSql = `INSERT INTO battles (attacker_id, pirate_id, battle_type, attacker_power, defender_power, winner, reward_gold, reward_wood, reward_food, reward_xp) VALUES ($1, $2, 'pirate', $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
      const battleResult = await query(battleSql, [userId, pirateId, attackerPower, defenderPower, winner, rewardGold, rewardWood, rewardFood, rewardXp]);

      // Günlük saldırı sayacına kayıt ekle
      await query(`INSERT INTO pirate_attacks (attacker_id) VALUES ($1)`, [userId]);

      // Günlük saldırı görevini ilerlet
      try {
        const today = new Date().toISOString().split('T')[0];
        const taskRes = await query(
          "SELECT * FROM tasks WHERE user_id = $1 AND type = 'daily_attack' AND DATE(created_at) = $2 AND completed = false",
          [userId, today]
        );
        if (taskRes.rows.length > 0) {
          const t = taskRes.rows[0];
          const newProgress = t.progress + 1;
          const isCompleted = newProgress >= t.target;
          await query(
            'UPDATE tasks SET progress = $1, completed = $2, completed_at = $3 WHERE id = $4',
            [newProgress, isCompleted, isCompleted ? new Date() : null, t.id]
          );
        }
      } catch {}

      res.json({
        success: true,
        message: winner === 'attacker' ? 'Zafer! 🎉' : 'Maglup oldunuz! 💀',
        data: {
          battle: battleResult.rows[0],
          winner,
          losses: {
            archer: archerLoss,
            infantry: infantryLoss,
            cavalry: cavalryLoss
          },
          rewards: winner === 'attacker' ? {
            gold: rewardGold,
            wood: rewardWood,
            food: rewardFood,
            xp: rewardXp
          } : null
        }
      });
    } catch (error) {
      console.error('Attack pirate error:', error);
      res.status(500).json({
        success: false,
        message: 'Saldiri basarisiz'
      });
    }
  }

  // Savaş geçmişi
  static async getBattleHistory(req, res) {
    try {
      const { userId } = req.query;

      const sql = `
        SELECT 
          b.*,
          p.name as pirate_name,
          p.difficulty as pirate_difficulty,
          u.username as defender_name
        FROM battles b
        LEFT JOIN pirates p ON b.pirate_id = p.id
        LEFT JOIN users u ON b.defender_id = u.id
        WHERE b.attacker_id = $1
        ORDER BY b.created_at DESC
        LIMIT 20
      `;
      const result = await query(sql, [userId]);

      res.json({
        success: true,
        data: { battles: result.rows }
      });
    } catch (error) {
      console.error('Get battle history error:', error);
      res.status(500).json({
        success: false,
        message: 'Savas gecmisi alinamadi'
      });
    }
  }

  // PvP - Benzer güçteki oyuncuları listele
  static async listPvpTargets(req, res) {
    try {
      const { userId } = req.query;

      // Saldırganın gücünü al
      const myPowerRes = await query(
        'SELECT COALESCE(total_power, 0) as power FROM armies WHERE user_id = $1',
        [userId]
      );
      const myPower = myPowerRes.rows.length > 0 ? parseInt(myPowerRes.rows[0].power) : 0;

      // Günlük saldırı sayısı
      const attacksRes = await query(
        'SELECT COUNT(*) as count FROM pvp_attacks WHERE attacker_id = $1 AND attack_date = CURRENT_DATE',
        [userId]
      );
      const attacksToday = parseInt(attacksRes.rows[0].count);

      // Güç aralığı: benim gücümün %40 ile %250'si arası (minimum 100 aralık)
      const minPower = Math.max(0, Math.floor(myPower * 0.4) - 50);
      const maxPower = Math.max(Math.ceil(myPower * 2.5) + 50, 150);

      const sql = `
        SELECT
          u.id,
          u.username,
          u.level,
          u.league,
          u.shield_until,
          (SELECT COUNT(*) FROM islands WHERE user_id = u.id) as island_count,
          COALESCE(a.total_power, 0) as army_power,
          r.amount as gold_amount
        FROM users u
        LEFT JOIN armies a ON u.id = a.user_id
        LEFT JOIN resources r ON u.id = r.user_id AND r.resource_type = 'gold'
        WHERE u.id != $1
        AND u.is_active = true
        AND (u.is_bot = FALSE OR u.is_bot IS NULL)
        AND COALESCE(a.total_power, 0) BETWEEN $2 AND $3
        ORDER BY RANDOM()
        LIMIT 10
      `;
      const result = await query(sql, [userId, minPower, maxPower]);

      res.json({
        success: true,
        data: { players: result.rows, attacks_today: attacksToday, attacks_limit: 5 }
      });
    } catch (error) {
      console.error('List PvP targets error:', error);
      res.status(500).json({
        success: false,
        message: 'Oyuncular listelenemedi'
      });
    }
  }

  // Tüm savaş raporları (saldırı + savunma)
  static async getAllBattleReports(req, res) {
    try {
      const { userId } = req.query;

      const sql = `
        SELECT
          b.*,
          p.name as pirate_name,
          atk.username as attacker_name,
          def.username as defender_name,
          CASE WHEN b.attacker_id = $1 THEN 'attack' ELSE 'defense' END as role
        FROM battles b
        LEFT JOIN pirates p ON b.pirate_id = p.id
        LEFT JOIN users atk ON b.attacker_id = atk.id
        LEFT JOIN users def ON b.defender_id = def.id
        WHERE b.attacker_id = $1 OR b.defender_id = $1
        ORDER BY b.created_at DESC
        LIMIT 50
      `;
      const result = await query(sql, [userId]);

      res.json({ success: true, data: { battles: result.rows } });
    } catch (error) {
      console.error('Get battle reports error:', error);
      res.status(500).json({ success: false, message: 'Raporlar alinamadi', error: error.message });
    }
  }

  // Okunmamış saldırı bildirimi sayısı
  static async getUnreadAttacks(req, res) {
    try {
      const { userId } = req.query;

      const userRes = await query('SELECT last_seen_attacks_at FROM users WHERE id = $1', [userId]);
      const lastSeen = userRes.rows[0]?.last_seen_attacks_at;

      const result = await query(
        `SELECT COUNT(*) as count FROM battles
         WHERE defender_id = $1 AND created_at > COALESCE($2, '1970-01-01'::timestamp)`,
        [userId, lastSeen]
      );

      res.json({ success: true, data: { count: parseInt(result.rows[0].count) } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Hata', error: error.message });
    }
  }

  // Saldırıları görüldü olarak işaretle
  static async markAttacksSeen(req, res) {
    try {
      const { userId } = req.body;
      await query('UPDATE users SET last_seen_attacks_at = NOW() WHERE id = $1', [userId]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Hata', error: error.message });
    }
  }

  // PvP Saldırı
  static async attackPlayer(req, res) {
    try {
      const { attackerId, defenderId } = req.body;

      if (attackerId === defenderId) {
        return res.status(400).json({
          success: false,
          message: 'Kendinize saldiramazsiniz'
        });
      }

      const limitCheckSql = `SELECT COUNT(*) as attack_count FROM pvp_attacks WHERE attacker_id = $1 AND attack_date = CURRENT_DATE`;
      const limitCheck = await query(limitCheckSql, [attackerId]);

      if (parseInt(limitCheck.rows[0].attack_count) >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Gunluk saldiri limitine ulastiniz (5/5)'
        });
      }

      const defenderSql = `SELECT * FROM users WHERE id = $1`;
      const defenderResult = await query(defenderSql, [defenderId]);
      const defender = defenderResult.rows[0];

      if (defender.shield_until && new Date(defender.shield_until) > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Bu oyuncu koruma kalkani altinda'
        });
      }

      // Saldıran oyuncunun koruma kalkanı varsa iptal et
      await query(
        `UPDATE users SET shield_until = NULL WHERE id = $1 AND shield_until > NOW()`,
        [attackerId]
      );

      const attackerArmySql = `SELECT * FROM armies WHERE user_id = $1`;
      const attackerArmyResult = await query(attackerArmySql, [attackerId]);

      if (attackerArmyResult.rows.length === 0 || attackerArmyResult.rows[0].total_power === 0) {
        return res.status(400).json({
          success: false,
          message: 'Ordunuz yok! Once asker yetistirin'
        });
      }

      const attackerArmy = attackerArmyResult.rows[0];

      const defenderArmySql = `SELECT * FROM armies WHERE user_id = $1`;
      const defenderArmyResult = await query(defenderArmySql, [defenderId]);
      const defenderArmy = defenderArmyResult.rows.length > 0 ? defenderArmyResult.rows[0] : { total_power: 0, archer_count: 0, infantry_count: 0, cavalry_count: 0 };

      const attackerPower = attackerArmy.total_power + Math.floor(Math.random() * 30) - 15;
      const defenderPower = defenderArmy.total_power + Math.floor(Math.random() * 30) - 15;

      const winner = attackerPower >= defenderPower ? 'attacker' : 'defender';

      let rewardGold = 0;
      let rewardWood = 0;
      let rewardFood = 0;

      let attackerArcherLoss = 0;
      let attackerInfantryLoss = 0;
      let attackerCavalryLoss = 0;

      let defenderArcherLoss = 0;
      let defenderInfantryLoss = 0;
      let defenderCavalryLoss = 0;

      if (winner === 'attacker') {
        const goldSql = `SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'gold'`;
        const goldResult = await query(goldSql, [defenderId]);
        const defenderGold = goldResult.rows[0] ? goldResult.rows[0].amount : 0;

        const woodSql = `SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'wood'`;
        const woodResult = await query(woodSql, [defenderId]);
        const defenderWood = woodResult.rows[0] ? woodResult.rows[0].amount : 0;

        const foodSql = `SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'food'`;
        const foodResult = await query(foodSql, [defenderId]);
        const defenderFood = foodResult.rows[0] ? foodResult.rows[0].amount : 0;

        const lootRate = 0.1 + Math.random() * 0.1;
        rewardGold = Math.floor(defenderGold * lootRate);
        rewardWood = Math.floor(defenderWood * lootRate);
        rewardFood = Math.floor(defenderFood * lootRate);

        if (rewardGold > 0) {
          await query(`UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'gold'`, [rewardGold, defenderId]);
          await query(`UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = 'gold'`, [rewardGold, attackerId]);
        }
        if (rewardWood > 0) {
          await query(`UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'wood'`, [rewardWood, defenderId]);
          await query(`UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = 'wood'`, [rewardWood, attackerId]);
        }
        if (rewardFood > 0) {
          await query(`UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'food'`, [rewardFood, defenderId]);
          await query(`UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = 'food'`, [rewardFood, attackerId]);
        }

        const attackerLossRate = 0.05 + Math.random() * 0.1;
        attackerArcherLoss = Math.floor(attackerArmy.archer_count * attackerLossRate);
        attackerInfantryLoss = Math.floor(attackerArmy.infantry_count * attackerLossRate);
        attackerCavalryLoss = Math.floor(attackerArmy.cavalry_count * attackerLossRate);

        const defenderLossRate = 0.2 + Math.random() * 0.2;
        defenderArcherLoss = Math.floor(defenderArmy.archer_count * defenderLossRate);
        defenderInfantryLoss = Math.floor(defenderArmy.infantry_count * defenderLossRate);
        defenderCavalryLoss = Math.floor(defenderArmy.cavalry_count * defenderLossRate);

        const shieldUntil = new Date(Date.now() + 3 * 60 * 60 * 1000);
        await query(`UPDATE users SET shield_until = $1 WHERE id = $2`, [shieldUntil, defenderId]);
      } else {
        const attackerLossRate = 0.25 + Math.random() * 0.2;
        attackerArcherLoss = Math.floor(attackerArmy.archer_count * attackerLossRate);
        attackerInfantryLoss = Math.floor(attackerArmy.infantry_count * attackerLossRate);
        attackerCavalryLoss = Math.floor(attackerArmy.cavalry_count * attackerLossRate);

        const defenderLossRate = 0.1 + Math.random() * 0.1;
        defenderArcherLoss = Math.floor(defenderArmy.archer_count * defenderLossRate);
        defenderInfantryLoss = Math.floor(defenderArmy.infantry_count * defenderLossRate);
        defenderCavalryLoss = Math.floor(defenderArmy.cavalry_count * defenderLossRate);
      }

      const attackerPowerLoss = (attackerArcherLoss * 3) + (attackerInfantryLoss * 2) + (attackerCavalryLoss * 5);
      await query(`UPDATE armies SET archer_count = GREATEST(0, archer_count - $1), infantry_count = GREATEST(0, infantry_count - $2), cavalry_count = GREATEST(0, cavalry_count - $3), total_power = GREATEST(0, total_power - $4) WHERE user_id = $5`, [attackerArcherLoss, attackerInfantryLoss, attackerCavalryLoss, attackerPowerLoss, attackerId]);

      if (defenderArmyResult.rows.length > 0) {
        const defenderPowerLoss = (defenderArcherLoss * 3) + (defenderInfantryLoss * 2) + (defenderCavalryLoss * 5);
        await query(`UPDATE armies SET archer_count = GREATEST(0, archer_count - $1), infantry_count = GREATEST(0, infantry_count - $2), cavalry_count = GREATEST(0, cavalry_count - $3), total_power = GREATEST(0, total_power - $4) WHERE user_id = $5`, [defenderArcherLoss, defenderInfantryLoss, defenderCavalryLoss, defenderPowerLoss, defenderId]);
      }

      const battleSql = `INSERT INTO battles (attacker_id, defender_id, battle_type, attacker_power, defender_power, winner, reward_gold, reward_wood, reward_food) VALUES ($1, $2, 'pvp', $3, $4, $5, $6, $7, $8) RETURNING *`;
      const battleResult = await query(battleSql, [attackerId, defenderId, attackerPower, defenderPower, winner, rewardGold, rewardWood, rewardFood]);

      await query(`INSERT INTO pvp_attacks (attacker_id, defender_id, attack_date) VALUES ($1, $2, CURRENT_DATE)`, [attackerId, defenderId]);

      // Günlük saldırı görevini ilerlet
      try {
        const today = new Date().toISOString().split('T')[0];
        const taskRes = await query(
          "SELECT * FROM tasks WHERE user_id = $1 AND type = 'daily_attack' AND DATE(created_at) = $2 AND completed = false",
          [attackerId, today]
        );
        if (taskRes.rows.length > 0) {
          const t = taskRes.rows[0];
          const newProgress = t.progress + 1;
          const isCompleted = newProgress >= t.target;
          await query(
            'UPDATE tasks SET progress = $1, completed = $2, completed_at = $3 WHERE id = $4',
            [newProgress, isCompleted, isCompleted ? new Date() : null, t.id]
          );
        }
      } catch {}

      const attacksTodayRes = await query(
        'SELECT COUNT(*) as count FROM pvp_attacks WHERE attacker_id = $1 AND attack_date = CURRENT_DATE',
        [attackerId]
      );
      const attacksToday = parseInt(attacksTodayRes.rows[0].count);

      res.json({
        success: true,
        message: winner === 'attacker' ? 'Zafer! Kaynaklar yagmalandi! 🎉' : 'Savunma basarili! Maglup oldunuz! 💀',
        data: {
          battle: battleResult.rows[0],
          winner,
          attacks_today: attacksToday,
          attacks_limit: 5,
          attacker_losses: {
            archer: attackerArcherLoss,
            infantry: attackerInfantryLoss,
            cavalry: attackerCavalryLoss
          },
          defender_losses: {
            archer: defenderArcherLoss,
            infantry: defenderInfantryLoss,
            cavalry: defenderCavalryLoss
          },
          rewards: winner === 'attacker' ? { gold: rewardGold, wood: rewardWood, food: rewardFood } : null
        }
      });
    } catch (error) {
      console.error('Attack player error:', error);
      res.status(500).json({
        success: false,
        message: 'Saldiri basarisiz'
      });
    }
  }

  // Reklam izleme ödülü — korsan saldırı sayacını sıfırla
  static async watchAdReward(req, res) {
    try {
      const userId = req.userId; // JWT'den al, body'den değil

      // Gerçekten limite ulaşmış mı kontrol et
      const limitRes = await query(
        `SELECT COUNT(*) FROM pirate_attacks WHERE attacker_id = $1 AND attack_date = CURRENT_DATE`,
        [userId]
      );
      if (parseInt(limitRes.rows[0].count) < 10) {
        return res.status(400).json({ success: false, message: 'Henüz limite ulaşmadın' });
      }

      // Günlük maksimum 5 reklam izleme hakkı (users tablosunda last_ad_reward_date + ad_reward_count)
      const userRes = await query(
        `SELECT ad_reward_count, ad_reward_date FROM users WHERE id = $1`,
        [userId]
      );
      const user = userRes.rows[0];
      const today = new Date().toISOString().slice(0, 10);
      const adDate = user.ad_reward_date ? new Date(user.ad_reward_date).toISOString().slice(0, 10) : null;
      const todayCount = adDate === today ? (user.ad_reward_count || 0) : 0;

      if (todayCount >= 5) {
        return res.status(400).json({ success: false, message: 'Günlük maksimum reklam hakkını kullandın (5/5)' });
      }

      await query(
        `DELETE FROM pirate_attacks WHERE attacker_id = $1 AND attack_date = CURRENT_DATE`,
        [userId]
      );

      await query(
        `UPDATE users SET ad_reward_count = $1, ad_reward_date = CURRENT_DATE WHERE id = $2`,
        [todayCount + 1, userId]
      );

      res.json({ success: true, message: 'Reklam ödülü alındı! Korsan saldırı hakkın yenilendi.' });
    } catch (error) {
      console.error('Watch ad reward error:', error);
      res.status(500).json({ success: false, message: 'Hata oluştu' });
    }
  }

  // Kalkan satın al
  static async buyShield(req, res) {
    try {
      const { userId, hours } = req.body;

      const costs = {
        3: 500000,
        8: 1000000,
        24: 2400000
      };

      const cost = costs[hours];
      if (!cost) {
        return res.status(400).json({
          success: false,
          message: 'Gecersiz sure (3, 8 veya 24 saat)'
        });
      }

      const goldCheckSql = `SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'gold'`;
      const goldCheck = await query(goldCheckSql, [userId]);

      if (!goldCheck.rows[0] || goldCheck.rows[0].amount < cost) {
        return res.status(400).json({
          success: false,
          message: 'Yetersiz altin'
        });
      }

      await query(`UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'gold'`, [cost, userId]);

      // Mevcut aktif kalkan varsa süreyi ona ekle, yoksa şimdiden başlat
      const userRes = await query('SELECT shield_until FROM users WHERE id = $1', [userId]);
      const current = userRes.rows[0]?.shield_until;
      const baseTime = (current && new Date(current) > new Date())
        ? new Date(current).getTime()
        : Date.now();
      const shieldUntil = new Date(baseTime + hours * 60 * 60 * 1000);

      await query(`UPDATE users SET shield_until = $1 WHERE id = $2`, [shieldUntil, userId]);

      res.json({
        success: true,
        message: `${hours} saatlik kalkan eklendi! 🛡️`,
        data: { shield_until: shieldUntil }
      });
    } catch (error) {
      console.error('Buy shield error:', error);
      res.status(500).json({
        success: false,
        message: 'Kalkan alinamadi'
      });
    }
  }
}

module.exports = BattleController;