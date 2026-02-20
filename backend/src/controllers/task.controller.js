const { query } = require('../config/database');

class TaskController {
  // Kullanıcının görevlerini getir
  static async getUserTasks(req, res) {
    try {
      const { userId } = req.query;

      // Bugünün görevlerini getir
      const today = new Date().toISOString().split('T')[0];
      
      const sql = `
        SELECT * FROM tasks 
        WHERE user_id = $1 AND DATE(created_at) = $2
        ORDER BY created_at DESC
      `;
      
      const result = await query(sql, [userId, today]);
      let tasks = result.rows;

      // Eğer bugün görev yoksa, yeni görevler oluştur
      if (tasks.length === 0) {
        tasks = await TaskController.createDailyTasks(userId);
      }

      res.json({
        success: true,
        data: { tasks }
      });
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({
        success: false,
        message: 'Gorevler getirilemedi',
        error: error.message
      });
    }
  }

  // Günlük görevleri oluştur
  static async createDailyTasks(userId) {
    const dailyTasks = [
      {
        type: 'daily_production',
        description: '3 uretim baslat',
        target: 3,
        reward_gold: 200,
        reward_experience: 50
      },
      {
        type: 'daily_upgrade',
        description: '1 bina yukselt',
        target: 1,
        reward_gold: 300,
        reward_experience: 75
      },
      {
        type: 'daily_attack',
        description: '5 saldiri yap',
        target: 5,
        reward_gold: 200,
        reward_experience: 100
      }
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
        task.reward_experience
      ]);
      
      createdTasks.push(result.rows[0]);
    }

    return createdTasks;
  }

  // Görev ilerlemesini güncelle
  static async updateTaskProgress(req, res) {
    try {
      const { userId, taskType } = req.body;

      const today = new Date().toISOString().split('T')[0];
      
      // Bugünün ilgili görevini bul
      const findSql = `
        SELECT * FROM tasks 
        WHERE user_id = $1 AND type = $2 AND DATE(created_at) = $3 AND completed = false
      `;
      
      const findResult = await query(findSql, [userId, taskType, today]);
      
      if (findResult.rows.length === 0) {
        return res.json({
          success: true,
          message: 'Gorev bulunamadi veya tamamlandi'
        });
      }

      const task = findResult.rows[0];
      const newProgress = task.progress + 1;
      const isCompleted = newProgress >= task.target;

      // İlerlemeyi güncelle
      const updateSql = `
        UPDATE tasks 
        SET progress = $1, completed = $2, completed_at = $3
        WHERE id = $4
        RETURNING *
      `;
      
      const updateResult = await query(updateSql, [
        newProgress,
        isCompleted,
        isCompleted ? new Date() : null,
        task.id
      ]);

      res.json({
        success: true,
        data: { task: updateResult.rows[0] },
        message: isCompleted ? 'Gorev tamamlandi!' : 'Ilerleme kaydedildi'
      });
    } catch (error) {
      console.error('Update task progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Ilerleme guncellenemedi',
        error: error.message
      });
    }
  }

  // Görev ödülünü topla
  static async claimReward(req, res) {
    try {
      const { taskId, userId } = req.body;

      // Görevi getir
      const taskSql = 'SELECT * FROM tasks WHERE id = $1 AND user_id = $2';
      const taskResult = await query(taskSql, [taskId, userId]);

      if (taskResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Gorev bulunamadi'
        });
      }

      const task = taskResult.rows[0];

      if (!task.completed) {
        return res.status(400).json({
          success: false,
          message: 'Gorev henuz tamamlanmadi'
        });
      }

      if (task.claimed) {
        return res.status(400).json({
          success: false,
          message: 'Odul zaten alindi'
        });
      }

      // Ödülü ver
      await query(
        'UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = $3',
        [task.reward_gold, userId, 'gold']
      );

      await query(
        'UPDATE users SET experience = experience + $1 WHERE id = $2',
        [task.reward_experience, userId]
      );

      // Görevi claimed olarak işaretle
      await query(
        'UPDATE tasks SET claimed = true, claimed_at = CURRENT_TIMESTAMP WHERE id = $1',
        [taskId]
      );

      res.json({
        success: true,
        message: 'Odul topland',
        data: {
          gold: task.reward_gold,
          experience: task.reward_experience
        }
      });
    } catch (error) {
      console.error('Claim reward error:', error);
      res.status(500).json({
        success: false,
        message: 'Odul toplanamadi',
        error: error.message
      });
    }
  }
}

module.exports = TaskController;