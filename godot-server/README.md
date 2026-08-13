# Kan Adası: Online — Sunucu (Faz 0 + Faz 2 + Faz 3 + Faz 4 + Faz 5 + Faz 6)

Bu, "Kan Adası: Online" çok oyunculu genişlemesinin (bkz. plan:
`C:\Users\musta\.claude\plans\humble-chasing-galaxy.md`) **headless Godot
sunucusu**. Kalıcı karakter/envanter verisi Faz 1'de `godot-game-v3` +
Node backend'e eklendi (bu proje sadece gerçek zamanlı simülasyon
otoritesi — bkz. planın "Veri sorumluluk ayrımı" bölümü).

**Durum**: Faz 0 ✅ + Faz 2 ✅ + Faz 3 ✅ (2026-08-12) — sunucu-otoriter
PvE farm döngüsü VE PvP savaş alanı uçtan uca çalışıyor. PvE: gerçek bir
hesapla (JWT) bağlan → kimlik doğrula → düşman öldür → sunucu ödülü
hesaplayıp Postgres'e yazar → istemciye bildirim gelir (`test_v2` ile
doğrulandı, ekran görüntüsü + veritabanı satırı eşleşmesiyle). PvP: iki
gerçek hesap (`test_v2`, `test_v3`) aynı anda bağlanıp birbirini öldürdü,
NP kazanım/kayıp matematiği Postgres'te satır satır doğrulandı (bkz.
"PvP haritası" bölümü).

## Görseller kasıtlı olarak basit (SADECE bu projede — bkz. not)

Bu projedeki (`godot-server`) oyuncular ve düşmanlar hâlâ renkli
kareler — gerçek karakter sprite'ları DEĞİL. Bu bilinçli bir kapsam
kararı: önce ağ/oynanış mekaniğinin (kimlik doğrulama, senkronizasyon,
saldırı doğrulama, ödül yazımı) doğru çalıştığını kanıtlamak, görsel
entegrasyonu ayrı bir geçişe bırakmak (tıpkı projenin en başında
`simple_shape.gd` ile başlayıp sonra gerçek PixelLab sanatına geçmesi gibi).

**Not (2026-08-13)**: Gerçek oyuncunun kullandığı taraf (`godot-game-v3`)
artık gerçek karakter/düşman sprite'ları kullanıyor — bkz.
`godot-game-v3/README.md` → "Gerçek karakter/düşman görselleri" bölümü.
`godot-server`'ın kendi görselleri kasıtlı olarak basit kaldı çünkü bu
proje sadece dedicated sunucu + benim test client'ım için var, gerçek
oyuncular hiç görmüyor.

## Nasıl çalışır

`scripts/main.gd` hem sunucu hem istemci rolünde çalışan TEK bir script
(bkz. Faz 0 notu — `MultiplayerSpawner` yapılandırması tüm eşlerde aynı
sahne ağacında olmalı, bu yüzden `--server` bayrağıyla rol seçiliyor).

- **Kimlik doğrulama**: İstemci bağlanınca kendi JWT'sini
  `submit_auth(token)` RPC'siyle sunucuya gönderir. Sunucu bunu Node
  backend'in `/api/internal/authenticate` endpoint'ine sorar (paylaşılan
  `INTERNAL_SERVER_SECRET` ile korunuyor — kullanıcı JWT'si değil, sadece
  bu sunucunun bildiği bir sır). Geçerliyse ve bir online karakteri varsa
  oyuncu spawn edilir; yoksa istemciye "önce karakter oluştur" mesajı
  gönderilir (Faz 1'deki `godot-game-v3` Online hub'ı kullanılmalı).
- **Düşmanlar** (`FarmEnemy.tscn`/`farm_enemy.gd`): sabit duruyorlar (v1
  kasıtlı sadeleştirme, AI/dolaşma sonraki bir geçiş), `EnemySpawner`
  (`_spawnable_scenes` listesiyle otomatik replikasyon — `PlayerSpawner`'dan
  farklı olarak özel bir `spawn_function` gerekmiyor, sunucu sadece
  `add_child()` eder, Godot geri kalanını hallediyor).
- **Saldırı**: İstemci SPACE'e basınca en yakın düşmanı bulur, sunucudan
  `request_attack(enemy_name)` RPC'siyle doğrulama ister. Sunucu menzil
  (`ATTACK_RANGE`) + bekleme süresini (`ATTACK_COOLDOWN`) kontrol edip
  hasarı SADECE kendi tarafında uygular — istemci hasar miktarına asla
  karar vermiyor (hile yüzeyini daraltan asıl tasarım kararı, bkz. plan).
- **Ödül**: Düşman ölünce sunucu gümüş/tecrübe hesaplayıp (+ şansa bağlı
  eşya düşürüp) `/api/internal/reward-kill`'e yazar, sonucu öldüren
  istemciye `reward_notification` RPC'siyle bildirir, düşmanı `RESPAWN_DELAY`
  sonra yeniden spawn eder.

## Çalıştırma

Ortam değişkenleri (backend `.env`'deki `INTERNAL_SERVER_SECRET` ile
aynı olmalı):
```
INTERNAL_SERVER_SECRET=<backend/.env'deki değer>
NODE_API_BASE=http://localhost:3000/api   # opsiyonel, varsayılan zaten bu
```

Sunucu (headless):
```
INTERNAL_SERVER_SECRET=... Godot_v4.3-stable_win64_console.exe --headless --path . --server
```

İstemci (WASD hareket, SPACE saldırı — gerçek bir Island Empire hesabının
JWT'si gerekli, `curl .../api/auth/login` ile alınabilir):
```
Godot_v4.3-stable_win64_console.exe --path . --token=<JWT>
```

Otomatik doğrulama modu (kimlik doğrulanınca en yakın düşmana birkaç kez
saldırıp ekran görüntüsü kaydeder — `res://farm_test_client_<id>.png`):
```
Godot_v4.3-stable_win64_console.exe --path . --token=<JWT> --auto-attack
```

## PvP haritası (Faz 3)

Farm haritasından (`Main.tscn`/`main.gd`, port 9050) kasıtlı olarak ayrı
bir sahne + script + port: `PvpMain.tscn`/`pvp_main.gd` (port 9051).
Ayrımın nedeni: farm haritasında oyuncular arası hasar HİÇ istenmiyor —
tek script'te birleştirmek yanlışlıkla PvP'yi PvE haritasına sızdırma
riski taşırdı.

- **Oyuncu**: `PvpPlayer.tscn`/`pvp_player.gd` — `RemotePlayer`'dan ayrı,
  çünkü sadece burada bir `health` kavramı var.
- **Kimlik doğrulama**: farm ile birebir aynı desen (`submit_auth` →
  `/api/internal/authenticate` → `auth_result`).
- **Saldırı**: SPACE'e basınca en yakın DİĞER oyuncuyu bulup
  `request_pvp_attack(target_name)` RPC'siyle sunucudan doğrulama ister.
  Sunucu menzil + bekleme süresini kontrol edip hasarı SADECE kendi
  tarafında uygular (farm'daki `request_attack` ile aynı ilke).
- **Kritik gotcha — can SUNUCU otoriter olmalı**: `PvpPlayer`'ın
  `position`'ı istemci-otoriter (hareket akıcı olsun diye — spawn eden
  eş `set_multiplayer_authority(id)` alır), ama `MultiplayerSynchronizer`
  bir düğümün TÜM senkronize özellikleri için TEK bir otorite kullanır.
  `health`'i de aynı senkronizatöre koyarsak, hedefin kendi istemcisindeki
  DEĞİŞMEMİŞ `health=100` değeri her senkronizasyon turunda sunucunun az
  önce uyguladığı hasarı EZER (test sırasında canlı olarak yakalandı: can
  hep 80'de "sıkışıp" kalıyordu, hiç 0'a inmiyordu). Çözüm: `health`,
  `PvpPlayer.tscn`'in `SceneReplicationConfig`'inden TAMAMEN çıkarıldı;
  bunun yerine sunucu her değişiklikte `health_update` RPC'siyle tüm
  eşlere açıkça yayın yapıyor (`pvp_main.gd → _broadcast_health`).
- **Ölüm + NP**: can ≤ 0 olunca sunucu `/api/internal/pvp-kill`'e
  `{killerUserId, victimUserId}` yazar (katil +50 NP, kurban −50 NP,
  0'ın altına inmez), sonucu her iki oyuncuya da `pvp_kill_notification`
  RPC'siyle bildirir, kurbanı rastgele bir noktada tam canla yeniden
  doğurur.
- **Liderlik tablosu**: `GET /api/online/leaderboard` — NP > 0 olan
  karakterler, NP'ye göre azalan sırayla (ilk 20).

Çalıştırma (farm ile aynı desen, sadece sahne + port farklı):
```
INTERNAL_SERVER_SECRET=... Godot_v4.3-stable_win64_console.exe --headless --path . scenes/PvpMain.tscn --server
Godot_v4.3-stable_win64_console.exe --path . scenes/PvpMain.tscn --token=<JWT>
```

**Doğrulama** (2026-08-12): `test_v2` (user 18) ve `test_v3` (user 19)
hesaplarıyla iki gerçek istemci eşzamanlı bağlandı, `--auto-attack` ile
karşılıklı birbirini öldürdü. Sunucu logu + `GET /api/online/character`
+ `GET /api/online/leaderboard` üçü de aynı sonucu doğruladı (sıralı
karşılıklı öldürmede beklenen matematik: user18 0→50→0, user19 0→0→50).
Doğrulama sonrası her iki hesabın NP'si tekrar 0'a sıfırlandı (temiz
başlangıç durumu için).

## Ekipmanın gerçek etkisi + item güçlendirme (Faz 4)

Kuşanılan silah/zırh/kalkan artık savaşı gerçekten etkiliyor — hem farm
hem PvP haritasında. Hesaplama backend'de: `backend/src/utils/onlineStats.js
→ getEquippedStats(userId)`, `/api/internal/authenticate` yanıtındaki
`character.equippedStats` alanına eklenir, Godot sunucusu bunu
`_peer_user[peer_id]` içine (`damage_bonus`, `armor_bonus`,
`max_health_bonus`) yazar.

- **Farm (`main.gd`)**: `request_attack` hasarı artık
  `ATTACK_DAMAGE + damage_bonus` (kuşanılan silahın hasarı).
- **PvP (`pvp_main.gd`)**: `request_pvp_attack` hasarı
  `max(1, (ATTACK_DAMAGE + saldıranın damage_bonus'u) - hedefin armor_bonus'u)`;
  can bonusu spawn anında `player.max_health = BASE_MAX_HEALTH + max_health_bonus`
  olarak uygulanıyor (bkz. `_spawn_player`).
- **Doğrulandı** (2026-08-13): `test_v2` (iron_sword +7 hasar, chain_armor
  +5 zırh/+25 can, iron_shield +5 zırh kuşanılı — toplam damage_bonus=7,
  armor_bonus=10, max_health_bonus=25) vs `test_v3` (hiç ekipman yok).
  Farm'da hasar 12→19'a çıktı (doğrulandı). PvP'de test_v2 27 hasar
  verirken sadece 10 hasar aldı, 125 canla savaştı — ekipmansız test_v3'ü
  net bir üstünlükle yendi (sunucu logunda satır satır doğrulandı).

Enchant/güçlendirme sistemi (KO tarzı, kullanıcı onaylı yüksek risk
modeli): `POST /api/online/upgrade-item { inventoryItemId }`. +1'den
+10'a kadar seviye, her denemede gümüş harcanır (sonuçtan bağımsız —
scroll tüketimiyle aynı ilke), her seviye temel istatistiği %15 artırır
(`ENCHANT_BONUS_PER_LEVEL`, `onlineStats.js`). +1..+4 güvenli (başarısızlıkta
sadece gümüş boşa gider); **+5'ten itibaren başarısızlıkta eşya YOK
OLABİLİR** (`ENCHANT_DESTROY_ON_FAIL`, +10'da %50 yok olma riski).
`test_v2` ile gerçek bir eşya +9'dan +10'a çıkma denemesinde gerçekten
yok oldu, envanterden silindiği (`DELETE FROM online_inventory`) ve bir
daha güçlendirilemeyeceği doğrulandı.

## Sosyal katman: parti + klan (Faz 5)

**Parti (sadece farm haritası, oturum bazlı — kalıcı DB'ye hiç yazılmaz)**:
`main.gd`'de `_party_of` (peer_id → party_id) ve `_pending_invites`
(target_peer_id → inviter_peer_id) sözlükleriyle takip edilir. Oyuncu
kontrolleri (`remote_player.gd`): **P** en yakın diğer oyuncuyu davet
eder, **O** bekleyen daveti kabul eder, **L** partiden ayrılır. Düşman
öldüğünde ödül (gümüş+tecrübe), öldüren partideyse TÜM parti üyeleri
arasında eşit bölüşülür (`_on_enemy_died` → `_party_members`); eşya
düşmesi ise ambiguity olmasın diye sadece gerçek öldürene gider. Parti
oluşturma/dağılma anlık olarak `party_update` RPC'siyle tüm üyelere
bildirilir (durum metni: "Parti (N kişi): sınıf1, sınıf2").

**Klan (kalıcı — ana oyunun mevcut `guilds`/`guild_members` tabloları
yeniden kullanıldı, ayrı bir online-klan sistemi icat edilmedi)**:
`backend/src/utils/onlineStats.js → getGuildInfo(userId)` hem
`GET /api/online/character`'a (görüntüleme) hem
`/api/internal/authenticate`'e (godot-server'ın PvP kararı için) ekleniyor.
`pvp_main.gd`, `request_pvp_attack`'ta saldıranın ve hedefin `guild_id`'sini
karşılaştırıp aynıysa hasarı SUNUCU TARAFINDA tamamen reddediyor (KO'daki
"aynı krallık dost ateşi yok" hissinin hafif bir karşılığı) — bu, tek
başına yeterli olsa da, `backend/src/controllers/internal.controller.js
→ pvpKill` de aynı kontrolü ikinci bir savunma katmanı olarak tekrarlıyor
(internal endpoint'lere bile tam güvenilmiyor, mevcut proje felsefesiyle
tutarlı). `GET /api/online/leaderboard` artık her satırda klan adını da
döndürüyor.

**Doğrulama** (2026-08-13): İki gerçek hesap (`test_v2`, `test_v3`)
geçici bir test klanına eklenip PvP'de birbirine saldırmayı denedi —
sunucu HER seferinde hasarı reddetti (0 NP değişimi, hem Godot sunucu
logunda hem `/api/internal/pvp-kill`'in doğrudan curl testinde
doğrulandı). Parti tarafında: iki hesap `--auto-party` test bayrağıyla
(`main.gd → _try_invite_nearest_player`, sadece `godot-server`'da var,
gerçek oyuncu akışı P/O/L tuşlarını kullanır) davet gönderip kabul etti,
ardından farm'da öldürülen her düşmanın ödülü ikiye bölünüp her iki
hesaba da doğru miktarda yazıldığı Postgres'te doğrulandı (`xp_share`/
`silver_share` sunucu logunda + `GET /api/online/character` ile
birebir eşleşti). Test sonrası klan silindi, hesaplar temiz duruma
sıfırlandı. **Not**: `godot-game-v3` (gerçek istemci) tarafına da
parti RPC stub'ları ve P/O/L tuşları eklendi (aynı desen, bkz.
`godot-game-v3/scripts/online_farm_client.gd`), ama bu özel özellik
oradan ayrıca uçtan uca test edilmedi — mekanizma (rpc_id stub
gereksinimi) playability geçişinde zaten kanıtlanmıştı, risk düşük
görüldü.

## Anti-hile sağlamlaştırma (Faz 6, planın son fazı)

Bu faz tamamen backend tarafında — godot-server/godot-game-v3'te hiçbir
değişiklik gerekmedi (yanıt kodu 200 olmayan her `HTTPRequest` çağrısı
zaten sessizce "başarısız" olarak ele alınıyordu, bkz. `main.gd →
_on_reward_response` / `pvp_main.gd → _on_pvp_kill_response`).

- **Hız tabanı** (`backend/src/controllers/internal.controller.js`):
  Godot sunucusu kendi tarafında zaten `ATTACK_COOLDOWN` (0.6s)
  uyguluyor; `MIN_KILL_INTERVAL_MS = 300` bağımsız, İKİNCİ bir taban —
  süreç bazlı bellek içi bir `Map` (`_lastKillAt`) ile, aynı kullanıcı
  için 300ms'den kısa aralıklı `reward-kill`/`pvp-kill` çağrıları
  `429` ile reddedilir. Tek başına yeterli değil (restart'ta sıfırlanır),
  mevcut `MAX_SILVER_PER_KILL`/`MAX_XP_PER_KILL` tavanlarıyla birlikte
  çalışan bir savunma katmanı.
- **Denetim kaydı**: Her başarılı `reward-kill` (`source='online_farm_kill'`)
  ve `pvp-kill` (`source='online_pvp_kill'`, hem katil hem kurban için ayrı
  satır) artık `resource_transactions` tablosuna yazılıyor — mevcut
  minigame/production loglama deseniyle birebir aynı
  (`INSERT ... .catch(() => {})`, ana akışı asla bloklamıyor). Reddedilen
  (çok hızlı) denemeler de `source='online_anticheat_flag'` ile loglanıyor.
- **Şüpheli Oyuncular paneli genişletildi**: `admin.controller.js →
  getSuspiciousPlayers` (Admin2 → "🚨 Şüpheli Oyuncular" sekmesi) artık
  online farm/PvP aktivitesini de aynı şüphe skoruna dahil ediyor —
  düşük ortalama öldürme aralığı (<1s / <2s), günde >200 öldürme, veya
  herhangi bir anti-hile bayrağı, ana oyunun mevcut saldırı-hızı
  sezgileriyle aynı ağırlıklandırma felsefesiyle skora ekleniyor.
  Frontend (`Admin2Page.tsx`) tabloya "Online Öldürme"/"Online Ort.
  Aralık"/"Anti-Hile Bayrağı" kolonlarını ekledi.
- **Doğrulama**: Hız tabanı + loglama curl ile uçtan uca doğrulandı
  (art arda `reward-kill`/`pvp-kill` çağrıları, ikincisi `429` ile
  reddedildi, `resource_transactions`'da hem başarı hem `flag` satırları
  doğru içerikle görüldü). Yeni SQL fragmanı (`online_kill_stats`/
  `online_flag_stats` CTE'leri) izole olarak test edildi ve doğru sonuç
  verdi (2 öldürme, ~1s ortalama aralık, 1 bayrak — beklenenle birebir
  eşleşti). **Not**: `getSuspiciousPlayers` endpoint'inin TAMAMI yerel
  ortamda uçtan uca çalıştırılamadı — `pirate_attacks` tablosu (ana
  oyunun saldırı-hızı analizi için kullanılan, bu Faz'dan tamamen
  bağımsız, önceden var olan bir bağımlılık) bu yerel Postgres'te yok
  (muhtemelen sadece prod'da var, `resource_transactions`/
  `minigame_progress` gibi elle eklenen diğer tablolarla aynı durum).
  Bu, benim değişikliğimin bir sonucu değil — mevcut bir yerel-ortam
  eksikliği. `is_admin` sütunu da `users` tablosunda yerel olarak eksikti,
  test için elle eklendi (`ALTER TABLE users ADD COLUMN IF NOT EXISTS
  is_admin BOOLEAN DEFAULT FALSE`) — prod'da muhtemelen zaten var.

## Prod deploy (2026-08-13) — TAMAMLANDI

`godot-server`, `island-empire-backend` ile aynı VPS'e (`islandsempire.com`,
Hostinger, Ubuntu 22.04) deploy edildi:

- Godot 4.3.stable Linux headless binary: `/opt/godot/Godot_v4.3-stable_linux.x86_64`
  (`/usr/local/bin/godot` sembolik linki ile), resmi godotengine GitHub
  release'inden indirildi — yereldeki Windows sürümüyle birebir aynı versiyon.
- İki PM2 süreci, `island-empire-backend`'in yanında sürekli çalışıyor:
  `kanadasi-farm` (port 9050, `scenes/Main.tscn --server`) ve `kanadasi-pvp`
  (port 9051, `scenes/PvpMain.tscn --server`) — `INTERNAL_SERVER_SECRET`
  ortam değişkeniyle başlatıldı, `pm2 save` ile reboot'ta otomatik dönüyor.
- Firewall (Hostinger Cloud Firewall paneli): 9050/9051 TCP, kaynak `Any`
  — gerçek oyuncular her yerden bağlanabilsin diye (SSH/22 ise sadece
  deploy makinesinin IP'sine kısıtlı tutuldu).
- Eksik online-mod tabloları (`online_characters`, `item_defs`,
  `online_inventory`, `online_equipment`) prod Postgres'e eklendi +
  tohumlandı — diğerleri (`resource_transactions`, `guilds`,
  `users.is_admin`) zaten prod'da mevcuttu.
- `godot-game-v3`'teki istemci script'leri (`_server_host()`) artık
  editör/debug build'de localhost, gerçek build'de otomatik olarak
  `islandsempire.com`'a bağlanıyor.
- **Doğrulama**: hem sunucu içinden (loopback) hem DIŞARIDAN (gerçek
  internet üzerinden, bu makineden) geçici test hesaplarıyla farm+PvP
  uçtan uca test edildi, sonra hesaplar tamamen silindi. Detaylar
  `godot-game-v3/README.md` → "gerçek multiplayer haritalarına giriş"
  bölümünde.

## Bölgeli farm haritası (2026-08-13)

Plan bitip prod'a deploy edildikten sonra kullanıcı geliştirmeye devam
etti: mevcut farm haritası (yeni bir ikinci harita DEĞİL) 4 iç içe halka
bölgeye ayrılarak büyütüldü — merkeze göre 0-350/350-700/700-1050/
1050-1400 birim, her biri farklı düşman havuzu + can/ödül çarpanı
(`main.gd → ZONES`). Tier4 "elit" düşmanlar (mevcut brute/gulyabani
sprite'ları, yeni sanat yok) ek can/ödül bonusu + kırmızımsı bir
`modulate` tonuyla ayırt ediliyor. Toplam 64 düşman (4/12/20/28,
halkaların gerçek alan oranından — 1:3:5:7). Item düşme tablosu artık
bölgeye bağlı, yeni bir "legendary" nadirlik eklendi (Tier4'e özel,
epic'in ~%55-65 üstü). Detaylı tasarım + sayı gerekçeleri:
`plans/humble-chasing-galaxy.md` → "Bölgeli farm haritası" bölümü.

**Kritik keşif — kamera oyuncuyu hiç takip etmiyordu**: `Camera2D` harita
kök düğümüne bağlı, varsayılan olarak (0,0)'da sabit duruyormuş — eski
küçük haritada (~250 birim) sorun değildi ama 1400 birime genişleyince
Tier2-4 (düşmanların %94'ü) gerçek oyuncuya tamamen görünmez kalırdı.
Görsel doğrulama sırasında (ekran görüntüsüyle) yakalanıp `main.gd`'nin
kendi `_process()`'ine + `godot-game-v3/scripts/online_farm_client.gd`'ye
"her karede kamerayı yerel oyuncunun pozisyonuna eşitle" mantığı
eklenerek düzeltildi (oyuncu düğümü dinamik spawn olduğundan Camera2D'yi
ona child yapamıyoruz, elle senkronize ediyoruz).

**Doğrulama**: Her 4 bölgeden gerçek öldürmelerle (Tier1/2/3 canlı test,
Tier4 spawn-anı istatistik kontrolü — can/ödül çok yüksek olduğu için
tam öldürme test penceresini aşıyor) can/ödül matematiği birebir
doğrulandı (`ENEMY_BASE_STATS × zone çarpanı × elit çarpanı`). Yeni
"legendary" item'ın gerçekten kazanılabildiği `/api/internal/reward-kill`
ile doğrudan test edildi. Ekran görüntüsüyle Tier4'teki elit
sprite+tonun (kırmızımsı) doğru render olduğu, kamera düzeltmesinin
çalıştığı görsel olarak onaylandı.

## Sıradaki adım

Plan'ın 6 fazı, prod deploy'u ve bölgeli farm haritası tamamlandı.
Bilinen tek sınırlama: bağlantı hâlâ `ws://` (TLS'siz) — web export/
tarayıcı desteği istenirse `wss://` + sertifika ayrı bir iş olarak
gerekecek.
