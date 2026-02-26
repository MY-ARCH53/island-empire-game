const { query } = require('../config/database');

// Günlük tip → haftalık tip eşlemesi
const WEEKLY_MAP = {
  daily_production: 'weekly_production',
  daily_collect:    'weekly_collect',
  daily_upgrade:    'weekly_upgrade',
  daily_trade:      'weekly_trade',
};

class TaskController {
  // Kullanıcının görevlerini getir (günlük + haftalık)
  static async getUserTasks(req, res) {
    try {
      const { userId } = req.query;
      const today = new Date().toISOString().split('T')[0];

      // Günlük görevler
      const dailyResult = await query(
        'SELECT * FROM tasks WHERE user_id = $1 AND DATE(created_at) = $2 AND (is_weekly IS NULL OR is_weekly = FALSE) ORDER BY created_at ASC',
        [userId, today]
      );
      let dailyTasks = dailyResult.rows;
      if (dailyTasks.length === 0) {
        dailyTasks = await TaskController.createDailyTasks(userId);
      }

      // Haftalık görevler
      const weeklyResult = await query(
        `SELECT * FROM tasks
         WHERE user_id = $1
           AND is_weekly = TRUE
           AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
           AND EXTRACT(WEEK FROM created_at) = EXTRACT(WEEK FROM CURRENT_DATE)
         ORDER BY created_at ASC`,
        [userId]
      );
      let weeklyTasks = weeklyResult.rows;
      if (weeklyTasks.length === 0) {
        weeklyTasks = await TaskController.createWeeklyTasks(userId);
      }

      res.json({ success: true, data: { tasks: [...dailyTasks, ...weeklyTasks] } });
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ success: false, message: 'Gorevler getirilemedi', error: error.message });
    }
  }

  // Günlük görevleri oluştur (4 görev)
  static async createDailyTasks(userId) {
    const dailyTasks = [
      { type: 'daily_production', description: '5 üretim başlat',  target: 5,  reward_gold: 500,  reward_experience: 50  },
      { type: 'daily_collect',    description: '5 üretim topla',   target: 5,  reward_gold: 500,  reward_experience: 50  },
      { type: 'daily_upgrade',    description: '1 bina yükselt',   target: 1,  reward_gold: 1000, reward_experience: 100 },
      { type: 'daily_trade',      description: '1 ticaret yap',    target: 1,  reward_gold: 300,  reward_experience: 30  },
    ];

    const createdTasks = [];
    for (const task of dailyTasks) {
      const result = await query(
        'INSERT INTO tasks (user_id, type, description, target, progress, reward_gold, reward_experience, completed, is_weekly) VALUES ($1, $2, $3, $4, 0, $5, $6, false, false) RETURNING *',
        [userId, task.type, task.description, task.target, task.reward_gold, task.reward_experience]
      );
      createdTasks.push(result.rows[0]);
    }
    return createdTasks;
  }

  // Haftalık görevleri oluştur (5 görev)
  static async createWeeklyTasks(userId) {
    const weeklyTasks = [
      { type: 'weekly_production', description: '30 üretim başlat',  target: 30, reward_gold: 5000,  reward_experience: 500  },
      { type: 'weekly_collect',    description: '30 üretim topla',   target: 30, reward_gold: 5000,  reward_experience: 500  },
      { type: 'weekly_upgrade',    description: '5 bina yükselt',    target: 5,  reward_gold: 8000,  reward_experience: 800  },
      { type: 'weekly_trade',      description: '5 ticaret yap',     target: 5,  reward_gold: 3000,  reward_experience: 300  },
      { type: 'weekly_island',     description: '1 yeni ada keşfet', target: 1,  reward_gold: 15000, reward_experience: 1500 },
    ];

    const createdTasks = [];
    for (const task of weeklyTasks) {
      const result = await query(
        'INSERT INTO tasks (user_id, type, description, target, progress, reward_gold, reward_experience, completed, is_weekly) VALUES ($1, $2, $3, $4, 0, $5, $6, false, true) RETURNING *',
        [userId, task.type, task.description, task.target, task.reward_gold, task.reward_experience]
      );
      createdTasks.push(result.rows[0]);
    }
    return createdTasks;
  }

  // Görev ilerlemesini iç kullanım için güncelle (diğer controller'lardan çağırılır)
  static async trackProgress(userId, taskType) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Günlük görev güncelle
      const dailyFind = await query(
        'SELECT * FROM tasks WHERE user_id = $1 AND type = $2 AND DATE(created_at) = $3 AND completed = false AND (is_weekly IS NULL OR is_weekly = FALSE)',
        [userId, taskType, today]
      );
      if (dailyFind.rows.length > 0) {
        const task = dailyFind.rows[0];
        const newProgress = task.progress + 1;
        const isCompleted = newProgress >= task.target;
        await query(
          'UPDATE tasks SET progress = $1, completed = $2, completed_at = $3 WHERE id = $4',
          [newProgress, isCompleted, isCompleted ? new Date() : null, task.id]
        );
      }

      // Haftalık karşılığını da güncelle
      const weeklyType = WEEKLY_MAP[taskType];
      if (!weeklyType) return;

      const weeklyFind = await query(
        `SELECT * FROM tasks
         WHERE user_id = $1 AND type = $2 AND is_weekly = TRUE AND completed = false
           AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
           AND EXTRACT(WEEK FROM created_at) = EXTRACT(WEEK FROM CURRENT_DATE)`,
        [userId, weeklyType]
      );
      if (weeklyFind.rows.length > 0) {
        const task = weeklyFind.rows[0];
        const newProgress = task.progress + 1;
        const isCompleted = newProgress >= task.target;
        await query(
          'UPDATE tasks SET progress = $1, completed = $2, completed_at = $3 WHERE id = $4',
          [newProgress, isCompleted, isCompleted ? new Date() : null, task.id]
        );
      }
    } catch (err) {
      console.error('trackProgress error:', err.message);
    }
  }

  // Haftalık ada görevi takibi (island.controller'dan çağırılır)
  static async trackWeeklyIsland(userId) {
    try {
      const weeklyFind = await query(
        `SELECT * FROM tasks
         WHERE user_id = $1 AND type = 'weekly_island' AND is_weekly = TRUE AND completed = false
           AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
           AND EXTRACT(WEEK FROM created_at) = EXTRACT(WEEK FROM CURRENT_DATE)`,
        [userId]
      );
      if (weeklyFind.rows.length > 0) {
        const task = weeklyFind.rows[0];
        const newProgress = task.progress + 1;
        const isCompleted = newProgress >= task.target;
        await query(
          'UPDATE tasks SET progress = $1, completed = $2, completed_at = $3 WHERE id = $4',
          [newProgress, isCompleted, isCompleted ? new Date() : null, task.id]
        );
      }
    } catch (err) {
      console.error('trackWeeklyIsland error:', err.message);
    }
  }

  // REST: Görev ilerlemesini güncelle
  static async updateTaskProgress(req, res) {
    try {
      const { userId, taskType } = req.body;
      const today = new Date().toISOString().split('T')[0];

      const findResult = await query(
        'SELECT * FROM tasks WHERE user_id = $1 AND type = $2 AND DATE(created_at) = $3 AND completed = false',
        [userId, taskType, today]
      );

      if (findResult.rows.length === 0) {
        return res.json({ success: true, message: 'Gorev bulunamadi veya tamamlandi' });
      }

      const task = findResult.rows[0];
      const newProgress = task.progress + 1;
      const isCompleted = newProgress >= task.target;

      const updateResult = await query(
        'UPDATE tasks SET progress = $1, completed = $2, completed_at = $3 WHERE id = $4 RETURNING *',
        [newProgress, isCompleted, isCompleted ? new Date() : null, task.id]
      );

      res.json({
        success: true,
        data: { task: updateResult.rows[0] },
        message: isCompleted ? 'Gorev tamamlandi!' : 'Ilerleme kaydedildi',
      });
    } catch (error) {
      console.error('Update task progress error:', error);
      res.status(500).json({ success: false, message: 'Ilerleme guncellenemedi', error: error.message });
    }
  }

  // Görev ödülünü topla
  static async claimReward(req, res) {
    try {
      const { taskId, userId } = req.body;

      const taskResult = await query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [taskId, userId]);

      if (taskResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Gorev bulunamadi' });
      }

      const task = taskResult.rows[0];

      if (!task.completed) {
        return res.status(400).json({ success: false, message: 'Gorev henuz tamamlanmadi' });
      }

      if (task.claimed) {
        return res.status(400).json({ success: false, message: 'Odul zaten alindi' });
      }

      await query(
        'UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = $3',
        [task.reward_gold, userId, 'gold']
      );

      await query(
        'UPDATE users SET experience = experience + $1 WHERE id = $2',
        [task.reward_experience, userId]
      );

      await query(
        'UPDATE tasks SET claimed = true, claimed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [taskId]
      );

      res.json({
        success: true,
        message: `+${task.reward_gold} altin, +${task.reward_experience} XP!`,
        data: { gold: task.reward_gold, experience: task.reward_experience },
      });
    } catch (error) {
      console.error('Claim reward error:', error);
      res.status(500).json({ success: false, message: 'Odul toplanamadi', error: error.message });
    }
  }
}

module.exports = TaskController;
