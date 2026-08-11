# Kan Adası — Island Empire Mini Oyunu

Vampire Survivors tarzı, Godot 4.3 ile yazılmış bir "hayatta kal ve seviye
atla" mini oyunu. Island Empire'ın ana web sitesine gömülü oynanabilir, aynı
zamanda bağımsız olarak Android/iOS mağazalarına da yayınlanabilir.

## Açma

1. Godot 4.3'ü aç (Godot 5 kullanıyorsan da genelde sorunsuz açılır,
   `config/features` satırındaki `"4.3"` etiketini görmezden gelip günceller).
2. **Import** ile bu klasördeki (`godot-game/`) `project.godot` dosyasını seç.
3. F5 ile çalıştır — varsayılan sahne `MainMenu.tscn`.

## Yerel geliştirme kurulumu (backend + DB)

Oyun `localhost:3000`'deki yerel backend'e bağlanır (editörde F5 ile
çalıştırırken otomatik algılanır, bkz. `backend_bridge.gd → _api_base`).
Backend'i çalıştırmadan önce yerel Postgres'te şu tabloların var olduğundan
emin ol — **ikisi de `schema.sql`'de değil**, üretim veritabanına da elle
eklenmiş tablolar (bkz. proje hafızası "sonradan eklenen" tablolar):

```sql
CREATE TABLE IF NOT EXISTS resource_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  amount NUMERIC NOT NULL,
  source VARCHAR(50) NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_resource_transactions_user_source
  ON resource_transactions(user_id, source, created_at);

CREATE TABLE IF NOT EXISTS minigame_progress (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  blood_essence INTEGER DEFAULT 0,
  upgrades JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Bu tablolar eksikse anti-hile ve günlük limit kontrolleri sessizce devre
dışı kalır** (kod `.catch(() => ...)` ile veritabanı hatalarını yutuyor,
mevcut projenin genel deseni) — hata almazsın ama koruma da çalışmaz. Prod'a
deploy öncesi VPS'teki Postgres'te de aynı iki tablonun var olduğunu
doğrula (muhtemelen `resource_transactions` zaten vardır, `minigame_progress`
yeni — deploy'dan önce elle eklenmeli).

Backend'i başlat: `cd backend && node src/server.js`. Test için `test_user`
hesabı varsa onunla, yoksa `POST /api/auth/register` ile yeni hesap aç.

## Nasıl çalışıyor

- **Otomatik dövüş**: Karakter WASD/ok tuşları veya sol-alt köşedeki dokunmatik
  joystick ile hareket eder, silahlar otomatik ateş eder.
- **Görseller**: PixelLab ile üretilmiş gerçek piksel-art sprite'lar
  (`assets/sprites/`, `assets/icons/`, `assets/tileset/`) — protagonist ve
  tüm düşmanlar 3 yönlü (güney/doğu/kuzey) idle+yürüme animasyonlu,
  `scripts/directional_sprite.gd` batı yönünü doğudan otomatik aynalıyor.
  `scripts/simple_shape.gd` hâlâ hızlı prototipleme için mevcut ama sahnelerde
  kullanılmıyor. Yeni asset üretmek/güncellemek için `tools/generate_*.js`
  script'lerine bak (PixelLab indirmelerini `res://` yapısına dönüştürüyorlar).
- **Silahlar** (`scripts/autoload/upgrades.gd`): Büyü Cismi (mermi), Dönen
  Kılıçlar (orbit), Nova Patlaması (AoE pulse), Zehir Bulutu (DoT alan),
  Zincir Şimşek (sıçrayan hasar).
- **Düşmanlar**: Yarasa, İskelet, Hayalet, Vahşi, Kabus (hızlı sürü),
  Gulyabani (oyuncuya teleport eden) — ve 5. dakikada beliren boss
  **Kan Lordu** (telegraflı alan saldırısı, HUD'da can barı, ölünce garanti
  silah ödülü).
- **Seviye atlama**: XP topladıkça 3 (veya "Ekstra Seçenek Slotu" kalıcı
  yükseltmesi alınmışsa 4) rastgele seçenek sunulur, oyun bu sırada
  duraklatılır (`get_tree().paused`).
- **Oyun hissi**: Ekran sarsıntısı (`scripts/camera_shake.gd`), kritik anlarda
  hit-stop (`game.gd → _hit_stop`, `Engine.time_scale` ile), parçacık
  patlamaları (`scripts/autoload/effects.gd`), prosedürel üretilmiş ses
  efektleri (`scripts/autoload/audio_manager.gd`, `tools/generate_audio.js`
  ile üretildi — gerçek ses tasarımı değil, yer tutucu; `res://audio/*.wav`
  dosyalarını kendi seslerinle değiştirebilirsin).
- **Kan Özü meta-ilerlemesi**: Her run'da altının yanında ayrı bir "Kan Özü"
  para birimi kazanılır (ana ekonomiden bağımsız), ana menüdeki "🩸 Dükkan"
  butonundan kalıcı yükseltmeler satın alınır (azami can, hız, toplama
  menzili, ekstra seçenek slotu, şanslı başlangıç). Fiyat/seviye mantığı
  tamamen backend'de (`minigame.controller.js → UPGRADE_DEFS`) — Godot sadece
  sunucunun döndürdüğü listeyi gösterir.

## Backend entegrasyonu (ödül köprüsü)

- Oyun bitince (`game.gd → _on_player_died`) `BackendBridge.submit_run()` ile
  `POST /api/minigame/submit-run` çağrılır → `kills`, `level`,
  `survivalSeconds`, `score` gönderilir.
- Backend (`backend/src/controllers/minigame.controller.js`) sunucu tarafında
  makul sınırlar uygular:
  - Kill/saniye oranı düşman spawn hızının üstüne çıkamaz (bkz.
    `MAX_KILLS_PER_SECOND` yorumundaki türetme), aşımlar sessizce kırpılır.
  - Ardışık gönderim koruması **dinamik**: yeni submit, bildirilen
    `survivalSeconds` kadar (küçük bir ağ/menü payıyla) geriye gitmeden kabul
    edilmez — yani "300 saniye hayatta kaldım" diyen bir run, bir önceki
    gönderimden en az ~295 saniye sonra gelmek zorunda.
  - Run başına ve günlük altın tavanı (`PER_RUN_GOLD_CAP`,
    `DAILY_MINIGAME_GOLD_LIMIT`).
  - Tüm gönderimler `resource_transactions` tablosuna `source='minigame'`
    olarak loglanır — Admin2 sayfasındaki İşlem Defteri'nde görünür.
- **JWT nereden geliyor?**
  - **Web build**: Godot, `window.location.search`'teki `?token=...` parametresini
    okur (`game_manager.gd → _read_token_from_web`). React tarafı
    (`frontend/src/pages/MinigamePage.tsx`) `localStorage`'daki token'ı iframe
    URL'sine ekliyor — ayrı bir login ekranına gerek yok.
  - **Mobil/masaüstü build**: Web değilse `MainMenu.tscn` bir kullanıcı
    adı/şifre formu gösterir, `POST /api/auth/login` ile giriş yapılır, token
    `user://save.dat` içinde diskte saklanır (7 gün geçerli).
- API adresi: prod'da `https://api.islandsempire.com/api`, editörden (F5) veya
  `localhost`'tan açılan web build'lerde otomatik olarak
  `http://localhost:3000/api`'ye düşer (`backend_bridge.gd → _api_base`) —
  böylece test ederken yanlışlıkla prod hesaplarına yazılmaz.

## Web export → React sitesine gömme

1. Godot editöründe **Project → Export → Add → Web** ile bir export preset
   ekle (ilk seferinde eksik export template'leri indirmeni isteyecek —
   Editor → Manage Export Templates).
2. Export dizini olarak repo kökünden
   `frontend/public/minigame/index.html` seç ve **Export Project**'e bas.
   (Bu, `index.html`, `.wasm`, `.pck`, `.js` dosyalarını `frontend/public/minigame/`
   altına üretir — repodaki `public/game/` klasörüyle aynı desen.)
3. `frontend/src/pages/MinigamePage.tsx` ve `/minigame` route'u (`App.tsx`)
   zaten hazır; `npm run build` sonrası site `/minigame` sayfasında oyunu
   iframe içinde gösterir. Ana sayfadaki nav'a "🧛 Kan Adası" butonu eklendi.
4. Yerel test: `npm run dev` ile frontend'i, `node backend/src/server.js` ile
   backend'i ayağa kaldırıp `/minigame` sayfasını aç — export edilen dosyalar
   `frontend/public/minigame/` altındaysa Vite onları olduğu gibi serve eder.

## Mobil export (Android / iOS)

Uygulama ikonu ve açılış ekranı hazır (`assets/branding/app_icon.png`,
`project.godot → [application] boot_splash/*`) — export presetlerinde ayrıca
ikon seçmene gerek yok, Godot proje ikonunu otomatik kullanır (Android'de
`Options → Launcher Icons` altında yine de PNG'yi manuel atamak gerekebilir,
export diyaloğunda göreceksin).

Export template'leri ve imzalama bilgileri (keystore, bundle ID, sertifika)
makineye özel olduğundan bunlar repoya gömülmedi; adımlar:

1. **Android**: Project → Export → Add → Android. Godot Editor Ayarları
   (Editor → Editor Settings → Export → Android) içinden Android SDK / debug
   keystore yolunu ayarla. Package adı olarak örn.
   `com.islandsempire.kanadasi` gir. Launcher Icon alanına
   `assets/branding/app_icon.png` seç. **Export Project** ile `.apk`/`.aab` üret.
   Google Play'e yüklemeden önce release keystore ile imzala.
2. **iOS**: Project → Export → Add → iOS. Xcode kurulu bir Mac gerekir —
   Godot bir Xcode projesi üretir, onu Xcode'da açıp Apple Developer hesabınla
   imzalayıp App Store Connect'e yüklersin.
3. Her iki platformda da `MainMenu.tscn`'deki giriş formu kullanılacak
   (web'deki gibi otomatik token yok) — kullanıcı Island Empire hesabıyla
   giriş yapar, token diskte saklanır.
4. İzinler: internet erişimi (backend çağrıları için) gerekli — Android
   export ayarlarında "Internet" izni varsayılan olarak açık gelir.

## Mağaza listeleme metni (taslak)

**Başlık:** Kan Adası — Vampire Survivors Mini Oyunu

**Kısa açıklama:**
Mezarlıkta hayatta kal, canavar dalgalarını otomatik silahlarla biç, seviye
atla, Kan Lordu'yla yüzleş. Island Empire hesabınla oyna, kazandığın altın
ana oyuna aktarılır.

**Özellik maddeleri:**
- 5 farklı otomatik silah, onlarca yükseltme kombinasyonu
- 6 düşman tipi + telegraflı saldırılı boss savaşı
- Kazandığın altın doğrudan Island Empire hesabına işleniyor
- Kan Özü ile kalıcı yükseltmeler satın al, her run'da daha güçlü başla
- Web'de anında oyna, ister mağazadan indir — aynı hesap, aynı ilerleme

*(Bu taslak metin; gerçek mağaza girişi öncesi ekran görüntüleri ve son
düzenlemeler eklenmeli.)*

## Test / doğrulama araçları

Bu proje Godot MCP sunucusuyla (varsa) doğrudan test edilebilir:
`mcp__godot__run_project` + `mcp__godot__get_debug_output` ile oyunu
başlatıp hata çıktısını canlı izleyebilirsin. Yeni PNG/WAV asset eklediysen
önce headless import gerekir, yoksa "No loader found for resource" hatası
alırsın:

```
"<Godot kurulum yolu>/godot.cmd" --headless --path . --import
```

## Zemin dokusu (tileset) nasıl çalışıyor

`Ground` (`TileMapLayer`) elle üretilmiş bir Wang tileset kullanıyor
(`assets/tileset/meadow_terrain.tres` — krem toprak/yeşil çim, eski gotik
mezarlık teması `graveyard_terrain.tres` olarak hâlâ duruyor, istenirse geri
dönülebilir). **Önemli:** Godot'un yerleşik `TileMapLayer.set_cells_terrain_connect()`
otomatik döşeme fonksiyonu, PixelLab çıktısından elle dönüştürülmüş bu
kaynakla sessizce hiç tile yerleştirmiyor (test edildi: `get_used_cells()`
her zaman 0 dönüyor, hata da vermiyor). Bu yüzden `game.gd → _paint_ground()`
kendi köşe (Wang) eşleştirmesini yapıp doğrudan `set_cell()` çağırıyor —
her hücrenin 4 köşesini (`vertices` sözlüğü) hesaplayıp
`assets/tileset/meadow_terrain_lookup.gd` içindeki hazır tabloya bakarak
doğru atlas karesini seçiyor. Bu lookup dosyası `tools/generate_tileset.js`
tarafından `.tres` ile birlikte otomatik üretilir — yeni bir tileset
üretirsen script'i tekrar çalıştırman yeterli, elle dokunmana gerek yok.
Eğer ileride gerçek `set_cells_terrain_connect()`'i çalıştırmayı denersen,
`get_used_cells().size()` ile doğrula — sessizce 0 hücre boyarsa aynı soruna
düşmüşsündür.

### Zemin çeşitliliği (tekrar hissini kırma)

Araştırmaya dayanarak (bkz. sohbet geçmişi): düz tek tip tekrar eden zemin
yerine tekrarı kıran iki katman eklendi:

- **`GroundDecor`** (Ground ile World arasında, y-sort'suz bir katman):
  `game.gd → _spawn_decorations()` haritaya 180 adet çiçek/çim
  demeti/çakıl/çalı sprite'ı (`assets/props/flowers.png`,
  `grass_tuft.png`, `pebbles.png`, `bush.png`) rastgele serpiştirir. Katman
  Ground'dan sonra World'den önce eklendiği için dekorasyonlar zeminin
  üstünde ama oyuncu/düşmanların hep altında görünür — gerçek bir engel
  değil, sadece görsel doku.
- **Çim yamaları artık düzgün dikdörtgen değil** — `_paint_ground()` her
  yamayı üst üste binen 3-5 küçük "blob"tan oluşturuyor, daha organik/
  düzensiz kümeler için.
- **2 ağaç türü** (`tree_oak.png`, `tree_pine.png`) rastgele karışık
  yerleştiriliyor, tek tip ağacın tekrar hissini azaltıyor.

Daha fazla çeşitlilik istersen: `DecorationTextures`/`TreeTextures`
dizilerine yeni sprite ekleyip `DECORATION_COUNT`/`TREE_COUNT`'u ayarlaman
yeterli — hepsi `game.gd`'nin başında.

**İkinci iyileştirme turu** (kullanıcı geri bildirimi sonrası):
- Zemin dokusu "detailed shading" + "highly detailed" ile yeniden üretildi
  (`assets/tileset/meadow_tileset_image.png`) — hem toprakta hem çimde artık
  görünür tanecik/yaprak dokusu var, ilk sürüm çok düzdü.
- **Göl** (`scenes/Pond.tscn`, elips `CollisionPolygon2D` ile gerçek engel)
  ve **kaya kümesi** (`scenes/RockCluster.tscn`, büyük/küçük 2 varyant) gibi
  seyrek, büyük peyzaj öğeleri eklendi — `game.gd → _spawn_landmarks()`
  haritaya 4 göl + 12 kaya kümesi yerleştirir, birbirinden en az
  `LANDMARK_MIN_SPACING` (260 birim) uzakta olacak şekilde.

## Denge sabitleri (tune edilebilir)

- Silah/düşman/yükseltme verileri: `scripts/autoload/upgrades.gd`
- Zorluk eğrisi (spawn hızı, düşman havuzu, boss zamanlaması):
  `scripts/game.gd → _update_difficulty` (`BOSS_SPAWN_TIME` = 300sn)
- Ödül formülü, günlük/run tavanları, anti-hile sabitleri:
  `backend/src/controllers/minigame.controller.js`
- Kalıcı yükseltme fiyat/seviye tanımları:
  `backend/src/controllers/minigame.controller.js → UPGRADE_DEFS`
