# Kan Adası: Online — Sunucu (Faz 0 + Faz 2 + Faz 3)

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

## Görseller kasıtlı olarak basit

Oyuncular ve düşmanlar şu an renkli kareler — gerçek karakter sprite'ları
(`godot-game-v3/assets/sprites/char_*`) DEĞİL. Bu bilinçli bir kapsam
kararı: önce ağ/oynanış mekaniğinin (kimlik doğrulama, senkronizasyon,
saldırı doğrulama, ödül yazımı) doğru çalıştığını kanıtlamak, görsel
entegrasyonu ayrı bir geçişe bırakmak (tıpkı projenin en başında
`simple_shape.gd` ile başlayıp sonra gerçek PixelLab sanatına geçmesi gibi).

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

## Sıradaki adım

Faz 4 — ekipmanın gerçek etkisi + item upgrade/enchant sistemi.
