const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'island_empire',
  password: process.env.DB_PASSWORD || 'sum123',
  port: parseInt(process.env.DB_PORT || '5432'),
});

const usernames = [
  'HancerHukumdari','YildizUstasi','GunesTufani','SafakKartali','KaraGemisi',
  'AltinSeferi','AltinYildizi','PazarTuccari','AslanKartali','KartalBeyi',
  'HanReisi','GokYildizi','GokCagrisi','TicaretKalesi','KalkanKaan',
  'SavasKartali','YildizFatihi','KaraFatihi','KurtEfendisi','AltinKaan',
  'KurtBeyi','MaviAkini','GunesKomutan','DogaFatihi','KutluKurdu',
  'GunesBeyi','HancerEfendisi','HancerOkcusu','PazarHan','SafakAslani',
  'MaviNizami','OzanSeferi','AslanBeyi','LoncaNizami','OrduTuccari',
  'BeyKervani','GunesKurdu','ToprakYolcusu','UluFatihi','AyHan',
  'GunesAtlisi','CelikFatihi','KorYuruyusu','YamanTufani','ToprakAkini',
  'YelBeyi','YamanLoncasi','DenizReisi','AkAtlisi','SavasKervani',
  'AslanAslani','KaraTuccari','OzanKaan','YamanOkcusu','YamanKalesi',
  'YamanSeferi','DenizSancagi','SavasOkcusu','AkEfendisi','OzanYolcusu',
  'CelikAtlisi','LoncaKartali','KaraOkcusu','CelikYolcusu','AtesReisi',
  'AkUstasi','GokKaan','TicaretAslani','UluYuruyusu','LoncaLoncasi',
  'AtesAtlisi','KorFatihi','BozkirUstasi','AkFatihi','GeceSancagi',
  'SavasSeferi','UluMuhafizi','ToprakTuccari','HancerKalesi','SafakTufani',
  'CelikKalesi','PazarBeyi','BozkirEfendisi','FirtinaReisi','MaviKervani',
  'KutluNizami','KorCagrisi','DemirReisi','SavasAkini','KizilSeferi',
  'KartalKomutan','CelikCagrisi','KaraHan','SafakOkcusu','PazarNizami',
  'SafakKalesi','MaviMuhafizi','UluHan','TicaretLoncasi','YelKaan',
  'GolgeNizami','KizilHan','TicaretEfendisi','CelikSancagi','GokSancagi',
  'ToprakEfendisi','YamanKaan','HanHukumdari','DemirYildizi','GokBeyi',
  'GolgeHan','AtesHan','LoncaAtlisi','YildizAslani','KaleReisi',
  'PazarHukumdari','OrduKomutan','CelikGozcusu','OrduKervani','AkKalesi',
  'KizilKartali','AtesAslani','TicaretBeyi','UluKurdu','KurtOkcusu',
  'YelLoncasi','KurtHukumdari','GolgeSancagi','AslanLoncasi','YildizGemisi',
  'MaviYolcusu','SafakTuccari','KorGemisi','GeceAtlisi','KaraGozcusu',
  'OzanUstasi','DogaReisi','DogaGemisi','MaviOkcusu','KalkanSeferi',
  'DemirKalesi','DemirMuhafizi','DemirKomutan','GunesYuruyusu','UluLoncasi',
  'OrduBeyi','UluAtlisi','YelKalesi','YamanReisi','FirtinaGemisi',
  'PazarKomutan','YildizEfendisi','KartalKervani','DogaKalesi','AltinGemisi',
  'SavasReisi','LoncaOkcusu','TacFatihi','TacAtlisi','KurtYuruyusu',
  'BeyKaan','AslanHukumdari','TicaretGozcusu','AtesTuccari','DenizGozcusu',
  'DemirAslani','YildizKaan','DemirUstasi','KaraYildizi','AslanYuruyusu',
  'LoncaTuccari','KaraNizami','MaviLoncasi','DenizTufani','DemirOkcusu',
  'HancerYuruyusu','TicaretKomutan','AyGemisi','AltinHukumdari','CelikKomutan',
  'AstraOutrider','QuarryRanger','SilverSage','ObsidianCardinal','CrimsonLionheart',
  'WinterQuill','EmeraldWave','HarvestMarket','GeoZerq77','VortexKeystone',
  'RadiantTurbine','GeoZerqPort','HarvestHarbor','MidnightSurveyor','WindWildcat',
  'EmeraldMatrix','HarvestWar','RogueCrusader','IronLattice','HarvestCitadel',
  'QuantumCreek','CrystalCardinal','SunsetWildcat','BambooSaffron','BrightWolfsong',
  'SilverGalleon','SwiftGuardian','HarvestOath','MidnightStarlight','WildTurbine',
  'GeoZerqHold','BrightObelisk','ShiverBrigade','SolarWildcat','SiegeFrontier',
  'SummitJavelin','BrassNomad','FeralPathfinder','ArcticOutrider','GeoMoWBay',
  'FrostWolfsong','SiegeHarbor','DapperLotus','MistralVoyager','RustWarden',
  'EmeraldArrow','GildedKeystone','GeoMoWCore','SiegeDominion','WildOrchard',
  'HarvestArena','MistralKeystone','MistralRelic','SiegeCitadel','EmberVoyager',
  'GeoZerqVII','AmberWildcat','RadiantRanger','IronInk','ShiverGolem',
  'IronSailor','GeoZerqForge','SilverSurveyor','HarvestSiege','SkyCardinal',
  'CrystalComet','BrassForge','WispRook','GeoMoWKeep','HazyBolt',
  'IronNautilus','RogueGlider','CrystalAtlas','GeoMoWOps','SkySpire',
  'MagmaNebula','CobaltGalleon','BlazingGalleon','BlazingKeystone','MapleSparrow',
  'CrystalGlider','EmeraldAnvil','NobleSummoner','NeonCrusader','QuantumObelisk',
  'TidalKeystone','GeoZerqCore','NeonWasp','VelvetDagger','EmberGuardian',
  'HarvestFrontier','GeoZerq99','SiegeVoyage','VelvetReef','RogueLotus',
  'RadiantLotus','WindVanguard','WinterShard','HarvestSupply','DriftComet',
  'ArcticLynx','GoldenEagle','CinderKite','HarvestGuild','SkyRook',
  'HarborFox','MaplePioneer','WindSparrow','GeoZerqCity','IronOwl',
  'JadeOutrider','VortexKraken','DuskyLotus','PearlJavelin','DriftBluff',
  'SummitStarlight','HarborShard','DapperTundra','HazyTempest','GeoZerqVault',
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  const passwordHash = await bcrypt.hash('Island2024!', 10);
  let added = 0;
  let skipped = 0;

  console.log(`Toplam ${usernames.length} kullanıcı eklenecek...`);

  for (const username of usernames) {
    const email = `${username.toLowerCase()}@islandsempire.com`;
    const level = rand(1, 15);

    try {
      // Kullanıcıyı ekle
      const userRes = await pool.query(
        `INSERT INTO users (username, email, password_hash, level, is_active, is_bot)
         VALUES ($1, $2, $3, $4, TRUE, FALSE)
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        [username, email, passwordHash, level]
      );

      let userId;
      if (userRes.rowCount === 0) {
        // Kullanıcı zaten var, id'yi çek (kaynaklar eksik olabilir)
        const existing = await pool.query(`SELECT id FROM users WHERE username = $1`, [username]);
        if (existing.rowCount === 0) { skipped++; continue; }
        userId = existing.rows[0].id;
      } else {
        userId = userRes.rows[0].id;
      }

      // Ordu ekle — level'a göre güç
      // Gerçek oyun güç değerleri: archer=3, infantry=2, cavalry=5
      const unitBase = level * rand(5, 20);
      const archerRatio  = rand(20, 40) / 100;
      const infantryRatio = rand(30, 50) / 100;
      const cavalryRatio  = 1 - archerRatio - infantryRatio;

      const archer   = Math.max(1, Math.floor(unitBase * archerRatio));
      const infantry = Math.max(1, Math.floor(unitBase * infantryRatio));
      const cavalry  = Math.max(1, Math.floor(unitBase * cavalryRatio));
      const totalPower = archer * 3 + infantry * 2 + cavalry * 5;

      await pool.query(
        `INSERT INTO armies (user_id, archer_count, infantry_count, cavalry_count, total_power)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, archer, infantry, cavalry, totalPower]
      );

      // Kaynaklar ekle (resource_type satır bazlı)
      const gold = rand(500, 8000);
      const wood = rand(300, 5000);
      const food = rand(400, 6000);

      await pool.query(
        `INSERT INTO resources (user_id, resource_type, amount)
         VALUES ($1, 'gold', $2), ($1, 'wood', $3), ($1, 'food', $4)
         ON CONFLICT (user_id, resource_type) DO NOTHING`,
        [userId, gold, wood, food]
      );

      console.log(`  EKLENDI: ${username} (id:${userId}, lvl:${level}, güç:${totalPower})`);
      added++;

    } catch (err) {
      console.error(`  HATA: ${username} — ${err.message}`);
    }
  }

  console.log(`\nTamamlandi: ${added} eklendi, ${skipped} atlandı.`);
  await pool.end();
}

seed().catch(err => {
  console.error('Script hatasi:', err);
  process.exit(1);
});
