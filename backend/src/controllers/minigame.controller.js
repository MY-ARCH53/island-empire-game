const { query } = require('../config/database');
const { addXP } = require('../services/xp.service');

// Ödül köprüsü dengeleme sabitleri
const GOLD_PER_KILL = 2;
const GOLD_PER_LEVEL = 40;
const PER_RUN_GOLD_CAP = 3000;
const DAILY_MINIGAME_GOLD_LIMIT = 20000;
// Düşman spawn hızı en kötü (geç oyun) durumda ~1/0.35s = 2.86/sn'ye satüre olur
// (bkz. godot-game/scripts/game.gd _update_difficulty) — bir oyuncu spawn'dan
// daha hızlı öldüremez, o yüzden ortalama kill/sn bunu aşamaz. Küçük bir pay
// (boss anları, çoklu-vuruşlu silahlar için) bırakılarak 3/sn'ye sabitlendi.
const MAX_KILLS_PER_SECOND = 3;
const MAX_RUN_SECONDS = 1800;     // 30 dk üstü run'ı mantık dışı say
const MIN_SUBMIT_GAP_SECONDS = 10; // çok kısa run'lar için taban bekleme
const SUBMIT_GRACE_SECONDS = 5;    // ağ/menü gecikmesi payı
const XP_PER_KILL = 1;
const MAX_XP_PER_RUN = 200;

// Kan Özü — mini oyuna özel, ana ekonomiden bağımsız kalıcı ilerleme para birimi
const ESSENCE_PER_RUN_CAP = 40;

// Kalıcı yükseltmeler — sadece bu dosyada tanımlı, fiyat/limit her zaman sunucuda doğrulanır
const UPGRADE_DEFS = {
  max_health:    { name: 'Kalıcı Azami Can',       desc: '+10 azami can (kalıcı)',                 baseCost: 20,  maxLevel: 5 },
  move_speed:    { name: 'Kalıcı Hız',              desc: '+5% hareket hızı (kalıcı)',               baseCost: 25,  maxLevel: 5 },
  pickup_radius: { name: 'Kalıcı Toplama Menzili',  desc: '+15% XP toplama menzili (kalıcı)',        baseCost: 20,  maxLevel: 5 },
  extra_choice:  { name: 'Ekstra Seçenek Slotu',    desc: 'Seviye atlarken 3 yerine 4 seçenek sun',  baseCost: 150, maxLevel: 1 },
  lucky_start:   { name: 'Şanslı Başlangıç',        desc: 'Oyuna Dönen Kılıçlar ile başla',          baseCost: 100, maxLevel: 1 },
};

function costForLevel(def, currentLevel) {
  return Math.round(def.baseCost * Math.pow(currentLevel + 1, 1.5));
}

class MinigameController {
  // GET /api/minigame/status
  static async getStatus(req, res) {
    try {
      const userId = req.userId;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const dailyRes = await query(
        `SELECT COALESCE(SUM(amount), 0)::int AS daily_total
         FROM resource_transactions
         WHERE user_id = $1 AND source = 'minigame' AND resource_type = 'gold' AND created_at >= $2`,
        [userId, todayStart.toISOString()]
      ).catch(() => ({ rows: [{ daily_total: 0 }] }));

      const dailyTotal = Number(dailyRes.rows[0].daily_total);
      const dailyRemaining = Math.max(0, DAILY_MINIGAME_GOLD_LIMIT - dailyTotal);

      res.json({
        success: true,
        data: {
          dailyTotal,
          dailyRemaining,
          dailyLimit: DAILY_MINIGAME_GOLD_LIMIT,
          perRunCap: PER_RUN_GOLD_CAP,
        },
      });
    } catch (err) {
      console.error('Minigame status error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // GET /api/minigame/progress — Kan Özü bakiyesi + kalıcı yükseltme dükkanı
  static async getProgress(req, res) {
    try {
      const userId = req.userId;
      const result = await query(
        'SELECT blood_essence, upgrades FROM minigame_progress WHERE user_id = $1',
        [userId]
      ).catch(() => ({ rows: [] }));

      const row = result.rows[0] || { blood_essence: 0, upgrades: {} };
      const upgrades = row.upgrades || {};

      const shop = Object.entries(UPGRADE_DEFS).map(([id, def]) => {
        const level = upgrades[id] || 0;
        const maxed = level >= def.maxLevel;
        return {
          id,
          name: def.name,
          desc: def.desc,
          level,
          maxLevel: def.maxLevel,
          nextCost: maxed ? null : costForLevel(def, level),
        };
      });

      res.json({
        success: true,
        data: { bloodEssence: row.blood_essence, upgrades, shop },
      });
    } catch (err) {
      console.error('Minigame progress error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // POST /api/minigame/purchase-upgrade  { upgradeId }
  static async purchaseUpgrade(req, res) {
    try {
      const userId = req.userId;
      const { upgradeId } = req.body;
      const def = UPGRADE_DEFS[upgradeId];
      if (!def) {
        return res.status(400).json({ success: false, message: 'Geçersiz yükseltme' });
      }

      const result = await query(
        'SELECT blood_essence, upgrades FROM minigame_progress WHERE user_id = $1',
        [userId]
      ).catch(() => ({ rows: [] }));
      const row = result.rows[0] || { blood_essence: 0, upgrades: {} };
      const upgrades = row.upgrades || {};
      const currentLevel = upgrades[upgradeId] || 0;

      if (currentLevel >= def.maxLevel) {
        return res.status(400).json({ success: false, message: 'Bu yükseltme zaten en üst seviyede.' });
      }

      const cost = costForLevel(def, currentLevel);
      if (row.blood_essence < cost) {
        return res.status(400).json({ success: false, message: 'Yetersiz Kan Özü.' });
      }

      upgrades[upgradeId] = currentLevel + 1;
      const newEssence = row.blood_essence - cost;

      await query(
        `INSERT INTO minigame_progress (user_id, blood_essence, upgrades)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE SET blood_essence = $2, upgrades = $3, updated_at = CURRENT_TIMESTAMP`,
        [userId, newEssence, JSON.stringify(upgrades)]
      );

      res.json({
        success: true,
        data: { bloodEssence: newEssence, upgrades },
        message: `${def.name} seviye ${currentLevel + 1} oldu!`,
      });
    } catch (err) {
      console.error('Purchase upgrade error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu' });
    }
  }

  // POST /api/minigame/submit-run  { score, kills, level, survivalSeconds }
  static async submitRun(req, res) {
    try {
      const userId = req.userId;
      let { kills, level, survivalSeconds } = req.body;

      kills = Number(kills);
      level = Number(level);
      survivalSeconds = Number(survivalSeconds);

      if (!Number.isFinite(kills) || !Number.isFinite(level) || !Number.isFinite(survivalSeconds)) {
        return res.status(400).json({ success: false, message: 'Geçersiz run verisi' });
      }

      kills = Math.max(0, Math.floor(kills));
      level = Math.max(1, Math.min(60, Math.floor(level)));
      survivalSeconds = Math.max(1, Math.min(MAX_RUN_SECONDS, Math.floor(survivalSeconds)));

      // Mantık dışı kill oranını kırp (hız hilesi / sahte veri koruması)
      kills = Math.min(kills, survivalSeconds * MAX_KILLS_PER_SECOND);

      // Ardışık gönderim spam koruması
      const lastRes = await query(
        `SELECT created_at FROM resource_transactions
         WHERE user_id = $1 AND source = 'minigame'
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      ).catch(() => ({ rows: [] }));

      if (lastRes.rows.length) {
        const secondsSinceLast = (Date.now() - new Date(lastRes.rows[0].created_at).getTime()) / 1000;
        // Bu run'ı gerçekten oynamış olmak için en az survivalSeconds kadar
        // (küçük bir gecelik payla) zaman geçmiş olmalı — yoksa sahte/tekrar
        // gönderim demektir. Çok kısa run'lar için MIN_SUBMIT_GAP_SECONDS taban.
        const minRequiredGap = Math.max(MIN_SUBMIT_GAP_SECONDS, survivalSeconds - SUBMIT_GRACE_SECONDS);
        if (secondsSinceLast < minRequiredGap) {
          return res.status(429).json({ success: false, message: 'Çok hızlı gönderim, biraz bekle.' });
        }
      }

      // Günlük limit kontrolü
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const dailyRes = await query(
        `SELECT COALESCE(SUM(amount), 0)::int AS daily_total
         FROM resource_transactions
         WHERE user_id = $1 AND source = 'minigame' AND resource_type = 'gold' AND created_at >= $2`,
        [userId, todayStart.toISOString()]
      ).catch(() => ({ rows: [{ daily_total: 0 }] }));
      const dailyTotal = Number(dailyRes.rows[0].daily_total);
      const dailyRemaining = Math.max(0, DAILY_MINIGAME_GOLD_LIMIT - dailyTotal);

      const rawGold = kills * GOLD_PER_KILL + level * GOLD_PER_LEVEL;
      const goldEarned = Math.min(rawGold, PER_RUN_GOLD_CAP, dailyRemaining);

      if (goldEarned > 0) {
        await query(
          "UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = 'gold'",
          [goldEarned, userId]
        );

        await query(
          `INSERT INTO resource_transactions (user_id, resource_type, amount, source, meta)
           VALUES ($1, 'gold', $2, 'minigame', $3)`,
          [userId, goldEarned, JSON.stringify({ kills, level, survivalSeconds })]
        ).catch(() => {});
      }

      const xpEarned = Math.min(kills * XP_PER_KILL, MAX_XP_PER_RUN);
      const xpResult = xpEarned > 0 ? await addXP(userId, xpEarned) : { leveledUp: false };

      // Kan Özü — ana ekonomiden bağımsız, sadece mini oyun dükkanında harcanır
      const essenceEarned = Math.min(Math.floor(kills / 5) + level, ESSENCE_PER_RUN_CAP);
      if (essenceEarned > 0) {
        await query(
          `INSERT INTO minigame_progress (user_id, blood_essence, upgrades)
           VALUES ($1, $2, '{}'::jsonb)
           ON CONFLICT (user_id) DO UPDATE SET
             blood_essence = minigame_progress.blood_essence + $2,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, essenceEarned]
        ).catch(() => {});
      }

      res.json({
        success: true,
        data: {
          goldEarned,
          xpEarned,
          xp: xpResult,
          essenceEarned,
          dailyRemaining: Math.max(0, dailyRemaining - goldEarned),
          capped: rawGold > goldEarned,
        },
        message: goldEarned > 0
          ? `${goldEarned.toLocaleString('tr-TR')} altın kazandın!`
          : 'Günlük mini oyun limitine ulaştın, yarın tekrar dene.',
      });
    } catch (err) {
      console.error('Minigame submit-run error:', err.message);
      res.status(500).json({ success: false, message: 'Hata olustu', error: err.message });
    }
  }
}

module.exports = MinigameController;
