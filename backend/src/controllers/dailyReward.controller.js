const { query } = require('../config/database');

class DailyRewardController {
  static async checkDailyReward(req, res) {
    try {
      const { userId } = req.query;

      // Son ödül alınma tarihini kontrol et
      const lastRewardSql = `
        SELECT * FROM daily_rewards 
        WHERE user_id = $1 
        ORDER BY claimed_at DESC 
        LIMIT 1
      `;
      const lastRewardResult = await query(lastRewardSql, [userId]);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let canClaim = false;
      let nextDay = 1;
      let streakCount = 0;
      let streakAtRisk = false;

      if (lastRewardResult.rows.length === 0) {
        // İlk kez giriş yapıyor
        canClaim = true;
        nextDay = 1;
      } else {
        const lastReward = lastRewardResult.rows[0];
        const lastClaimDate = new Date(lastReward.claimed_at);
        const lastClaimDay = new Date(
          lastClaimDate.getFullYear(),
          lastClaimDate.getMonth(),
          lastClaimDate.getDate()
        );

        const diffDays = Math.floor((today - lastClaimDay) / (1000 * 60 * 60 * 24));

        if (diffDays >= 1) {
          canClaim = true;
          if (diffDays === 1) {
            // Streak devam ediyor — bu günü almadı henüz
            nextDay = (lastReward.day_number % 7) + 1;
            streakCount = lastReward.day_number; // dünkü gün sayısı = mevcut streak
            streakAtRisk = streakCount >= 1;     // 1+ gün varsa FOMO
          } else {
            // Streak kırıldı, baştan başla
            nextDay = 1;
            streakCount = 0;
          }
        } else {
          // Bugün zaten alındı
          canClaim = false;
          nextDay = lastReward.day_number;
          streakCount = lastReward.day_number;
        }
      }

      // Ödül miktarlarını hesapla
      const rewards = {
        1: { gold: 100, wood: 0 },
        2: { gold: 150, wood: 50 },
        3: { gold: 200, wood: 100 },
        4: { gold: 250, wood: 150 },
        5: { gold: 300, wood: 200 },
        6: { gold: 400, wood: 250 },
        7: { gold: 500, wood: 300 }
      };

      res.json({
        success: true,
        data: {
          canClaim,
          day: nextDay,
          reward: rewards[nextDay],
          streakCount,
          streakAtRisk,
        }
      });
    } catch (error) {
      console.error('Check daily reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Gunluk odul kontrolu basarisiz'
      });
    }
  }

  static async claimDailyReward(req, res) {
    try {
      const { userId } = req.body;

      // Önce claim edilebilir mi kontrol et
      const lastRewardSql = `
        SELECT * FROM daily_rewards 
        WHERE user_id = $1 
        ORDER BY claimed_at DESC 
        LIMIT 1
      `;
      const lastRewardResult = await query(lastRewardSql, [userId]);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let canClaim = false;
      let nextDay = 1;

      if (lastRewardResult.rows.length === 0) {
        canClaim = true;
        nextDay = 1;
      } else {
        const lastReward = lastRewardResult.rows[0];
        const lastClaimDate = new Date(lastReward.claimed_at);
        const lastClaimDay = new Date(
          lastClaimDate.getFullYear(),
          lastClaimDate.getMonth(),
          lastClaimDate.getDate()
        );

        const diffDays = Math.floor((today - lastClaimDay) / (1000 * 60 * 60 * 24));

        if (diffDays >= 1) {
          canClaim = true;
          if (diffDays === 1) {
            nextDay = (lastReward.day_number % 7) + 1;
          } else {
            nextDay = 1;
          }
        }
      }

      if (!canClaim) {
        return res.status(400).json({
          success: false,
          message: 'Bugun zaten odul aldiniz'
        });
      }

      // Ödül miktarlarını hesapla
      const rewards = {
        1: { gold: 100, wood: 0 },
        2: { gold: 150, wood: 50 },
        3: { gold: 200, wood: 100 },
        4: { gold: 250, wood: 150 },
        5: { gold: 300, wood: 200 },
        6: { gold: 400, wood: 250 },
        7: { gold: 500, wood: 300 }
      };

      const reward = rewards[nextDay];

      // Ödülü kaydet
      const insertSql = `
        INSERT INTO daily_rewards (user_id, day_number, reward_gold, reward_wood)
        VALUES ($1, $2, $3, $4)
      `;
      await query(insertSql, [userId, nextDay, reward.gold, reward.wood]);

      // Kullanıcıya ödülü ver
      const updateGoldSql = `
        UPDATE resources 
        SET amount = amount + $1 
        WHERE user_id = $2 AND resource_type = 'gold'
      `;
      await query(updateGoldSql, [reward.gold, userId]);

      if (reward.wood > 0) {
        const updateWoodSql = `
          UPDATE resources 
          SET amount = amount + $1 
          WHERE user_id = $2 AND resource_type = 'wood'
        `;
        await query(updateWoodSql, [reward.wood, userId]);
      }

      res.json({
        success: true,
        message: `Gun ${nextDay} odulu alindi!`,
        data: {
          day: nextDay,
          reward
        }
      });
    } catch (error) {
      console.error('Claim daily reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Odul alma basarisiz',
        error: error.message
      });
    }
  }
}

module.exports = DailyRewardController;