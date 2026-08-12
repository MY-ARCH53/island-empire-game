# Kan Adası: Online — Sunucu (Faz 0 + Faz 2)

Bu, "Kan Adası: Online" çok oyunculu genişlemesinin (bkz. plan:
`C:\Users\musta\.claude\plans\humble-chasing-galaxy.md`) **headless Godot
sunucusu**. Kalıcı karakter/envanter verisi Faz 1'de `godot-game-v3` +
Node backend'e eklendi (bu proje sadece gerçek zamanlı simülasyon
otoritesi — bkz. planın "Veri sorumluluk ayrımı" bölümü).

**Durum**: Faz 0 ✅ + Faz 2 ✅ (2026-08-12) — sunucu-otoriter PvE farm
döngüsü uçtan uca çalışıyor: gerçek bir hesapla (JWT) bağlan → kimlik
doğrula → düşman öldür → sunucu ödülü hesaplayıp Postgres'e yazar →
istemciye bildirim gelir. `test_v2` hesabıyla gerçek bir koşuda doğrulandı
(ekran görüntüsü + veritabanı satırı eşleşmesiyle).

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

## Sıradaki adım

Faz 3 — PvP haritası (KO Bifrost esintili): ayrı bir savaş alanı sahnesi,
oyuncular birbirine hasar verebilir, NP kazan/kaybet, liderlik tablosu.
Bu fazın saldırı-doğrulama altyapısı (`request_attack` deseni) buraya da
taşınabilir, hedef sadece düşman değil oyuncu da olabilir hale gelir.
