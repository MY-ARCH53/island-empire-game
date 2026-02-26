const { query } = require('../config/database');

class TaskController {
  // Kullanıcının görevlerini getir
  static async getUserTasks(req, res) {
    try {
      const { userId } = req.query;

      const today = new Date().toISOString().split('T')[0];

      const sql = `
        SELECT * FROM tasks
        WHERE user_id = $1 AND DATE(created_at) = $2
        ORDER BY created_at ASC
      `;

      const result = await query(sql, [userId, today]);
      let tasks = result.rows;

      // Bugün görev yoksa oluştur
      if (tasks.length === 0) {
        tasks = await TaskController.createDailyTasks(userId);
      }

      res.json({ success: true, data: { tasks } });
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ success: false, message: 'Gorevler getirilemedi', error: error.message });
    }
  }

  // Günlük görevleri oluştur (4 görev)
  static async createDailyTasks(userId) {
    const dailyTasks = [
      {
        type: 'daily_production',
        description: '5 üretim başlat',
        target: 5,
        reward_gold: 500,
        reward_experience: 50,
      },
      {
        type: 'daily_collect',
        description: '5 üretim topla',
        target: 5,
        reward_gold: 500,
        reward_experience: 50,
      },
      {
        type: 'daily_upgrade',
        description: '1 bina yükselt',
        target: 1,
        reward_gold: 1000,
        reward_experience: 100,
      },
      {
        type: 'daily_trade',
        description: '1 ticaret yap',
        target: 1,
        reward_gold: 300,
        reward_experience: 30,
      },
    ];

    const createdTasks = [];

    for (const task of dailyTasks) {
      const insertSql = `
        INSERT INTO tasks (user_id, type, description, target, progress, reward_gold, reward_experience, completed)
        VALUES ($1, $2, $3, $4, 0, $5, $6, false)
        RETURNING *
      `;
      const result = await query(insertSql, [
        userId,
        task.type,
        task.description,
        task.target,
        task.reward_gold,
        task.reward_experience,
      ]);
      createdTasks.push(result.rows[0]);
    }

    return createdTasks;
  }

  // Görev ilerlemesini iç kullanım için güncelle (diğer controller'lardan çağırılır)
  static async trackProgress(userId, taskType) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const findResult = await query(
        'SELECT * FROM tasks WHERE user_id = $1 AND type = $2 AND DATE(created_at) = $3 AND completed = false',
        [userId, taskType, today]
      );
      if (findResult.rows.length === 0) return;

      const task = findResult.rows[0];
      const newProgress = task.progress + 1;
      const isCompleted = newProgress >= task.target;

      await query(
        'UPDATE tasks SET progress = $1, completed = $2, completed_at = $3 WHERE id = $4',
        [newProgress, isCompleted, isCompleted ? new Date() : null, task.id]
      );
    } catch (err) {
      console.error('trackProgress error:', err.message);
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
