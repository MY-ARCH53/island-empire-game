const { query } = require('../config/database');

// "Kan Adası: Online" Faz 4 — kuşanılan eşyanın gerçek savaş etkisi.
// Her güçlendirme (enchant) seviyesi, temel istatistiği %15 artırır.
const ENCHANT_BONUS_PER_LEVEL = 0.15;

function effectiveStat(base, enchantLevel) {
  return Math.round(base * (1 + ENCHANT_BONUS_PER_LEVEL * (enchantLevel || 0)));
}

// Kuşanılan silah/zırh/kalkanın toplam etkisini hesaplar — hem envanter
// ekranında (görüntüleme) hem de godot-server'ın internal/authenticate
// yanıtında (gerçek savaş hesaplaması için) kullanılır.
async function getEquippedStats(userId) {
  const result = await query(
    `SELECT d.base_stats, oi.enchant_level
     FROM online_equipment oe
     JOIN online_inventory oi ON oi.id = oe.inventory_item_id
     JOIN item_defs d ON d.id = oi.item_def_id
     WHERE oe.user_id = $1`,
    [userId]
  );

  let damageBonus = 0;
  let armorBonus = 0;
  let maxHealthBonus = 0;
  for (const row of result.rows) {
    const stats = row.base_stats || {};
    const level = row.enchant_level || 0;
    if (stats.damage) damageBonus += effectiveStat(stats.damage, level);
    if (stats.armor) armorBonus += effectiveStat(stats.armor, level);
    if (stats.max_health) maxHealthBonus += effectiveStat(stats.max_health, level);
  }
  return { damageBonus, armorBonus, maxHealthBonus };
}

module.exports = { effectiveStat, getEquippedStats, ENCHANT_BONUS_PER_LEVEL };
