# Kan Adası: Online — Sunucu Prototipi (Faz 0)

Bu proje **oyun içeriği içermez**. Tek amacı, "Kan Adası: Online" çok
oyunculu genişlemesi için seçilen ağ mimarisinin (bkz. plan:
`C:\Users\musta\.claude\plans\humble-chasing-galaxy.md`) gerçekten
çalıştığını kanıtlamak: headless bir Godot sunucusu + `WebSocketMultiplayerPeer`
ile bağlanan istemciler arasında gerçek zamanlı, sunucu-otoriter pozisyon
senkronizasyonu.

**Sonuç: ✅ Doğrulandı** (2026-08-12) — iki bağımsız Godot process'i,
headless bir üçüncü process (sunucu) üzerinden birbirinin hareketini doğru
ve gerçek zamanlı gördü. Ekran görüntüsü kanıtları bu oturumda incelendi
(dosyalar geçiciydi, commit'e dahil değil).

## Nasıl çalışır

`scripts/main.gd` hem sunucu hem istemci rolünde çalışan TEK bir script —
Godot'un çoklu oyuncu replikasyonu, `MultiplayerSpawner` yapılandırmasının
TÜM eşlerde (sunucu + her istemci) aynı sahne ağacında bulunmasını
gerektiriyor, bu yüzden ayrı sunucu/istemci sahneleri yerine komut satırı
argümanıyla (`--server`) rol seçiliyor.

- `RemotePlayer.tscn`: renkli bir kare (gerçek karakter değil, sadece
  senkronizasyon kanıtı). `MultiplayerSynchronizer` + el ile yazılmış
  `SceneReplicationConfig` (`.tscn` içinde `properties/0/path = ".:position"`,
  `replication_mode = 1` yani ALWAYS) `position`'ı sürekli senkronize eder.
- Yetki (authority) sadece kendi id'sine sahip eşte — `remote_player.gd`
  `is_multiplayer_authority()` kontrolüyle hareketi sadece o eşte uygular,
  diğerlerinde pozisyon otomatik gelir.

## Çalıştırma

Sunucu (headless):
```
Godot_v4.3-stable_win64_console.exe --headless --path . --server
```

İstemci (WASD ile hareket):
```
Godot_v4.3-stable_win64_console.exe --path .
```

Otomatik doğrulama modu (bağlandıktan sonra kendi kendine hareket edip 3 ekran
görüntüsü kaydeder — `res://mp_test_client_<id>_shotN.png` — MCP'de screenshot
aracı olmadığından bu oturumda kullanılan teknikle aynı):
```
Godot_v4.3-stable_win64_console.exe --path . --auto-shot
```

## Sıradaki adım

Faz 0 geçti — plan dosyasındaki Faz 1'e (kalıcı online karakter + envanter
altyapısı, DB tabloları, backend endpoint'leri) geçilebilir. Bu prototip
projesi büyümeye devam edecek: gerçek harita, gerçek oyuncu görselleri,
düşman senkronizasyonu, drop/ödül mantığı buraya eklenecek (mevcut
`godot-game-v2`'nin run-tabanlı roguelite'ı hiç değişmiyor, ayrı kalıyor).
