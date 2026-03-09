const { query } = require('../config/database');

// ── In-memory rule store ───────────────────────────────────────────────────
const rules = [
  { id: 'r4m',    label: '4.000.000 Altın Üzeri', threshold: 4000000, active: false },
  { id: 'r5m',    label: '5.000.000 Altın Üzeri', threshold: 5000000, active: false },
  { id: 'r6m',    label: '6.000.000 Altın Üzeri', threshold: 6000000, active: false },
  { id: 'custom', label: 'Özel Eşik',              threshold: 3000000, active: false },
];

function getRules() { return rules; }

function toggleRule(id) {
  const rule = rules.find(r => r.id === id);
  if (!rule) return null;
  rule.active = !rule.active;
  return rule;
}

function setCustomThreshold(threshold) {
  const rule = rules.find(r => r.id === 'custom');
  if (rule) rule.threshold = threshold;
}

// ── Worker ─────────────────────────────────────────────────────────────────
async function runAutoAttack() {
  const activeRules = rules.filter(r => r.active);
  if (activeRules.length === 0) return;

  for (const rule of activeRules) {
    try {
      // Kalkanı olmayan, altını eşiği geçen gerçek oyuncular
      const targetsRes = await query(`
        SELECT u.id, u.username
        FROM users u
        JOIN resources r ON r.user_id = u.id AND r.resource_type = 'gold'
        WHERE (u.is_bot = FALSE OR u.is_bot IS NULL)
          AND u.is_active = TRUE
          AND u.is_admin = FALSE
          AND (u.shield_until IS NULL OR u.shield_until < NOW())
          AND r.amount >= $1
        ORDER BY RANDOM()
        LIMIT 10
      `, [rule.threshold]);

      if (targetsRes.rows.length === 0) continue;

      // Rastgele botlar seç
      const botsRes = await query(`
        SELECT u.id, a.total_power
        FROM users u
        JOIN armies a ON a.user_id = u.id
        WHERE u.is_bot = TRUE AND a.total_power > 0
          AND (u.shield_until IS NULL OR u.shield_until < NOW())
        ORDER BY RANDOM()
        LIMIT 5
      `);

      if (botsRes.rows.length === 0) continue;

      for (const target of targetsRes.rows) {
        const bot = botsRes.rows[Math.floor(Math.random() * botsRes.rows.length)];

        const defArmyRes = await query('SELECT total_power FROM armies WHERE user_id = $1', [target.id]);
        const defPower = (defArmyRes.rows[0]?.total_power || 0) + Math.floor(Math.random() * 30) - 15;
        const atkPower = Math.max(1, bot.total_power) + Math.floor(Math.random() * 30) - 15;
        const winner = atkPower >= defPower ? 'attacker' : 'defender';

        const [goldRes, woodRes, foodRes] = await Promise.all([
          query(`SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'gold'`, [target.id]),
          query(`SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'wood'`,  [target.id]),
          query(`SELECT amount FROM resources WHERE user_id = $1 AND resource_type = 'food'`,  [target.id]),
        ]);

        const lootRate = 0.05 + Math.random() * 0.1;
        const rewardGold = winner === 'attacker' ? Math.floor((goldRes.rows[0]?.amount || 0) * lootRate) : 0;
        const rewardWood = winner === 'attacker' ? Math.floor((woodRes.rows[0]?.amount || 0) * lootRate) : 0;
        const rewardFood = winner === 'attacker' ? Math.floor((foodRes.rows[0]?.amount || 0) * lootRate) : 0;
        const rewardXp   = Math.floor(Math.random() * 30) + 10;

        if (winner === 'attacker' && (rewardGold || rewardWood || rewardFood)) {
          await Promise.all([
            rewardGold && query(`UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'gold'`, [rewardGold, target.id]),
            rewardWood && query(`UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'wood'`,  [rewardWood, target.id]),
            rewardFood && query(`UPDATE resources SET amount = amount - $1 WHERE user_id = $2 AND resource_type = 'food'`,  [rewardFood, target.id]),
            rewardGold && query(`UPDATE resources SET amount = LEAST(amount + $1, capacity) WHERE user_id = $2 AND resource_type = 'gold'`, [rewardGold, bot.id]),
            rewardWood && query(`UPDATE resources SET amount = LEAST(amount + $1, capacity) WHERE user_id = $2 AND resource_type = 'wood'`,  [rewardWood, bot.id]),
            rewardFood && query(`UPDATE resources SET amount = LEAST(amount + $1, capacity) WHERE user_id = $2 AND resource_type = 'food'`,  [rewardFood, bot.id]),
          ].filter(Boolean));
        }

        await query(`
          INSERT INTO battles (attacker_id, defender_id, battle_type, attacker_power, defender_power, winner, reward_gold, reward_wood, reward_food, reward_xp)
          VALUES ($1, $2, 'pvp', $3, $4, $5, $6, $7, $8, $9)
        `, [bot.id, target.id, atkPower, defPower, winner, rewardGold, rewardWood, rewardFood, rewardXp]);
      }

      console.log(`[AutoAttack] Kural: ${rule.label} — ${targetsRes.rows.length} hedefe saldırıldı`);
    } catch (err) {
      console.error(`[AutoAttack] Kural ${rule.id} hatası:`, err.message);
    }
  }
}

function startAutoAttackWorker() {
  // Her 5 dakikada bir çalış
  setInterval(runAutoAttack, 5 * 60 * 1000);
  console.log('[AutoAttack] Worker başlatıldı (5 dakika aralıklı)');
}

module.exports = { getRules, toggleRule, setCustomThreshold, startAutoAttackWorker };
