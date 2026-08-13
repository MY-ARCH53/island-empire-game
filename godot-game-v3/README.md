# Kan Adası — Island Empire Mini Oyunu

> **v3 — aktif geliştirme.** `godot-game-v2/` taban alınarak oluşturuldu;
> bundan sonraki tüm yeni eklentiler (çok oyunculu "Kan Adası: Online" dahil,
> bkz. `C:\Users\musta\.claude\plans\humble-chasing-galaxy.md`) burada. v1
> ve v2 dondurulmuş referans noktaları olarak ayrı klasörlerde duruyor, elle
> senkronize edilmiyor. Ayrıca bkz. `../godot-server/` — çok oyunculu
> sunucu tarafı ayrı bir projede.

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
  Zincir Şimşek (sıçrayan hasar) — hepsi azami seviyede evrimleşebilir,
  bkz. [Silah evrimi](#silah-evrimi).
- **Düşmanlar**: Yarasa, İskelet, Hayalet, Vahşi, Kabus (hızlı sürü),
  Gulyabani (oyuncuya teleport eden) — ve oyuncu seviye 20'ye ulaşınca beliren boss
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
- **Takip düzeltmesi — Dükkan hâlâ taşıyordu**: ilk düzeltmeden sonra
  `ShopScreen/Center/Panel` sabit `custom_minimum_size.x = 520` idi, ama
  içindeki `Items` listesi 480px genişlik + panelin kendi 9-slice marjı
  (46+46=92px) = en az 572px gerektiriyordu. Aradaki fark yüzünden
  `ScrollContainer` yatayda da kaymaya başlıyor, "Satın Al" butonları
  panelin sağ kenarından taşıp kırpılıyordu. Bunu gözle tahmin yerine
  gerçek bir ekran görüntüsüyle doğruladım: `get_viewport().get_texture()
  .get_image().save_png(...)` çağıran geçici bir sahne/script ile Godot'u
  headless çalıştırıp PNG'yi okudum (Godot MCP'de screenshot aracı yok).
  Panel genişliği 580'e çıkarılınca sorun düzeldi; aynı yöntemle
  `LevelUpMenu`'nun da sorunsuz olduğu teyit edildi. Benzer bir "sahnede
  gerçekten nasıl görünüyor" belirsizliği olursa bu teknik tekrar
  kullanılabilir (geçici bir script ile ilgili ekranı aç, `await` ile
  birkaç frame bekle, `save_png`, sonra dosyayı Read ile görüntüle — işin
  sonunda geçici dosyaları sil).
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

## Silah evrimi

Klasik Vampire Survivors tarzı: bir silah **azami seviyeye** (Lv 8) ulaşıp
oyuncu eşleşen istatistik yükseltmesini **5 kez** seçtiğinde, silah otomatik
olarak evrimleşir — level-up menüsünde ayrı bir seçenek değil, koşullar
karşılanır karşılanmaz anında gerçekleşir (`player.gd → _check_evolutions`,
her `add_weapon`/`_apply_stat_upgrade` sonrası çağrılır). Eşleşmeler ve
evrim sonrası isim/açıklama `scripts/autoload/upgrades.gd → EVOLUTIONS`'ta:

| Silah | Gereken istatistik | Evrim |
|---|---|---|
| Büyü Cismi | Hasar ×5 | Arkan Yağmuru — 3'lü yayılan atış |
| Dönen Kılıçlar | Alan ×5 | Kan Girdabı — daha geniş, daha büyük kılıçlar |
| Nova Patlaması | Saldırı Hızı ×5 | Kıyamet Dalgası — çok daha sık patlama |
| Zehir Bulutu | Tecrübe ×5 | Veba Bulutu — daha geniş/uzun/güçlü alan |
| Zincir Şimşek | Toplama Menzili ×5 | Fırtına Zinciri — çok daha uzun zincir |

Evrimleşen silahlar aynı `weapon_id`'yi korur (`player.evolved_weapons`
sözlüğünde ayrı bir bayrak) — yeni bir silah ID'si icat edip
`_weapon_timers`/`owned_weapons` gibi mevcut altyapıyı çoğaltmak yerine, her
`_fire_*`/`_update_orbit_blades`/`_update_weapon_timer` fonksiyonu
`evolved_weapons.get(id, false)` kontrolüyle dallanıyor: hasar/alan/menzil
çarpanı artıyor, ateşleme hızı geneli %45 kısalıyor (`_update_weapon_timer`),
görsel olarak renk tonu değişiyor (mermi/orbit/nova/yıldırım/bulut). Yeni
PixelLab görseli üretilmedi — ayrım tamamen `modulate` rengi + ölçek ile
yapılıyor (bkz. Faz 0'daki asset bütçesi kısıtı).

Evrim anında `hud.gd → show_evolution()` ekranda 2 saniyelik altın bir
"⚔ SİLAH EVRİMİ: <isim> ⚔" pankartı gösterir + `Effects.spawn_burst` parçacık
patlaması + `camera_shake` + `boss_slam` sesi (normal level-up chime'ından
ayrışsın diye). Bu banner'ın tween'i `TWEEN_PAUSE_PROCESS` ile işaretli —
level-up menüsü açıkken (`get_tree().paused`) tetiklenirse bile donmuyor,
aynı `Effects.spawn_burst`'ün zaten kullandığı `PROCESS_MODE_ALWAYS` deseni.

**Doğrulama notu**: Bu özellik gerçek bir Godot koşusuyla test edildi —
geçici bir script ile oyuncunun tüm silahlarını azami seviyeye çıkarıp
ilgili istatistiği 5 kez uyguladım, `evolved_weapons` sözlüğünün gerçekten
`true` olduğunu `print()` ile doğruladım, sonra `get_viewport().get_texture()
.get_image().save_png(...)` ile ekran görüntüsü alıp evrim banner'ının ve
görsel farklılaşmanın (kırmızı büyük kılıçlar, üçlü büyü cismi atışı vb.)
gerçekten doğru render olduğunu gözle kontrol ettim. Script'ler işim
bitince silindi (kalıcı değiller).

## Karakterler (v2'de yeni)

Vampire Survivors'ın karakter sistemi araştırılıp (wiki üzerinden Antonio,
Imelda, Pasqualina, Gennaro, Suor Clerici, Krochi'nin gerçek sayıları
doğrulanarak) buraya uyarlandı: her karakterin **tek bir başlangıç silahı**
ve **seviyeye bağlı kademeli büyüyen tek bir imza pasifi** var — VS'teki
"sabit tek seferlik bonus değil, seviye eşiklerinde kümülatif büyüyen bonus"
deseni birebir. Veri `scripts/autoload/upgrades.gd → CHARACTERS`:

| Karakter | Başlangıç silahı | Pasif (Lv eşiği → kümülatif bonus) | Açılım |
|---|---|---|---|
| Köylü | Büyü Cismi | — (sabit: +30 can, +%5 hız) | Ücretsiz/varsayılan |
| Büyücü | Büyü Cismi | Hasar, Lv5-25 arası +%40'a kadar | 80 Kan Özü |
| Kılıç Ustası | Dönen Kılıçlar | Alan, Lv5-25 arası +%40'a kadar | 80 Kan Özü |
| Fırtına Rahibesi | Nova Patlaması | Saldırı Hızı, Lv5-25 arası +%30'a kadar | 100 Kan Özü |
| Vebalı | Zehir Bulutu | Tecrübe, Lv5-15 arası +%30'a kadar | 100 Kan Özü |
| Fırtına Avcısı | Zincir Şimşek | Toplama Menzili, Lv1'den +%10, Lv15'te +%40 | 120 Kan Özü |

**Kasıtlı tasarım kararı**: Her uzman karakterin pasifi, kendi silahının
evrimi için gereken istatistikle eşleşiyor (örn. Büyücü'nün Hasar pasifi,
Büyü Cismi'nin evrimi olan Arkan Yağmuru'nun gerektirdiği istatistikle
aynı) — ama bu pasif **evrim sayacına (`stat_levels`) katkı yapmıyor**,
sadece build'i güçlendirip o yöne teşvik ediyor. Oyuncu evrim için yine
level-up menüsünden bilinçli olarak 5 kez seçim yapmalı. Bu, kullanıcıyla
birlikte netleştirilmiş bir tasarım kararıydı (alternatifi: pasif de
sayaca katkı yapsın — daha ödüllendirici ama iki sistemi birbirine
bağlıyor).

- **Mimari**: `player.gd`'de `character_id`, `_character_tier_index`,
  `_check_character_passive()` (her seviye atlayışta bir sonraki eşiğe
  ulaşılıp ulaşılmadığını kontrol edip farkı ilgili çarpana ekler) ve
  `_apply_character_flat_bonuses()` (Köylü gibi kademesiz sabit bonuslar
  için). `_ready()`'deki eskiden sabit `add_weapon("magic_bolt")` artık
  seçili karaktere göre.
- **Ekran**: `scenes/CharacterSelect.tscn` yok — `MainMenu.tscn` içine
  `ShopScreen` ile birebir aynı iskelet (`CenterContainer`+`PanelContainer`+
  `ScrollContainer`) ile gömülü `CharacterSelect` CanvasLayer'ı,
  `scripts/character_select.gd`. MainMenu'de "🗡 Karakter Seç" butonu.
- **Ekonomi**: Kan Özü ile satın alma, mevcut Dükkan mimarisiyle aynı desen
  — `backend/src/controllers/minigame.controller.js → CHARACTER_DEFS` +
  `purchase-character`/`select-character` endpoint'leri, `minigame_progress`
  tablosuna `unlocked_characters` (jsonb) ve `selected_character` (text)
  kolonları eklendi (yerel `psql` ile — bu projede migration dosyası yerine
  doğrudan eklenen diğer tablo/kolonlarla aynı desen, prod'a deploy öncesi
  VPS'te de aynı `ALTER TABLE` çalıştırılmalı).
- **Ana menüde seçili karakter göstergesi**: `MainMenu.tscn`'de "Oyna"
  butonunun hemen üstünde küçük bir portre + isim satırı
  (`SelectedCharacterRow`) — oyuncu run başlamadan kim olduğunu görür.
  `main_menu.gd → _refresh_character_display()` `Upgrades.CHARACTERS`'tan
  ismi, seçili karakterin `sprite_frames`'inden `idle_south`'un ilk
  karesini (`SpriteFrames.get_frame_texture()`) portre olarak alır;
  `BackendBridge.progress_result`/`character_select_result`/
  `character_purchase_result` sinyallerine bağlı, karakter her
  değiştiğinde otomatik güncellenir.
- **Kilitli karakterler görsel olarak belli**: `character_select.gd →
  _add_row()` henüz satın alınmamış karakterlerin portresini koyu bir
  silüete karartıyor (`modulate = Color(0.10, 0.10, 0.10, 1)` — shader
  gerektirmeyen ucuz bir "kilitli" hissi) ve üzerine 🔒 emoji'sini
  bindiriyor. Önceden sadece buton metninden ("Satın Al (...)") anlaşılan
  kilitli durum artık portreden de anında görülüyor.
- **Test notu**: `godot-game-v2`'nin kendi `user://save.dat`'ı artık gerçek
  bir `test_v2` oturumu biriktirebiliyor (config/name izolasyonu doğru
  çalıştığı için — bkz. yukarıdaki "iki gerçek bug" notu). Bu, GameManager
  alanlarını elle set eden bir debug script'iyle test ederken kafa
  karıştırabilir: `main_menu.gd`'nin kendi otomatik `_ready()`'si, senin
  script'in `jwt_token`'ı boşaltmasından ÖNCE gerçek kayıtlı oturumla arka
  planda bir `get_progress()` isteği atıp az sonra sonucu uygulayabilir —
  ekranda beklenmedik (ama aslında doğru, gerçek hesap verisiyle tutarlı)
  değerler görülür. Temiz/deterministik bir test için önce
  `%APPDATA%\Godot\app_userdata\Kan Adasi v2\save.dat`'ı silmek gerekir.

**Test notu — iki gerçek bug bulundu ve düzeltildi bu özellik geliştirilirken**:
1. `godot-game-v2/project.godot`'un `config/name`'i başta v1 ile AYNIYDI
   ("Kan Adasi") — bu, Godot'un işletim sistemi düzeyindeki `user://`
   kayıt dizinini (dolayısıyla `save.dat`/JWT token'ı) v1 ile PAYLAŞMASINA
   yol açıyordu. Test sırasında arka planda gerçek bir eski oturumun sessizce
   yüklenip test verisini ezdiği keşfedildi (ekran görüntüsünde seçili
   karakter beklenenden farklı çıktı) — `config/name` "Kan Adasi v2" olarak
   değiştirildi, v1/v2 artık tamamen izole. Gelecekte üçüncü bir sürüm
   açılırsa aynı şekilde benzersiz bir isim vermek gerekir.
2. Karakter maliyeti gösterimi ("Satın Al (80)") ekran görüntüsünde "(00)"
   gibi görünüyordu — `print()` ile buton metninin gerçekte doğru
   ("Satın Al (80)") olduğu doğrulandı; bu bir kod hatası değil,
   `assets/ui/gothic_font.ttf`'in "8" rakamını bu boyutta neredeyse "0"a
   benzer çizmesinden kaynaklanan bir **font okunabilirlik sorunu** —
   mevcut Dükkan ekranındaki gelecekteki maliyetleri de etkileyebilir
   (şimdiye kadar "8" içeren bir fiyat hiç ekrana gelmemişti). Kapsam dışı
   bırakıldı, ayrı bir font/tipografi işi olarak not edildi.

### Karakter görselleri — her karakterin kendi "tipi"

Köylü dışındaki 5 karakterin her biri PixelLab `create_character` (standard
mode, 4 yön, 48px, `basic shading`/`single color black outline`/`medium
detail` — protagonist ile aynı varsayılan stil parametreleri) ile üretilmiş
kendi görseline sahip: Büyücü (kukuletalı mor cübbeli büyücü), Kılıç Ustası
(zırhlı, sırtında ikiz kılıçlı), Fırtına Rahibesi (fırtına enerjili rahibe),
Vebalı (veba doktoru maskeli, yeşil sisli), Fırtına Avcısı (zincirli, boynuz
başlıklı avcı). Köylü ayrı bir sprite değil — mevcut `protagonist.tres`'i
yeniden kullanıyor (varsayılan/en ucuz karakter, yeni sanat gerektirmedi).

- **Kapsam**: Görsel hem Karakter Seç ekranındaki önizlemede hem gerçek
  oyunda (o karakterle oynarken haritadaki avatar) kullanılıyor — kullanıcı
  bunu bilinçli olarak tercih etti (sadece önizleme değil).
- **"Dönen" önizleme**: `scripts/character_preview.gd` — her karakter
  satırındaki küçük görsel, güney→doğu→kuzey→(doğu'nun `flip_h` ile
  aynalanmış hâli = batı) arasında 0.9 saniyede bir yön değiştirip kendi
  etrafında döndüğü izlenimi veriyor. Ekstra animasyon üretimi gerektirmez,
  zaten var olan `idle_*` karelerini döngüye sokuyor. `character_select.gd
  → _add_row()` her satırda 72x72'lik bir `Control` içine bu script'li bir
  `AnimatedSprite2D` yerleştiriyor (Node2D'yi Control tabanlı bir
  container'da ortalamak için `position` doğrudan kutunun merkezine sabitleniyor).
- **Üretim akışı** (`tools/generate_spriteframes.js`'e eklendi, aynı
  protagonist/düşman deseni): `create_character` (temel 4 yön) →
  `animate_character(template_animation_id="walk", directions=[south,east,north])`
  (batı gerekmiyor, doğudan aynalanıyor, gereksiz üretim harcanmasın diye
  `directions` parametresiyle sınırlandı) → PixelLab `/download` endpoint'i
  ile `assets/characters/<isim>/character.zip` indirilip `extracted/`e
  açıldı (`Idle/rotations/*.png` + `Idle/animations/walking/<yön>/*.png` —
  tam olarak script'in beklediği yapı) → `node generate_spriteframes.js`
  ile `assets/sprites/char_<isim>.tres` üretildi. Karakter verisine
  (`upgrades.gd → CHARACTERS`) `sprite_path` alanı eklendi,
  `player.gd → _ready()` artık `$Visual.sprite_frames`'i seçili karaktere
  göre yüklüyor (`ResourceLoader.exists()` ile güvenli fallback —  sprite
  henüz üretilmemiş bir karakter seçiliyse eski görsele düşer, çökmez).
- **Dikkat — yeni PNG'ler eklendikten sonra Godot'un import cache'i
  gerekiyor**: `node generate_spriteframes.js` sadece dosyaları `res://`
  yapısına kopyalar, Godot'un onları `Texture2D` olarak tanıması için ayrı
  bir import adımı şart. `run_project` (F5 benzeri) ile projeyi açmak
  yetmeyebilir — script içindeki `load()` çağrıları sessizce boş/kırık
  kaynak döndürüp önizlemede karakter görünmez hale gelir. Çözüm: headless
  import'u elle çalıştır —
  `Godot_v4.3-stable_win64_console.exe --headless --path . --import`
  (yol `.mcp.json`'daki `GODOT_PATH`'te). Bunu her yeni sprite/texture
  ekleyişinde tekrarla.
- **PixelLab üretimi kararsız olabilir**: Aynı anda birden fazla
  `create_character`/`animate_character` çağrısı "Generation failed due to
  heavy load" ile başarısız olabiliyor (hesap başına ~8 eşzamanlı iş slotu
  sınırı var). Çözüm: seri (paralel değil) çağır, başarısız olanları
  `get_character()` ile kontrol edip tekrar dene — retry genelde çalışıyor.
  `animate_character`'a `directions=["south","east","north"]` vermek
  (varsayılan tüm yönler yerine) hem maliyeti hem başarısızlık yüzeyini
  azaltıyor (batı zaten kullanılmıyor).

## Kan Adası: Online — Faz 1 (kalıcı karakter + envanter)

Tam plan: `C:\Users\musta\.claude\plans\humble-chasing-galaxy.md`. Bu, run-
tabanlı roguelite'tan (yukarısı) **tamamen ayrı bir mod** — `MainMenu.tscn`'de
"⚔️ Online (Beta)" butonuyla açılıyor. Kalıcı karakter oluşturma + envanter/
ekipman görüntüleme + (aşağıya bkz.) gerçek multiplayer haritalarına giriş.

- **Sınıf = mevcut 6 karakter**: Ayrı bir sınıf sistemi icat edilmedi —
  `Upgrades.CHARACTERS` (Köylü/Büyücü/Kılıç Ustası/Fırtına Rahibesi/Vebalı/
  Fırtına Avcısı) burada da "sınıf" olarak kullanılıyor, görsel/dönen
  önizleme dahil (`character_preview.gd` yeniden kullanıldı). Online
  karakterler ücretsiz (roguelite'taki Kan Özü ekonomisiyle karışmıyor).
- **Backend**: `backend/src/controllers/online.controller.js` +
  `backend/src/routes/online.routes.js` (`/api/online/character` GET/POST,
  `/api/online/inventory` GET, `/api/online/equip`+`/unequip` POST) — mevcut
  `auth.middleware.js` (JWT) ile korunuyor, `minigame.routes.js` ile aynı
  desen (`router.use(auth)`).
- **DB** (yerel `psql` ile eklendi, prod'a deploy öncesi VPS'te aynı `CREATE
  TABLE`'lar çalıştırılmalı): `online_characters` (user_id PK, class_id,
  level, xp, silver, np), `item_defs` (statik eşya tanımları — id, name,
  slot, base_stats jsonb, rarity), `online_inventory`, `online_equipment`
  (slot başına tek eşya, `ON CONFLICT (user_id, slot) DO UPDATE` ile
  kuşanma değişimi). Test eşyaları `backend/scripts/seed_online_items.sql`
  ile tohumlandı (9 eşya: her slot için common/rare/epic).
- **Godot**: `scripts/online_hub.gd` (`MainMenu.tscn`'e gömülü
  `OnlineHub` CanvasLayer, `ShopScreen`/`CharacterSelect` ile aynı
  `CenterContainer`+`PanelContainer` iskeleti). İki durum: karakter yoksa
  sınıf seçimi listesi, varsa karakter bilgisi + kuşanılan eşya özeti +
  "Kuşan"/"Kuşanılı" butonlu envanter listesi (nadirliğe göre renkli:
  gri/mavi/mor).
- **Doğrulama**: Backend curl ile uçtan uca test edildi (karakter oluşturma,
  tekrar oluşturmayı reddetme, envanter listeleme, kuşanma/slot değişimi,
  çıkarma, başkasının eşyasını kuşanmayı reddetme). Godot tarafı hem
  senkron mock veriyle (iki durumun da doğru render olduğu ekran
  görüntüsüyle) hem de `test_v2` hesabıyla GERÇEK bir uçtan uca çalıştırmayla
  (gerçek giriş → gerçek HTTP → gerçek DB → geri UI) doğrulandı.

## Kan Adası: Online — gerçek multiplayer haritalarına giriş (oynanabilirlik)

Faz 2/3/4 (`../godot-server/`) sadece dedicated Godot sunucularını ve
saldırı/ödül/PvP mekaniklerini doğruladı — ama `godot-game-v3`'ün (gerçek
oyuncunun oynadığı proje) haritalara girecek bir yolu YOKTU, sadece benim
kendi headless test script'lerim `--token=` cmdline argümanıyla doğrudan
`godot-server`'a bağlanıyordu. Bu, Faz 5'e (sosyal katman) geçmeden önce
kapatıldı — sosyal özellikler oyuncunun asla giremeyeceği haritalara
eklenmiş olurdu.

**Ne eklendi**: `online_hub.gd`'deki karakter ekranına "🗡️ Farm Haritasına
Gir" / "⚔️ PvP Alanına Gir" butonları (`MainMenu.tscn → OnlineHub →
CharacterBox → MapButtonsRow`). Tıklanınca `get_tree().change_scene_to_file`
ile `OnlineFarmMap.tscn`/`OnlinePvpMap.tscn`'e geçiliyor — bunlar
`godot-server`'daki `Main.tscn`/`PvpMain.tscn`'in İSTEMCİ rolünün
(`main.gd`/`pvp_main.gd`'nin `_is_server=false` dalı) `godot-game-v3`'e
taşınmış hâli: `online_farm_client.gd`/`online_pvp_client.gd` +
kopyalanan `OnlineRemotePlayer.tscn`/`OnlineFarmEnemy.tscn`/
`OnlinePvpPlayer.tscn` sahneleri. Sunucu tarafı hiç kopyalanmadı (gerçek
oyuncunun makinesinde sunucu mantığı çalışmaz, sadece dedicated
`godot-server` sürecinde).

**İki yeni, önceden hiç karşılaşılmamış Godot multiplayer gotcha'sı
bulundu** (iki ayrı proje arasında client/server script'i bölünce ortaya
çıktı — `godot-server`'da script her zaman paylaşıldığı için hiç
görünmemişti):
1. **`rpc_id()` çağıran tarafta da RPC imzası ister**: İstemci
   `rpc_id(1, "submit_auth", token)` çağırdığında, Godot bu RPC'nin aktarım
   modunu (reliable/unreliable) belirlemek için ÇAĞIRAN düğümün KENDİ
   script'inde de `submit_auth` adında `@rpc` işaretli bir metot arıyor —
   sadece alıcı tarafta (sunucuda) tanımlı olması yetmiyor. Çözüm: istemci
   script'lerine boş gövdeli (`pass`) ama doğru `@rpc` imzalı stub'lar
   eklendi (`submit_auth`, `request_attack`, `request_pvp_attack`).
2. **MultiplayerSpawner'ın NodePath çözümlemesi kök düğüm ADINA bağlı**:
   `godot-server/scenes/Main.tscn`'in kök düğümü `"Main"` adında;
   `OnlineFarmMap.tscn`'i ilk yazdığımda kökü `"OnlineFarmMap"` yapmıştım
   — sonuç: "Node not found: Main/EnemySpawner" + spawn mesajları sessizce
   kayboluyordu (istemci hiçbir zaman diğer oyuncuları/düşmanları
   göremiyordu). Kök düğüm adının SUNUCUYLA BİREBİR AYNI olması şart
   (`"Main"`/`"PvpMain"`) — Godot'un yüksek seviye multiplayer API'si spawn
   bilgisini bu isme göre serialize ediyor.

**Sunucu adresi**: `_server_host()` editörde/debug build'de `127.0.0.1`,
gerçek (export edilmiş) build'de otomatik olarak prod'a — `islandsempire.com`
— bağlanır (`backend_bridge.gd → _api_base()` ile birebir aynı desen).
`FARM_SERVER_HOST`/`PVP_SERVER_HOST` ortam değişkenleriyle her zaman override
edilebilir (test için, editörden prod'a bağlanmak isterse).

**Prod deploy — TAMAMLANDI (2026-08-13)**: `godot-server`, `islandsempire.com`
VPS'ine (Hostinger, Ubuntu 22.04) deploy edildi. Godot 4.3.stable Linux
headless binary `/opt/godot/`'a kuruldu, iki PM2 süreci olarak sürekli
çalışıyor: `kanadasi-farm` (port 9050) ve `kanadasi-pvp` (port 9051) —
`island-empire-backend` ile aynı VPS'te, `pm2 save` ile reboot'ta da
otomatik başlayacak şekilde. Firewall'da (Hostinger paneli, Cloud Firewall)
bu iki port herkese (`Any` kaynak) açık. Eksik olan `online_characters`/
`item_defs`/`online_inventory`/`online_equipment` tabloları prod Postgres'e
eklendi + tohumlandı (diğer online-mod tabloları — `resource_transactions`,
`guilds`, `users.is_admin` vb. — zaten prod'da mevcuttu).

**Doğrulama** (2026-08-13, iki aşamalı):
1. Yerel: `test_v2` hesabıyla GERÇEK `godot-game-v3` istemcisi
   (`OnlineFarmMap.tscn`/`OnlinePvpMap.tscn`, benim test script'lerim
   DEĞİL) hem farm hem PvP sunucusuna bağlandı, kimlik doğruladı, spawn
   oldu, saldırdı — farm'da düşman öldürüp ödül aldı (DB'de doğrulandı),
   PvP'de `godot-server`'ın kendi test istemcisiyle (test_v3) karşılıklı
   savaşıp NP kazandı/kaybetti (DB'de doğrulandı).
2. Prod: gerçek VPS'te, gerçek internet üzerinden — geçici `deploytest_v2`/
   `deploytest_v3` hesaplarıyla önce sunucu içinden (loopback) farm+PvP
   test edildi, sonra bu makineden (Windows) `FARM_SERVER_HOST=
   islandsempire.com` ile GERÇEK `OnlineFarmMap.tscn`/`OnlinePvpMap.tscn`
   istemcileri dışarıdan bağlanıp kimlik doğruladı (VPS loglarında peer
   connect + AUTH_OK doğrulandı). Test sonrası her iki hesap tamamen
   silindi (cascade ile online_characters de temizlendi).

**Bilinen sınırlama**: Bağlantı hâlâ düz `ws://` (TLS yok) — masaüstü/
editör oynanabilirliği için sorun değil, ama web export'ta (tarayıcıda)
`https://` sayfadan `ws://` bağlantısı mixed-content olarak engellenir;
o zaman `wss://` + sertifika gerekir (ayrı, henüz yapılmamış bir iş).

## Gerçek karakter/düşman görselleri (2026-08-13)

Farm ve PvP haritalarındaki oyuncular/düşmanlar artık renkli
kare/dikdörtgen DEĞİL — roguelite'taki gibi gerçek PixelLab sprite'ları
kullanıyor (`Upgrades.CHARACTERS[class_id].sprite_path`,
`Upgrades.ENEMIES["bat"].sprite`), yönlü idle/walk animasyonuyla
(`scripts/directional_sprite.gd` — roguelite'ta zaten var olan script
aynen yeniden kullanıldı, yeni bir tane yazılmadı).

- **Spawn veri formatı değişti**: `spawner.spawn(peer_id)` → `spawner.spawn(
  {id, class_id})`, sunucu artık spawn anında sınıf bilgisini de gönderiyor
  (`godot-server/scripts/main.gd`/`pvp_main.gd` + buradaki
  `online_farm_client.gd`/`online_pvp_client.gd`'nin `_spawn_player`'ı
  `Dictionary` alacak şekilde güncellendi).
- **Uzak oyuncu animasyonu**: yetkisi olmayan (uzak) oyuncularda girişimiz
  yok — bir önceki kareyle pozisyon farkına bakıp yön/hareket tahmin
  ediyoruz (`online_remote_player.gd`/`online_pvp_player.gd → _process()`).
- **PvP'de "bu kim" netliği**: artık renkle değil, hafif bir `modulate`
  tonuyla — kendi karakterin altın, rakibinki kırmızımsı ton.
- **`godot-server`'ın KENDİ görselleri hâlâ basit** (kasıtlı, bkz.
  `godot-server/README.md`) — bu değişiklik SADECE `godot-game-v3`'te
  (gerçek oyuncunun gördüğü taraf). `godot-server`'ı doğrudan test
  script'i olarak çalıştırdığımda hâlâ renkli kareler görürüm, bu normal.
- **Doğrulama**: gerçek ekran görüntüleriyle (headless değil, gerçek
  pencere + `get_viewport().get_texture()`) hem farm'da (karakter +
  5 yarasa doğru render) hem PvP'de (iki farklı sınıfın karşılıklı doğru
  render olduğu, can barlarıyla) görsel olarak doğrulandı. Prod'a deploy
  edilip (`kanadasi-farm`/`kanadasi-pvp` PM2 restart) yeni spawn formatının
  gerçek Linux sunucusunda da hatasız çalıştığı geçici bir test hesabıyla
  onaylandı.

## Bölgeli farm haritası + kamera düzeltmesi (2026-08-13)

Farm haritası artık 4 iç içe halka bölgeye ayrılmış, çok daha büyük bir
dünya (0-1400 birim yarıçap) — detaylı tasarım `godot-server/README.md` →
"Bölgeli farm haritası" bölümünde (spawn/ödül mantığının hepsi sunucu
tarafında, burada sadece görüntüleme değişti: `online_farm_enemy.gd`
artık `is_elite` alanına göre Tier4 düşmanlarına kırmızımsı bir
`modulate` tonu uyguluyor).

**Bulunan ve düzeltilen kritik bug**: `OnlineFarmMap.tscn`'in
`Camera2D`'si harita kök düğümüne bağlıydı ve hiçbir zaman oyuncuyu takip
etmiyordu — eski küçük haritada fark edilmemişti, ama dünya
büyüyünce Tier2-4 (düşmanların %94'ü) oyuncuya tamamen görünmez kalırdı.
`online_farm_client.gd`'ye eklenen bir `_process()` artık her karede
kamerayı yerel oyuncunun pozisyonuna eşitliyor (oyuncu düğümü dinamik
spawn olduğundan doğrudan child yapılamıyor, elle senkronize ediliyor).
Bu, gerçek ekran görüntüsü doğrulaması sırasında yakalandı — kod
mantıken doğru görünüyordu ama görsel test olmasa fark edilmezdi.

## Denge sabitleri (tune edilebilir)

- Silah/düşman/yükseltme verileri: `scripts/autoload/upgrades.gd`
- Zorluk eğrisi (spawn hızı, düşman havuzu, boss zamanlaması):
  `scripts/game.gd → _update_difficulty` (`BOSS_SPAWN_LEVEL` = 20)
- Ödül formülü, günlük/run tavanları, anti-hile sabitleri:
  `backend/src/controllers/minigame.controller.js`
- Kalıcı yükseltme fiyat/seviye tanımları:
  `backend/src/controllers/minigame.controller.js → UPGRADE_DEFS`
