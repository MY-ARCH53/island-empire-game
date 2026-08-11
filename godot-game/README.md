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

## Harita2 — hikaye tabanlı bölgeli dünya ("Kan Adası" gerçek bir ada oldu)

Önceki tek-tip rastgele dağıtım yerine, oyuncunun mesafesine göre değişen
biome'lar kullanan (araştırılmış, oyun endüstrisinde standart bir teknik —
bkz. sohbet geçmişindeki kaynaklar) **radyal bölgeleme** kullanılıyor.
Eski uniform harita `assets/tileset/graveyard_terrain.tres` /
`meadow_terrain.tres` ile hâlâ mevcut (git geçmişinde "harita1" commit'i
olarak da işaretli), ama `Game.tscn`/`game.gd` artık bu yeni tasarımı
kullanıyor:

```
merkez (0-220):     Kasaba   — oyuncu burada doğar, 5 ev + kuyu, çıplak patika
220-950:             Açık alan — asıl savaş alanı (ağaç/çiçek/göl/kaya)
950-~1100:            Sahil    — kum, dalgalı/gürültülü kıyı çizgisi (mükemmel
                                  daire değil — FastNoiseLite ile)
~1100+:                Deniz    — dünyanın sınırı, gerçek çarpışmalı (yüzülemez)
```

- **Zemin boyama** (`game.gd → _grass_envelope`): çim olasılığı merkezde 0
  (çıplak patika/kasaba), tarlanın ortasında (500 birim) 1'e çıkıyor, sahile
  yaklaşırken tekrar 0'a düşüyor (kum rengiyle aynı krem/toprak tonuna
  yumuşakça geçsin diye — ayrı bir "kasaba" veya "sahil" tileset'i
  üretmeden, mevcut `meadow_terrain.tres`'in dirt/grass iki-terrain
  sistemini radyal bir zarfla modüle ederek).
- **Sahil/deniz** yeni bir katman: `GroundCoast` (`assets/tileset/coast_terrain.tres`,
  `coast_terrain_lookup.gd`) — kum(upper)/deniz(lower) Wang tileset'i,
  `game.gd → _paint_coast()` + `_coast_terrain_at()` ile FastNoiseLite
  tabanlı düzensiz bir kıyı çizgisi çiziyor (mükemmel daire olmasın diye).
- **Kasaba** (`game.gd → _spawn_village()`): merkez etrafında 120-190 birim
  yarıçapta 5 ev (`scenes/House.tscn`, 2 doku varyantı) + bir kuyu
  (`scenes/Well.tscn`) — hepsi gerçek engel (`tree.gd` script'i yeniden
  kullanılıyor, generic `set_texture()` sayesinde).
- **Dünya sınırı** (`game.gd → _spawn_world_boundary()`): kıyı çizgisi
  boyunca 64 görünmez `StaticBody2D` çarpışma segmenti — her biri
  `_find_shoreline_radius()` ile gerçek kum→deniz geçiş noktasını bularak
  yerleştiriliyor, böylece görünmez duvar görsel kıyı çizgisiyle tam
  örtüşüyor (bağımsız rastgele değer kullanmıyor). Düşman/boss spawn
  noktaları da artık orijine göre `FIELD_RADIUS` içinde kalacak şekilde
  kırpılıyor (`_random_spawn_position()`), sahile/denize taşmasın diye.
- Ağaç/dekorasyon/göl/kaya kümesi dağıtımı artık `_random_field_position()`
  üzerinden sadece "açık alan" halkasında (kasaba dışı, sahil öncesi)
  oluyor — eşit alan dağılımı için `sqrt(randf_range(min_r², max_r²))`
  tekniği kullanıldı (basit `randf_range(min_r, max_r)` merkeze yakın
  bölgeyi yoğunlaştırırdı).

Bölge yarıçaplarını ayarlamak istersen hepsi `game.gd`'nin başında:
`VILLAGE_RADIUS`, `FIELD_MID_RADIUS`, `FIELD_RADIUS`, `COAST_TAPER`,
`SHORE_BASE_RADIUS`, `SHORE_NOISE_AMPLITUDE`.

## Arayüz teması (menüler, HUD)

Tüm `Button`/`PanelContainer`/`ProgressBar`/`Label`/`LineEdit` görünümü tek
bir kaynaktan geliyor: `assets/ui/theme.tres`, `project.godot`'ta
`[gui] theme/custom` ile **proje genelinde** uygulanıyor — bu yüzden
MainMenu, HUD, LevelUpMenu, ShopScreen, GameOverScreen'in hepsi tek bir
değişiklikle yenilendi, sahne dosyalarına tek tek dokunmaya gerek kalmadı.

- Font: PixelLab `create_font` ile üretilen gerçek bir `.ttf`
  (`assets/ui/gothic_font.ttf`) — piksel-art görünümlü ama vektörel, her
  boyutta net.
- Panel/buton/bar çerçeveleri: PixelLab `create_ui_asset` ile üretildi.
  `create_ui_asset` tek çağrıda birden fazla varyant içeren bir sprite sheet
  döndürebiliyor (`gothic_window_sheet.png`) — Godot CLI/ImageMagick
  olmadığından, `tools/analyze_sheet.js` (alfa kanalına göre içerik
  bloklarını bulur) + `tools/crop_sheet.js` (pngjs ile kesin kırpma) ile
  ihtiyaç duyulan tek paneli çıkardım (`assets/ui/panel_window.png` vb.).
  Bu iki script'i yeni bir UI sheet için de kullanabilirsin — sadece
  `node analyze_sheet.js <dosya.png>` çalıştırıp bulduğu blok koordinatlarını
  `crop_sheet.js`'e ver.
- 9-slice marjları (`texture_margin_*` in `theme.tres`) gözle tahmin edildi
  (kesin ölçüm yapılmadı) — büyütülmüş bir panelde köşe süslemeleri hafif
  gerilmiş görünüyorsa marjı artır.
- **Dikkat — `texture_margin_*` dokunun boyutuna göre değil, EKRANDA
  gösterileceği boyuta göre seçilir**: Godot bu marjları ekran pikseli
  olarak birebir çizer (dokunun kendi çözünürlüğüyle orantılı ölçeklenmez).
  `panel_button.png` 312x152'ye büyütüldüğünde marj da (44/38) dokunun
  "oranına göre" büyütülmüştü — ama sahnedeki asıl butonlar hâlâ 48-64px
  yükseklikteydi, bu yüzden StyleBoxTexture'ın kendi minimum boyutu
  (marj toplamı) buton için istenen `custom_minimum_size`'ı ezip geçti;
  Dükkan ve Seviye Atlama menülerindeki butonlar aşırı büyüyüp sabit
  boyutlu `Panel` kutusunun dışına taştı ("ölçeklendirme hatası"). Düzeltme:
  marjlar en küçük buton yüksekliğine (48px) göre küçültüldü (20/16), ayrıca
  `ShopScreen`/`LevelUpMenu`'nun `Panel`'i artık sabit `offset` kutusu değil,
  bir `CenterContainer` içinde içeriğe göre kendiliğinden boyutlanıyor —
  böylece gelecekte içerik (öğe sayısı, buton boyutu) değişse bile taşma
  riski kalmıyor.
- Can/XP/boss barlarının dolgu rengi tema genelinde DEĞİL, her `ProgressBar`
  node'unda ayrı `theme_override_styles/fill` ile (`Game.tscn`) — kırmızı/
  altın/bordo ayrımı için.
- **Dikkat — `create_ui_asset` + `elements=["button"]`**: PixelLab bu
  parametreyle üretilen dokunun üzerine otomatik bir "Button" demo yazısı
  basıyor. Godot `StyleBoxTexture` olarak bu dokuyu `Button`'a arka plan
  yapınca, `Button.text` da üstüne render olduğundan çift/okunmaz yazı
  ortaya çıkıyor. Çözüm: `elements` parametresini hiç vermeden (boş panel
  iskeleti) ve açıklamaya "no text/letters/words/writing" ekleyerek
  üret, indirilen görseli kullanmadan önce mutlaka görsel olarak kontrol
  et (`panel_button.png` bu şekilde yeniden üretildi).
- HUD barları (`HealthBar`/`XPBar`) artık tüm genişliğe yayılan bir
  `Margin`/`VBox` içinde değil, sol üstte sabit `custom_minimum_size`'lı
  (~210px) kompakt bir `TopLeft` VBoxContainer içinde (`Game.tscn`).
  Boss barı ayrı, üst-ortada sabit boyutlu bir `BossPanel`'de. Bar arka
  planı da ornate `StyleBoxTexture` yerine sade `StyleBoxFlat`'e çevrildi
  (`theme.tres`) — küçük boyutlarda 9-slice süsleme dağılıyordu.

## Denge sabitleri (tune edilebilir)

- Silah/düşman/yükseltme verileri: `scripts/autoload/upgrades.gd`
- Zorluk eğrisi (spawn hızı, düşman havuzu, boss zamanlaması):
  `scripts/game.gd → _update_difficulty` (`BOSS_SPAWN_TIME` = 300sn)
- Ödül formülü, günlük/run tavanları, anti-hile sabitleri:
  `backend/src/controllers/minigame.controller.js`
- Kalıcı yükseltme fiyat/seviye tanımları:
  `backend/src/controllers/minigame.controller.js → UPGRADE_DEFS`
