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

// Faz 5 — sosyal katman. Ayrı bir "online klan" sistemi icat edilmedi:
// ana oyunun mevcut guilds/guild_members tabloları doğrudan yeniden
// kullanılıyor (aynı klan = KO'daki krallık hissinin hafif bir karşılığı).
async function getGuildInfo(userId) {
  const result = await query(
    `SELECT g.id, g.name
     FROM guild_members gm
     JOIN guilds g ON g.id = gm.guild_id
     WHERE gm.user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  return { guildId: result.rows[0].id, guildName: result.rows[0].name };
}

module.exports = { effectiveStat, getEquippedStats, getGuildInfo, ENCHANT_BONUS_PER_LEVEL };
