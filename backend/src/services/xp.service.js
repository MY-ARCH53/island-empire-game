const { query } = require('../config/database');

// XP eşiği tablosu: index = mevcut level, değer = sonraki levele geçmek için gereken XP
// İlk levellar çok hızlı → FAZ 1 dopamini
const XP_TABLE = [
  50,    // Lv 1 → 2
  80,    // Lv 2 → 3
  130,   // Lv 3 → 4
  210,   // Lv 4 → 5
  340,   // Lv 5 → 6
  550,   // Lv 6 → 7
  890,   // Lv 7 → 8
  1440,  // Lv 8 → 9
  2330,  // Lv 9 → 10
  3800,  // Lv 10 → 11
];

function xpForNextLevel(currentLevel) {
  if (currentLevel < 1) return XP_TABLE[0];
  const idx = currentLevel - 1;
  if (idx < XP_TABLE.length) return XP_TABLE[idx];
  // Lv 10+ → her level %50 daha zor
  return Math.floor(XP_TABLE[XP_TABLE.length - 1] * Math.pow(1.5, idx - (XP_TABLE.length - 1)));
}

// Level atlanınca altın ödülü (katlanan seri)
function goldRewardForLevel(newLevel) {
  return Math.floor(100 * Math.pow(2, newLevel - 2));
  // Lv2=100, Lv3=200, Lv4=400, Lv5=800 ...
}

/**
 * Kullanıcıya XP ekle, level-up kontrolü yap, ödül ver.
 * @returns {{ leveledUp: boolean, newLevel: number, goldReward: number, xp: number, xpNeeded: number }}
 */
async function addXP(userId, amount) {
  try {
    const userRes = await query('SELECT level, experience FROM users WHERE id = $1', [userId]);
    if (!userRes.rows.length) return { leveledUp: false };

    let { level, experience } = userRes.rows[0];
    let xp = experience + amount;
    let leveledUp = false;
    let totalGold = 0;
    let newLevel = level;

    // Birden fazla level atlanabilir
    while (true) {
      const needed = xpForNextLevel(newLevel);
      if (xp >= needed) {
        xp -= needed;
        newLevel++;
        leveledUp = true;
        totalGold += goldRewardForLevel(newLevel);
      } else {
        break;
      }
    }

    await query('UPDATE users SET experience = $1, level = $2 WHERE id = $3', [xp, newLevel, userId]);

    if (totalGold > 0) {
      await query(
        "UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = 'gold'",
        [totalGold, userId]
      );
    }

    return {
      leveledUp,
      newLevel,
      goldReward: totalGold,
      xp,
      xpNeeded: xpForNextLevel(newLevel),
    };
  } catch (err) {
    console.error('addXP error:', err.message);
    return { leveledUp: false };
  }
}

module.exports = { addXP, xpForNextLevel };
