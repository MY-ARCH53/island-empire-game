const { query } = require('../config/database');

const WEEKLY_REWARD = 50000;

async function runWeeklyReset() {
  try {
    // Son resetin üzerinden 7 gün geçti mi?
    const check = await query(
      "SELECT id FROM guilds WHERE last_weekly_reset < NOW() - INTERVAL '7 days' LIMIT 1"
    );
    if (check.rows.length === 0) return;

    console.log('[WeeklyGuild] Haftalık reset başlatılıyor...');

    // Bu haftanın kazananını bul
    const winner = await query(
      "SELECT id, name, weekly_stars FROM guilds WHERE weekly_stars > 0 ORDER BY weekly_stars DESC LIMIT 1"
    );

    if (winner.rows.length > 0) {
      const winnerGuild = winner.rows[0];
      console.log(`[WeeklyGuild] Kazanan: ${winnerGuild.name} (${winnerGuild.weekly_stars} yıldız)`);

      // Üyelere 50k altın ver
      const members = await query(
        "SELECT user_id FROM guild_members WHERE guild_id = $1",
        [winnerGuild.id]
      );

      for (const member of members.rows) {
        await query(
          "UPDATE resources SET amount = amount + $1 WHERE user_id = $2 AND resource_type = 'gold'",
          [WEEKLY_REWARD, member.user_id]
        ).catch(() => {});
      }

      console.log(`[WeeklyGuild] ${members.rows.length} üyeye ${WEEKLY_REWARD} altın verildi`);
    }

    // Tüm klanların haftalık yıldızını sıfırla
    await query("UPDATE guilds SET weekly_stars = 0, last_weekly_reset = NOW()");
    console.log('[WeeklyGuild] Haftalık yıldızlar sıfırlandı');
  } catch (error) {
    console.error('[WeeklyGuild] Worker hatası:', error.message);
  }
}

function startWorker() {
  // Her saat kontrol et
  setInterval(runWeeklyReset, 60 * 60 * 1000);
  runWeeklyReset();
  console.log('[WeeklyGuild] Haftalık ödül işçisi başlatıldı');
}

module.exports = { startWorker };
