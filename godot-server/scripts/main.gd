extends Node2D

# Faz 2 — PvE farm haritası. Aynı script hem sunucu hem istemci rolünde
# çalışır (bkz. Faz 0 notu). Sunucu: kimlik doğrulama (Node backend'e JWT
# sorar), düşman spawn/ölüm, saldırı doğrulama, ödül yazımı (SADECE
# /api/internal/* üzerinden — bkz. plans/humble-chasing-galaxy.md).

const PORT := 9050
const HOST := "127.0.0.1"
const ATTACK_RANGE := 60.0
const ATTACK_COOLDOWN := 0.6
const ATTACK_DAMAGE := 12.0
const RESPAWN_DELAY := 4.0

# Faz B — oyuncu canı (bkz. plans/humble-chasing-galaxy.md "Farm Derinliği").
# PvP'deki 100'den kasıtlı yüksek — farm daha bağışlayıcı hissettirmeli.
# Can DB'ye hiç yazılmıyor, PvP'deki gibi tamamen geçici/sunucu-otoriter
# (bkz. _broadcast_health notu) — bu proje boyunca kanıtlanmış desen.
const BASE_MAX_HEALTH := 120.0
const MIN_DAMAGE := 1.0
const RESPAWN_INVULN_SEC := 2.0

# Faz F1 — köy güvenli bölgesi (bkz. plans/humble-chasing-galaxy.md "Büyük
# Harita Genişlemesi"). Bu yarıçapta hiç düşman yok, oyuncu burada
# spawn/respawn oluyor — game.gd'deki (tek-oyunculu roguelite)
# VILLAGE_RADIUS deseninin aynısı (kod paylaşılmıyor, sayı port edildi).
const VILLAGE_RADIUS := 220.0

# Faz F0 — düşman replikasyon LOD/culling (bkz. plans/humble-chasing-galaxy.md
# "Büyük Harita Genişlemesi"). Kanıtlanmış kök neden: FarmEnemy.tscn'in
# Sync'i önceden TÜM bağlı eşlere, mesafeden bağımsız, her ağ turunda
# position+health yayınlıyordu — bu, bu projede defalarca görülen "Buffer
# payload full"/ERR_OUT_OF_MEMORY WebSocket taşma bug'ının kök nedeniydi.
# Artık Sync.public_visibility=false, her VISIBILITY_UPDATE_INTERVAL
# saniyede bir _update_enemy_visibility() her düşman×eş çiftini mesafeye
# göre açıp kapatıyor — bant genişliği artık toplam düşman sayısıyla değil
# oyuncu başına yerel yoğunlukla orantılı.
const VISIBILITY_RADIUS := 1000.0
const VISIBILITY_UPDATE_INTERVAL := 0.5

var _visibility_timer: Timer

const FarmEnemyScene := preload("res://scenes/FarmEnemy.tscn")

# Bölgeli zorluk sistemi (2026-08-13'te 4 halka olarak eklendi, Faz F1'de
# 5 halkaya genişletildi — bkz. plans/humble-chasing-galaxy.md "Büyük
# Harita Genişlemesi"). Merkezde VILLAGE_RADIUS'a kadar köy (düşmansız),
# sonra 5 iç içe halka — genişlikleri artık eşit DEĞİL (biome'lara göre
# ayarlandı) ama enemy_count yine halka alan oranına (dış_r²-iç_r²) göre
# ölçekli, mevcut yoğunluk (64 düşman / 1400 yarıçap) korunarak hesaplandı.
# `pool`'daki tipler ENEMY_BASE_STATS'tan taban istatistiği alır, sonra
# difficulty_mult (can) / reward_mult (xp+gümüş) ile çarpılır; `elite=true`
# olan bölgede ayrıca ELITE_HEALTH_MULT/ELITE_REWARD_MULT uygulanır.
# NOT: tier5 ("Kızıl Lav Diyarı") havuzu henüz GEÇİCİ olarak mevcut
# mob'ları (brute/gulyabani) kullanıyor — Faz F6'da Lav İblisi ile
# değiştirilecek, bu bilinçli bir ara adım. tier4 ("Yağmur Ormanı") Faz
# F5'te kendi temalı mob'larına (Bataklık İfriti/Zehir Sarmaşığı) geçti.
const ZONES := [
	{"name": "tier1", "min_r": VILLAGE_RADIUS, "max_r": 750.0,  "pool": ["bat", "kabus"],
	 "difficulty_mult": 1.0, "reward_mult": 1.0, "elite": false, "enemy_count": 5,
	 "drop_chance": 0.30, "rarity_weights": {"common": 1.0}, "damage_mult": 1.0},
	{"name": "tier2", "min_r": 750.0,  "max_r": 1400.0, "pool": ["skeleton", "ghost"],
	 "difficulty_mult": 1.8, "reward_mult": 2.0, "elite": false, "enemy_count": 15,
	 "drop_chance": 0.35, "rarity_weights": {"common": 0.65, "rare": 0.35}, "damage_mult": 1.3},
	{"name": "tier3", "min_r": 1400.0, "max_r": 2100.0, "pool": ["brute", "gulyabani", "yaban_kurdu"],
	 "difficulty_mult": 3.0, "reward_mult": 3.5, "elite": false, "enemy_count": 26,
	 "drop_chance": 0.40, "rarity_weights": {"common": 0.30, "rare": 0.50, "epic": 0.20}, "damage_mult": 1.7},
	{"name": "tier4", "min_r": 2100.0, "max_r": 2800.0, "pool": ["bataklik_ifriti", "zehir_sarmasigi"],
	 "difficulty_mult": 4.5, "reward_mult": 5.0, "elite": false, "enemy_count": 36,
	 "drop_chance": 0.45, "rarity_weights": {"common": 0.15, "rare": 0.35, "epic": 0.35, "legendary": 0.15}, "damage_mult": 2.0},
	{"name": "tier5", "min_r": 2800.0, "max_r": 3500.0, "pool": ["brute", "gulyabani"],
	 "difficulty_mult": 6.5, "reward_mult": 7.5, "elite": true, "enemy_count": 46,
	 "drop_chance": 0.50, "rarity_weights": {"common": 0.10, "rare": 0.30, "epic": 0.40, "legendary": 0.20}, "damage_mult": 2.8},
]
const ELITE_HEALTH_MULT := 1.3
const ELITE_REWARD_MULT := 1.5
# ELITE_HEALTH_MULT'tan (1.3) kasıtlı çok daha yumuşak — can seviyeyle değil
# sadece eşyayla büyüyor, hasar da can gibi ölçeklense Tier4 hayatta
# kalınamaz olurdu (bkz. plan "Faz B.2").
const ELITE_DAMAGE_MULT := 1.15

# Farm-özel taban istatistikler — roguelite'ın Upgrades.ENEMIES'inden
# BİREBİR kopyalanmadı (o dict tek-oyunculu DPS/tempo için dengelenmiş,
# burada ATTACK_DAMAGE=12/ATTACK_COOLDOWN=0.6 farklı bir PvE döngüsü).
const ENEMY_BASE_STATS := {
	"bat":       {"health": 30.0, "xp": 8,  "silver": 5,  "damage": 5.0,  "speed": 90.0},
	# Faz F1 — Upgrades.ENEMIES'te zaten tanımlı+sprite'lı ama farm
	# haritasında hiç kullanılmıyordu, devreye alındı (0 yeni PixelLab
	# maliyeti). "silver" roguelite dict'inde yok, bat ile aynı xp/silver
	# oranı (~0.6) korunarak eklendi.
	"kabus":     {"health": 9.0,  "xp": 4,  "silver": 3,  "damage": 5.0,  "speed": 145.0},
	"skeleton":  {"health": 55.0, "xp": 14, "silver": 10, "damage": 9.0,  "speed": 55.0},
	"ghost":     {"health": 42.0, "xp": 12, "silver": 9,  "damage": 7.0,  "speed": 100.0},
	"brute":     {"health": 140.0, "xp": 30, "silver": 24, "damage": 18.0, "speed": 45.0},
	"gulyabani": {"health": 95.0, "xp": 22, "silver": 18, "damage": 13.0, "speed": 50.0},
	# Faz F7 — Kan Lordu'nun İni boss'u. Upgrades.ENEMIES'te zaten
	# tanımlı+sprite'lı (is_boss:true, 80x80), farm haritasında hiç
	# kullanılmıyordu. "silver" roguelite dict'inde yok, brute/gulyabani'nin
	# xp/silver oranı (~0.8) korunarak eklendi.
	"kan_lordu": {"health": 1400.0, "xp": 150, "silver": 120, "damage": 22.0, "speed": 55.0},
	# Faz F4 — Verimli Vadi'ye özgü yeni mob (PixelLab ile üretildi). brute/
	# gulyabani arası bir güç seviyesinde, xp/silver oranı ikisiyle tutarlı
	# (~0.22/~0.18), daha hızlı ("sürü halinde saldıran kurt" teması).
	"yaban_kurdu": {"health": 70.0, "xp": 15, "silver": 13, "damage": 14.0, "speed": 75.0},
	# Faz F5 — Yağmur Ormanı'na özgü yeni mob'lar (PixelLab). xp/silver
	# oranı brute/gulyabani ile tutarlı (~0.22/~0.18).
	"bataklik_ifriti": {"health": 110.0, "xp": 24, "silver": 20, "damage": 16.0, "speed": 45.0},
	"zehir_sarmasigi": {"health": 60.0, "xp": 13, "silver": 11, "damage": 20.0, "speed": 25.0},
}

# Faz F7 — Kan Lordu'nun İni: normal ZONES akışından ayrı, tekil bir boss
# encounter. Tier5'in dış sınırının hemen ötesinde sabit bir "cep" alan
# (bkz. plans/humble-chasing-galaxy.md "Büyük Harita Genişlemesi" tablosu).
const BOSS_POSITION := Vector2(3800.0, 0.0)
const BOSS_ARENA_RADIUS := 300.0
const BOSS_ZONE_INDEX := 4   # ZONES[4] = tier5 — loot tablosu/rarity_weights ödünç alınıyor
const BOSS_RESPAWN_DELAY := 270.0  # 4.5 dakika — sıradan RESPAWN_DELAY'den (4sn) çok daha uzun
const BOSS_SWARM_COUNT := 4  # kabus sürüsü, boss'un etrafında
# "enemy_" öneki KORUNUYOR — visibility culling (_update_enemy_visibility),
# AOE yetenek hasarı (_ability_aoe_damage vb.) ve istemci test kodları hep
# `child.name.begins_with("enemy_")` kontrolü yapıyor; farklı bir önek
# kullanılsaydı boss/swarm bu mekanizmaların HİÇBİRİNE dahil olmazdı.
const BOSS_NAME := "enemy_boss_lord"
const BOSS_KABUS_PREFIX := "enemy_boss_kabus_"

# Faz C — can iksiri (bkz. plans/humble-chasing-galaxy.md "Farm Derinliği").
const POTION_DROP_CHANCE := 0.15
const POTION_ITEM_ID := "minor_health_potion"
const POTION_USE_COOLDOWN := 3.0

# Faz D/E — sınıfa özgü yetenekler. Her sınıfın 4 AYRI aktif yeteneği var
# (bkz. plans/humble-chasing-galaxy.md "Sınıf Yetenekleri Genişlemesi"),
# her biri Lv10/20/30/40'ta açılıyor ve BAĞIMSIZ olarak kullanılabiliyor
# (üst kademe alt kademeyi değiştirmiyor, ekliyor — Faz D'deki "tek yetenek
# güçlenir" modelinden farklı, kullanıcı açıkça "yeni yetenek" istedi).
# ABILITIES[class_id][slot_index] — slot_index = ABILITY_UNLOCK_LEVELS'teki
# indeksle eşleşir. Bir sınıfın o slotu için henüz tasarım eklenmediyse
# (Faz E2-E4 tamamlanana kadar) dizi o slotta kısa kalır, request_use_ability
# bunu nazikçe reddeder. v1'de SADECE farm, PvP'ye eklenmedi (yetenekler
# farm_enemy/parti altyapısını kullanıyor, PvP'nin kendi NP bahis modeli var).
const ABILITY_UNLOCK_LEVELS := [10, 20, 30, 40]
const ABILITIES := {
	"koylu": [
		{"cooldown": 20.0, "name": "Sağlam Duruş", "base_armor": 15.0, "duration": 6.0},
		{"cooldown": 12.0, "name": "Toparlanma", "base_heal": 35.0},
		{"cooldown": 25.0, "name": "Kalkan Duvarı", "base_armor": 20.0, "duration": 8.0, "radius": 150.0},
		{"cooldown": 30.0, "name": "Kahramanca Direniş", "base_armor": 30.0, "duration": 8.0, "base_heal": 60.0},
	],
	"buyucu": [
		{"cooldown": 8.0, "name": "Büyü Patlaması", "base_damage": 25.0, "radius": 100.0},
		{"cooldown": 10.0, "name": "Alev Zinciri", "base_damage": 40.0, "search_radius": 250.0, "chain_radius": 80.0, "chain_mult": 0.6},
		{"cooldown": 20.0, "name": "Manastik Kalkan", "base_armor": 20.0, "base_damage_bonus": 15.0, "duration": 10.0},
		{"cooldown": 15.0, "name": "Arkan Yağmuru", "base_damage": 60.0, "radius": 130.0},
	],
	"kilic_ustasi": [
		{"cooldown": 6.0, "name": "Kasırga Darbesi", "base_damage": 30.0, "radius": 70.0},
		{"cooldown": 15.0, "name": "Kan Öfkesi", "base_damage_bonus": 18.0, "duration": 8.0},
		{"cooldown": 9.0, "name": "Yıkım Vuruşu", "base_damage": 45.0},
		{"cooldown": 12.0, "name": "Kan Girdabı", "base_damage": 55.0, "radius": 90.0},
	],
	"firtina_rahibesi": [
		{"cooldown": 15.0, "name": "Şifa Dalgası", "base_heal": 30.0, "radius": 150.0},
		{"cooldown": 15.0, "name": "Kutsal Kalkan", "base_armor": 15.0, "duration": 6.0, "radius": 150.0},
		{"cooldown": 10.0, "name": "Nova Patlaması", "base_damage": 20.0, "radius": 90.0},
		{"cooldown": 22.0, "name": "Toplu Şifa", "base_heal": 60.0, "radius": 180.0},
	],
	"vebali": [
		{"cooldown": 10.0, "name": "Zehir Bulutu", "base_damage": 8.0, "tick_damage": 4.0, "ticks": 5, "radius": 90.0},
		{"cooldown": 15.0, "name": "Veba Gücü", "base_damage_bonus": 15.0, "duration": 10.0},
		{"cooldown": 12.0, "name": "Ölüm Dokunuşu", "base_damage": 15.0, "tick_damage": 5.0, "ticks": 6},
		{"cooldown": 18.0, "name": "Salgın", "base_damage": 12.0, "tick_damage": 6.0, "ticks": 6, "radius": 130.0},
	],
	"firtina_avcisi": [
		{"cooldown": 7.0, "name": "Şimşek Hamlesi", "base_damage": 20.0},
		{"cooldown": 9.0, "name": "Çift Şimşek", "base_damage": 25.0, "chain_radius": 80.0, "chain_mult": 0.5},
		{"cooldown": 16.0, "name": "Fırtına Kalkanı", "base_armor": 18.0, "duration": 7.0},
		{"cooldown": 14.0, "name": "Yıldırım Fırtınası", "base_damage": 35.0, "radius": 110.0},
	],
}

const SLOTS := ["weapon", "armor", "shield"]
const RARITY_ITEM_IDS := {
	"common":    {"weapon": "wooden_sword",   "armor": "cloth_armor",  "shield": "wooden_shield"},
	"rare":      {"weapon": "iron_sword",     "armor": "chain_armor",  "shield": "iron_shield"},
	"epic":      {"weapon": "cursed_blade",   "armor": "plate_armor",  "shield": "aegis_shield"},
	"legendary": {"weapon": "legendary_sword", "armor": "legendary_armor", "shield": "legendary_shield"},
}

@onready var spawner: MultiplayerSpawner = $PlayerSpawner
@onready var status_label: Label = $UI/StatusLabel
@onready var camera: Camera2D = $Camera2D

var _is_server: bool = false
var _peer_user: Dictionary = {}       # peer_id -> {user_id, class_id, level}
var _last_attack_time: Dictionary = {}  # peer_id -> float saniye
var _enemy_counter: int = 0
var _enemy_zone: Dictionary = {}      # enemy adı -> zone index (sunucu-only, replike edilmiyor)
var _respawn_invuln_until: Dictionary = {}  # peer_id -> float saniye (Faz B)
var _last_potion_use: Dictionary = {}       # peer_id -> float saniye (Faz C)
var _last_ability_time: Dictionary = {}     # peer_id -> {slot_index -> float saniye} (Faz E)
var _ability_armor_bonus: Dictionary = {}   # peer_id -> {"amount": float, "expires_at": float} (koylu, Faz D)
var _ability_damage_bonus: Dictionary = {}  # peer_id -> {"amount": float, "expires_at": float} (Faz E2)

# Faz 5 — parti sistemi (bu haritaya özgü, kalıcı değil — sadece bağlıyken
# geçerli). party_id olarak partiyi kuran oyuncunun peer_id'si kullanılıyor.
var _party_of: Dictionary = {}        # peer_id -> party_id (int)
var _pending_invites: Dictionary = {} # target_peer_id -> inviter_peer_id

var _my_jwt: String = ""
var _local_player_id: int = -1

func _node_api_base() -> String:
	var override := OS.get_environment("NODE_API_BASE")
	return override if override != "" else "http://localhost:3000/api"

func _internal_secret() -> String:
	return OS.get_environment("INTERNAL_SERVER_SECRET")

func _ready() -> void:
	spawner.spawn_function = _spawn_player
	_is_server = "--server" in OS.get_cmdline_args()
	_my_jwt = _get_cmdline_value("--token=")
	if _is_server:
		_start_server()
	else:
		_start_client()

func _get_cmdline_value(prefix: String) -> String:
	for arg in OS.get_cmdline_args():
		if arg.begins_with(prefix):
			return arg.substr(prefix.length())
	return ""

func _start_server() -> void:
	if _internal_secret() == "":
		print("SERVER_START_FAILED: INTERNAL_SERVER_SECRET ortam değişkeni tanımlı değil")
		status_label.text = "HATA: INTERNAL_SERVER_SECRET tanımlı değil"
		return
	var peer := WebSocketMultiplayerPeer.new()
	var err := peer.create_server(PORT)
	if err != OK:
		print("SERVER_START_FAILED err=", err)
		status_label.text = "SUNUCU BAŞLATILAMADI (err=%d)" % err
		return
	multiplayer.multiplayer_peer = peer
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	print("SERVER_STARTED port=", PORT)
	status_label.text = "SUNUCU — port %d" % PORT
	_spawn_initial_enemies()
	_visibility_timer = Timer.new()
	_visibility_timer.wait_time = VISIBILITY_UPDATE_INTERVAL
	_visibility_timer.autostart = true
	_visibility_timer.timeout.connect(_update_enemy_visibility)
	add_child(_visibility_timer)

func _start_client() -> void:
	var peer := WebSocketMultiplayerPeer.new()
	var err := peer.create_client("ws://%s:%d" % [HOST, PORT])
	if err != OK:
		print("CLIENT_CONNECT_FAILED err=", err)
		status_label.text = "BAĞLANTI HATASI (err=%d)" % err
		return
	multiplayer.multiplayer_peer = peer
	multiplayer.connected_to_server.connect(_on_connected_to_server)
	multiplayer.connection_failed.connect(_on_connection_failed)
	multiplayer.server_disconnected.connect(_on_server_disconnected)
	status_label.text = "Bağlanıyor..."

# Kamera Camera2D, harita kök düğümüne bağlı olduğu için varsayılan
# olarak (0,0)'da sabit duruyordu — bölgeli sistem (bkz. ZONES) dünyayı
# 1400 yarıçapa kadar genişletti, kamerayı istemci tarafında elle takip
# ettirmezsek Tier2-4 hiç görünmez. Sunucu tarafında etkisiz (headless,
# hiçbir şey render edilmiyor), sadece --auto-attack test client'ları için.
func _process(_delta: float) -> void:
	if _is_server:
		return
	var me_name := str(_local_player_id)
	if has_node(me_name):
		camera.position = get_node(me_name).position

func _on_connected_to_server() -> void:
	_local_player_id = multiplayer.get_unique_id()
	print("CLIENT_CONNECTED id=", _local_player_id)
	status_label.text = "Kimlik doğrulanıyor..."
	rpc_id(1, "submit_auth", _my_jwt)

func _on_connection_failed() -> void:
	print("CLIENT_CONNECTION_FAILED")
	status_label.text = "BAĞLANTI BAŞARISIZ"

func _on_server_disconnected() -> void:
	print("CLIENT_SERVER_DISCONNECTED")
	status_label.text = "SUNUCU BAĞLANTISI KOPTU"

func _on_peer_connected(id: int) -> void:
	print("PEER_CONNECTED id=", id, " (kimlik doğrulama bekleniyor)")

func _on_peer_disconnected(id: int) -> void:
	print("PEER_DISCONNECTED id=", id)
	_peer_user.erase(id)
	_last_attack_time.erase(id)
	_respawn_invuln_until.erase(id)
	_last_potion_use.erase(id)
	_last_ability_time.erase(id)
	_ability_armor_bonus.erase(id)
	_ability_damage_bonus.erase(id)
	if _party_of.has(id):
		var party_id: int = _party_of[id]
		_party_of.erase(id)
		_broadcast_party_update(party_id)
	_pending_invites.erase(id)
	for key in _pending_invites.keys():
		if _pending_invites[key] == id:
			_pending_invites.erase(key)
	var node_name := str(id)
	if has_node(node_name):
		get_node(node_name).queue_free()

func _spawn_player(data: Dictionary) -> Node2D:
	var id: int = int(data["id"])
	var player_scene: PackedScene = load("res://scenes/RemotePlayer.tscn")
	var player: Node2D = player_scene.instantiate()
	player.name = str(id)
	player.set_multiplayer_authority(id)
	player.position = _village_spawn_position()
	player.max_health = float(data.get("max_health", BASE_MAX_HEALTH))
	player.health = player.max_health
	return player

# --- Kimlik doğrulama: istemci JWT'sini sunucuya gönderir, sunucu Node
# backend'ine sorar (gerçek userId + online karakteri öğrenmek için). ---

@rpc("any_peer", "reliable")
func submit_auth(token: String) -> void:
	if not _is_server:
		return
	var sender_id := multiplayer.get_remote_sender_id()
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_auth_response.bind(http, sender_id))
	var body := JSON.stringify({"token": token})
	var headers := [
		"Content-Type: application/json",
		"X-Internal-Secret: " + _internal_secret(),
	]
	var err := http.request(_node_api_base() + "/internal/authenticate", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		print("AUTH_REQUEST_FAILED peer=", sender_id, " err=", err)
		http.queue_free()

func _on_auth_response(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest, peer_id: int) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK or code != 200:
		print("AUTH_FAILED peer=", peer_id, " (sunucu yanıtı okunamadı, code=", code, ")")
		if multiplayer.get_peers().has(peer_id):
			rpc_id(peer_id, "auth_result", false, "Kimlik doğrulanamadı.")
		return
	var data = json.get_data()
	var inner: Dictionary = data.get("data", {})
	if not inner.get("valid", false):
		print("AUTH_INVALID peer=", peer_id)
		if multiplayer.get_peers().has(peer_id):
			rpc_id(peer_id, "auth_result", false, "Geçersiz oturum.")
		return
	var character = inner.get("character")
	if character == null:
		print("AUTH_NO_CHARACTER peer=", peer_id)
		if multiplayer.get_peers().has(peer_id):
			rpc_id(peer_id, "auth_result", false, "Önce ana menüden bir online karakter oluşturmalısın.")
		return
	if not multiplayer.get_peers().has(peer_id):
		print("AUTH_OK ama peer zaten ayrıldı, spawn atlanıyor: ", peer_id)
		return
	var equipped: Dictionary = character.get("equippedStats", {})
	_peer_user[peer_id] = {
		"user_id": int(inner["userId"]),
		"class_id": str(character.get("class_id", "koylu")),
		"level": int(character.get("level", 1)),
		# Faz 4 — kuşanılan silahın hasar bonusu (bkz. backend/src/utils/onlineStats.js).
		"damage_bonus": float(equipped.get("damageBonus", 0)),
		# Faz B — PvP zaten üçünü de önbelliğe alıyordu, farm sadece
		# damage_bonus'u alıyordu; artık armor/max_health bonusları da
		# okunuyor (backend'de zaten dönüyordu, sadece kullanılmıyordu).
		"armor_bonus": float(equipped.get("armorBonus", 0)),
		"max_health_bonus": float(equipped.get("maxHealthBonus", 0)),
	}
	print("AUTH_OK peer=", peer_id, " user_id=", _peer_user[peer_id]["user_id"], " class=", _peer_user[peer_id]["class_id"])
	# max_health'i spawn verisine ekliyoruz — sadece sunucunun kendi
	# instantiate ettiği kopyaya (_spawn_player) yazmak yetmez, o değer
	# GERÇEK istemciye hiç ulaşmaz (istemci kendi ayrı _spawn_player'ında
	# aynı sahneyi kendi başına instantiate ediyor). Gerçek testte
	# yakalandı: zırhlı bir test hesabında can barı üst sınırı hep 120
	# görünüyordu, gerçek (170) değil.
	var spawn_max_health: float = BASE_MAX_HEALTH + float(_peer_user[peer_id]["max_health_bonus"])
	spawner.spawn({"id": peer_id, "class_id": _peer_user[peer_id]["class_id"], "max_health": spawn_max_health})
	rpc_id(peer_id, "auth_result", true, "Hoş geldin, %s! (WASD hareket, SPACE saldırı, H can iksiri, R/T/Y/U yetenekler)" % _peer_user[peer_id]["class_id"])

@rpc("authority", "reliable")
func auth_result(success: bool, message: String) -> void:
	status_label.text = message
	if success and "--auto-attack" in OS.get_cmdline_args():
		_run_auto_attack_test()

# Faz 2 doğrulama yardımcısı: kimlik doğrulandıktan sonra en yakın düşmana
# birkaç kez saldırıp (gerçek tuş girişi simüle etmeden, doğrudan aynı RPC
# çağrısıyla) periyodik ekran görüntüsü alır.
func _run_auto_attack_test() -> void:
	await get_tree().create_timer(0.5).timeout
	if "--auto-party" in OS.get_cmdline_args():
		for attempt in range(6):
			if _try_invite_nearest_player():
				break
			await get_tree().create_timer(0.3).timeout
	# GEÇİCİ test yardımcısı: --test-zone=N ile oyuncuyu doğrudan o
	# bölgenin ortasına ışınlar (bölgeli sistem doğrulaması için).
	var test_zone := _get_cmdline_value("--test-zone=")
	if test_zone == "boss":
		# GEÇİCİ test yardımcısı: --test-zone=boss ile Kan Lordu'nun İni'ne
		# ışınlar (Faz F7 doğrulaması için).
		var me_boss := str(_local_player_id)
		if has_node(me_boss):
			get_node(me_boss).position = BOSS_POSITION
			print("ZONE_WARP zone=boss pos=", BOSS_POSITION)
			await get_tree().create_timer(1.0).timeout
	elif test_zone != "":
		var zi := int(test_zone)
		var me_name0 := str(_local_player_id)
		if has_node(me_name0) and zi >= 0 and zi < ZONES.size():
			var me0: Node2D = get_node(me_name0)
			var zone: Dictionary = ZONES[zi]
			var mid_r: float = (float(zone["min_r"]) + float(zone["max_r"])) / 2.0
			me0.position = Vector2(mid_r, 0.0)
			print("ZONE_WARP zone=", zone["name"], " pos=", me0.position)
			# Faz F0'ın görünürlük döngüsü (main.gd → _update_enemy_visibility,
			# 0.5sn'de bir) ışınlama SONRASI pozisyona göre yeniden hesaplansın
			# diye bekleniyor — yoksa "en yakın düşman" araması hâlâ eski
			# (ışınlama öncesi) görünür kılınmış, uzak bir düşmanı bulabilir.
			await get_tree().create_timer(1.0).timeout
	# Bölgeli harita eskisinden çok daha büyük (bkz. ZONES) — yürüme
	# bütçesi buna göre artırıldı (70 tur × 90 birim/tur), yoksa test
	# oyuncunun spawn noktasından en yakın düşmana yetişemeyebilir.
	for i in range(70):
		var me_name := str(_local_player_id)
		if has_node(me_name):
			var me: Node2D = get_node(me_name)
			var nearest: Node2D = null
			var nearest_dist := INF
			for child in get_children():
				if child.name.begins_with("enemy_"):
					var d: float = me.position.distance_to(child.position)
					if d < nearest_dist:
						nearest_dist = d
						nearest = child
			if nearest:
				if nearest_dist > ATTACK_RANGE:
					me.position = me.position.move_toward(nearest.position, 90.0)
				else:
					rpc_id(1, "request_attack", nearest.name)
		await get_tree().create_timer(0.5).timeout
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://farm_test_client_%d.png" % _local_player_id)
	print("AUTO_ATTACK_DONE id=", _local_player_id)

# Faz 5 doğrulama yardımcısı: --auto-party ile en yakın DİĞER oyuncuyu
# partiye davet eder (kabul tarafı party_invite_received'daki auto-accept ile).
func _try_invite_nearest_player() -> bool:
	var me_name := str(_local_player_id)
	if not has_node(me_name):
		return false
	var me: Node2D = get_node(me_name)
	var nearest: Node2D = null
	var nearest_dist := INF
	for child in get_children():
		if child.name != me_name and child.name.is_valid_int():
			var d: float = me.position.distance_to(child.position)
			if d < nearest_dist:
				nearest_dist = d
				nearest = child
	if nearest:
		rpc_id(1, "request_party_invite", nearest.name)
		return true
	return false

# --- Düşmanlar (sadece sunucu spawn eder; MultiplayerSpawner'ın
# spawnable_scenes listesi sayesinde istemcilere otomatik replike olur). ---

func _spawn_initial_enemies() -> void:
	for zone_index in range(ZONES.size()):
		for i in range(ZONES[zone_index]["enemy_count"]):
			_spawn_one_enemy(zone_index)
		print("ZONE_SPAWNED zone=", ZONES[zone_index]["name"], " count=", ZONES[zone_index]["enemy_count"])
	_spawn_boss()
	for i in range(BOSS_SWARM_COUNT):
		_spawn_boss_kabus()
	print("TOTAL_ENEMIES_SPAWNED=", _enemy_counter)

# Faz F0 — her düşmanın Sync'ini (public_visibility=false) sadece
# VISIBILITY_RADIUS içindeki eşlere açar. Bir düşmana hiçbir eş yakın
# değilse o düşman o eşler için hiç var olmaz (MultiplayerSpawner de
# görünürlüğe bakıyor, sadece property senkronu değil) — hem ağ trafiği
# hem istemci düğüm sayısı düşer.
func _update_enemy_visibility() -> void:
	var peers := multiplayer.get_peers()
	if peers.is_empty():
		return
	var peer_positions: Dictionary = {}
	for peer_id in peers:
		var pname := str(peer_id)
		if has_node(pname):
			peer_positions[peer_id] = get_node(pname).position
	for child in get_children():
		if not child.name.begins_with("enemy_"):
			continue
		var sync: MultiplayerSynchronizer = child.get_node_or_null("Sync")
		if sync == null:
			continue
		for peer_id in peers:
			if not peer_positions.has(peer_id):
				continue
			var is_near: bool = child.position.distance_to(peer_positions[peer_id]) <= VISIBILITY_RADIUS
			sync.set_visibility_for(peer_id, is_near)

# Annulus (halka) içinde alan-tekdüze rastgele konum — game.gd'deki
# _random_field_position()'daki aynı sqrt(randf_range(min_r², max_r²))
# tekniği (roguelite'tan, farklı bir Godot projesinden — kod paylaşılmıyor,
# sadece teknik yeniden kullanılıyor).
func _random_zone_position(zone: Dictionary) -> Vector2:
	var angle := randf_range(0.0, TAU)
	var min_r: float = zone["min_r"]
	var max_r: float = zone["max_r"]
	var dist := sqrt(randf_range(min_r * min_r, max_r * max_r))
	return Vector2(cos(angle), sin(angle)) * dist

# Faz F1 — oyuncu spawn/respawn noktası artık köy merkezi (VILLAGE_RADIUS'un
# 30 birim içinde, kenara/tier1'e çok yakın düşülmesin diye pay bırakılıyor).
# Hem _spawn_player hem _on_player_died AYNI formülü kullanıyor (öncesinde
# ikisi ayrı sabit bir aralık kullanıyordu, tutarsızdı).
func _village_spawn_position() -> Vector2:
	return _random_zone_position({"min_r": 0.0, "max_r": VILLAGE_RADIUS - 30.0})

func _spawn_one_enemy(zone_index: int) -> void:
	var zone: Dictionary = ZONES[zone_index]
	var pool: Array = zone["pool"]
	var enemy_type: String = pool[randi() % pool.size()]
	var base_stats: Dictionary = ENEMY_BASE_STATS[enemy_type]
	var is_elite: bool = zone["elite"]
	var health_mult: float = zone["difficulty_mult"] * (ELITE_HEALTH_MULT if is_elite else 1.0)
	var reward_mult: float = zone["reward_mult"] * (ELITE_REWARD_MULT if is_elite else 1.0)
	var damage_mult: float = float(zone["damage_mult"]) * (ELITE_DAMAGE_MULT if is_elite else 1.0)

	var enemy: Node2D = FarmEnemyScene.instantiate()
	enemy.name = "enemy_%d" % _enemy_counter
	_enemy_counter += 1
	enemy.max_health = base_stats["health"] * health_mult
	enemy.xp_reward = int(round(base_stats["xp"] * reward_mult))
	enemy.silver_reward = int(round(base_stats["silver"] * reward_mult))
	enemy.enemy_type = enemy_type
	enemy.is_elite = is_elite
	enemy.contact_damage = float(base_stats["damage"]) * damage_mult
	enemy.move_speed = float(base_stats["speed"])
	enemy.position = _random_zone_position(zone)
	enemy._spawn_position = enemy.position
	enemy.died.connect(_on_enemy_died.bind(enemy))
	enemy.attacked_player.connect(_on_enemy_attacked_player)
	_enemy_zone[enemy.name] = zone_index
	add_child(enemy)

# Faz F7 — Kan Lordu, tekil boss instance. Zone çarpanları UYGULANMIYOR
# (ENEMY_BASE_STATS["kan_lordu"] zaten "boss" olarak tasarlanmış ham
# değerler, Upgrades.ENEMIES'ten aynen alınmış) — sabit güçte, harita
# genişledikçe otomatik güçlenmeyen bir varlık.
func _spawn_boss() -> void:
	var base_stats: Dictionary = ENEMY_BASE_STATS["kan_lordu"]
	var enemy: Node2D = FarmEnemyScene.instantiate()
	enemy.name = BOSS_NAME
	enemy.max_health = base_stats["health"]
	enemy.xp_reward = int(base_stats["xp"])
	enemy.silver_reward = int(base_stats["silver"])
	enemy.enemy_type = "kan_lordu"
	enemy.is_elite = true
	enemy.contact_damage = float(base_stats["damage"])
	enemy.move_speed = float(base_stats["speed"])
	enemy.position = BOSS_POSITION
	enemy._spawn_position = enemy.position
	enemy.died.connect(_on_enemy_died.bind(enemy))
	enemy.attacked_player.connect(_on_enemy_attacked_player)
	_enemy_zone[enemy.name] = BOSS_ZONE_INDEX
	add_child(enemy)
	for peer_id in multiplayer.get_peers():
		rpc_id(peer_id, "reward_notification", "Kan Lordu belirdi! Dikkatli olun...")

# preferred_name veriliyorsa (ölüm sonrası yeniden doğuş) AYNI isim
# korunuyor — _enemy_zone dict key'i ve olası istemci-taraflı referanslar
# tutarlı kalsın diye.
func _spawn_boss_kabus(preferred_name: String = "") -> void:
	var base_stats: Dictionary = ENEMY_BASE_STATS["kabus"]
	var enemy: Node2D = FarmEnemyScene.instantiate()
	if preferred_name != "":
		enemy.name = preferred_name
	else:
		enemy.name = "%s%d" % [BOSS_KABUS_PREFIX, _enemy_counter]
		_enemy_counter += 1
	enemy.max_health = base_stats["health"]
	enemy.xp_reward = int(base_stats["xp"])
	enemy.silver_reward = int(base_stats["silver"])
	enemy.enemy_type = "kabus"
	enemy.is_elite = false
	enemy.contact_damage = float(base_stats["damage"])
	enemy.move_speed = float(base_stats["speed"])
	enemy.position = BOSS_POSITION + _random_zone_position({"min_r": 0.0, "max_r": BOSS_ARENA_RADIUS})
	enemy._spawn_position = enemy.position
	enemy.died.connect(_on_enemy_died.bind(enemy))
	enemy.attacked_player.connect(_on_enemy_attacked_player)
	_enemy_zone[enemy.name] = BOSS_ZONE_INDEX
	add_child(enemy)

# --- Faz B: düşman temas hasarı → oyuncu canı. PvP'nin _broadcast_health/
# health_update deseninin birebir aynısı — health SceneReplicationConfig'e
# hiç eklenmiyor, sunucu her değişiklikte açıkça RPC ile yayınlıyor (Faz 3'te
# PvP'de bulunan gerçek bir bug'ın tekrarlanmaması için). ---

func _on_enemy_attacked_player(victim_peer_id: int, raw_damage: float) -> void:
	if not _is_server or not _peer_user.has(victim_peer_id):
		return
	var now := Time.get_ticks_msec() / 1000.0
	if now < _respawn_invuln_until.get(victim_peer_id, 0.0):
		return
	var victim_name := str(victim_peer_id)
	if not has_node(victim_name):
		return
	var victim: Node2D = get_node(victim_name)
	var armor_bonus: float = float(_peer_user[victim_peer_id].get("armor_bonus", 0))
	# Faz D — koylu'nun "Sağlam Duruş" yeteneği süresi dolmadıysa ek zırh.
	var ability_buff: Dictionary = _ability_armor_bonus.get(victim_peer_id, {})
	if not ability_buff.is_empty() and now < float(ability_buff.get("expires_at", 0.0)):
		armor_bonus += float(ability_buff.get("amount", 0.0))
	var damage: float = max(MIN_DAMAGE, raw_damage - armor_bonus)
	victim.health -= damage
	_broadcast_health(victim_name, victim.health)
	if victim.health <= 0.0:
		_on_player_died(victim_peer_id, victim)

func _broadcast_health(player_name: String, new_health: float) -> void:
	for peer_id in multiplayer.get_peers():
		rpc_id(peer_id, "health_update", player_name, new_health)

@rpc("authority", "reliable")
func health_update(player_name: String, new_health: float) -> void:
	if has_node(player_name):
		get_node(player_name).health = new_health

# Ölüm/respawn tasarım kararı (bkz. plan): gümüş/xp/seviyeye HİÇ dokunulmuyor
# (backend'e hiç istek gitmiyor) — tek bedel başlangıç bölgesine ışınlanmak +
# kısa bir dokunulmazlık. Farm, PvP'nin NP bahsinden bilinçli olarak farklı,
# düşük gerilimli bir aktivite olmalı.
func _on_player_died(peer_id: int, player: Node2D) -> void:
	player.health = player.max_health
	var new_pos := _village_spawn_position()
	# position, oyuncunun kendi eşine ait client-otoriter bir alan
	# (set_multiplayer_authority(peer_id), bkz. _spawn_player) — sunucu
	# burada player.position'ı DOĞRUDAN değiştirse bile bu değişiklik asla
	# gerçek istemciye ya da diğer eşlere yayılmaz (MultiplayerSynchronizer
	# SADECE otorite sahibi eşten dışarı yayın yapar). Gerçek testte
	# yakalandı: ölüm bildirimi/can sıfırlama çalışıyordu ama oyuncu
	# ekranda hiç ışınlanmıyordu. Çözüm: istemciye "kendi pozisyonunu şuna
	# ayarla" diyen açık bir RPC — istemci kendi otoriter alanını
	# değiştirince normal hareket gibi doğru şekilde replike oluyor.
	player.position = new_pos
	_respawn_invuln_until[peer_id] = (Time.get_ticks_msec() / 1000.0) + RESPAWN_INVULN_SEC
	_broadcast_health(str(peer_id), player.health)
	if multiplayer.get_peers().has(peer_id):
		rpc_id(peer_id, "respawn_teleport", new_pos)
		rpc_id(peer_id, "farm_death_notification", "Öldün! Başlangıç bölgesine döndün.")

@rpc("authority", "reliable")
func respawn_teleport(new_position: Vector2) -> void:
	var me_name := str(_local_player_id)
	if has_node(me_name):
		get_node(me_name).position = new_position

@rpc("authority", "reliable")
func farm_death_notification(message: String) -> void:
	status_label.text = message

# --- Faz D/E: sınıfa özgü yetenekler. İstemci "şu SLOTU kullanmak
# istiyorum" der (slot_index 0-3, R/T/Y/U tuşları), sunucu seviye
# kapısını/cooldown'ı doğrulayıp etkiyi SUNUCUDA uygular (mevcut
# request_attack/request_use_potion'la aynı "istemci niyet bildirir,
# sunucu hesaplar" ilkesi). Her slot BAĞIMSIZ cooldown'a sahip. ---

@rpc("any_peer", "reliable")
func request_use_ability(slot_index: int) -> void:
	if not _is_server:
		return
	var sender_id := multiplayer.get_remote_sender_id()
	if not _peer_user.has(sender_id):
		return
	if slot_index < 0 or slot_index >= ABILITY_UNLOCK_LEVELS.size():
		return
	var level: int = int(_peer_user[sender_id]["level"])
	if level < ABILITY_UNLOCK_LEVELS[slot_index]:
		rpc_id(sender_id, "reward_notification", "Bu yetenek Seviye %d'de açılıyor." % ABILITY_UNLOCK_LEVELS[slot_index])
		return
	var class_id: String = str(_peer_user[sender_id]["class_id"])
	if not ABILITIES.has(class_id):
		return
	var slots: Array = ABILITIES[class_id]
	if slot_index >= slots.size():
		# Bu sınıf için bu slotun yeteneği henüz tasarlanmadı (Faz E2-E4).
		rpc_id(sender_id, "reward_notification", "Bu yetenek henüz mevcut değil.")
		return
	var cfg: Dictionary = slots[slot_index]
	var now := Time.get_ticks_msec() / 1000.0
	var peer_cooldowns: Dictionary = _last_ability_time.get(sender_id, {})
	# Sentinel varsayılan olarak 0.0 KULLANILMAZ — "hiç kullanılmadı" durumu
	# sunucu uptime'ı henüz cooldown süresini geçmemişse (ör. taze başlatılmış
	# sunucuda 30sn'lik bir yetenek ilk 30sn içinde denenirse) 0.0, "az önce
	# t=0'da kullanıldı" ile karışıp yanlış reddediyordu — gerçek bir test
	# sırasında bulunan bug. -INF, "hiç kullanılmadı"nın her zaman geçmesini
	# garanti eder.
	if now - float(peer_cooldowns.get(slot_index, -INF)) < float(cfg["cooldown"]):
		return
	if not has_node(str(sender_id)):
		return
	peer_cooldowns[slot_index] = now
	_last_ability_time[sender_id] = peer_cooldowns
	for peer_id in multiplayer.get_peers():
		rpc_id(peer_id, "ability_cast_notification", str(sender_id), class_id, slot_index)
	# _ability_<class_id>_t<slot+1> adlandırma kuralı — yeni bir slot
	# eklerken sadece bu isimde bir metot eklemek yeterli, dispatch
	# tablosu bakımı gerekmiyor (bkz. plan "Faz E1").
	var method_name := "_ability_%s_t%d" % [class_id, slot_index + 1]
	if has_method(method_name):
		call(method_name, sender_id, cfg)

# Çevredeki tüm düşmanlara alan hasarı — birden çok yetenek bu şekli
# kullanıyor (sadece sayılar farklı), tek yardımcıda birleştirildi.
# Mevcut take_damage/died altyapısını bedava kullanıyor (ödül/drop zaten
# oradan akıyor).
func _ability_aoe_damage(sender_id: int, dmg: float, radius: float) -> void:
	var caster: Node2D = get_node(str(sender_id))
	for child in get_children():
		if child.name.begins_with("enemy_") and caster.position.distance_to(child.position) <= radius:
			child.take_damage(dmg, sender_id)

func _ability_buyucu_t1(sender_id: int, cfg: Dictionary) -> void:
	_ability_aoe_damage(sender_id, float(cfg["base_damage"]), float(cfg["radius"]))

func _ability_kilic_ustasi_t1(sender_id: int, cfg: Dictionary) -> void:
	_ability_aoe_damage(sender_id, float(cfg["base_damage"]), float(cfg["radius"]))

# Sağlam Duruş — geçici zırh bonusu (bkz. _on_enemy_attacked_player'daki
# hasar formülüne entegrasyon).
func _ability_koylu_t1(sender_id: int, cfg: Dictionary) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	_ability_armor_bonus[sender_id] = {
		"amount": float(cfg["base_armor"]),
		"expires_at": now + float(cfg["duration"]),
	}

# Şifa Dalgası — kendini + (partideyse) yarıçaptaki parti üyelerini
# iyileştirir. Mevcut _party_members() (şimdiye kadar sadece ödül
# paylaşımı için kullanılıyordu) ilk kez oyuncunun anlık hissedeceği bir
# şeye dönüşüyor.
func _ability_firtina_rahibesi_t1(sender_id: int, cfg: Dictionary) -> void:
	var caster: Node2D = get_node(str(sender_id))
	var heal: float = float(cfg["base_heal"])
	var radius: float = float(cfg["radius"])
	var targets: Array = [sender_id]
	if _party_of.has(sender_id):
		for pid in _party_members(_party_of[sender_id]):
			if pid != sender_id:
				targets.append(pid)
	for pid in targets:
		var pname := str(pid)
		if not has_node(pname):
			continue
		var p: Node2D = get_node(pname)
		if pid != sender_id and p.position.distance_to(caster.position) > radius:
			continue
		p.health = min(p.max_health, p.health + heal)
		_broadcast_health(pname, p.health)

# Zehir Bulutu — anlık ilk hasar + yarıçaptaki tüm düşmanlara zamana
# yayılı ek hasar (DOT). Tik sayacı farm_enemy.gd → apply_poison()'da,
# take_damage'ı tekrar tekrar çağırıyor (ödül/ölüm zaten o yoldan akıyor).
func _ability_vebali_t1(sender_id: int, cfg: Dictionary) -> void:
	var caster: Node2D = get_node(str(sender_id))
	var initial_dmg: float = float(cfg["base_damage"])
	var tick_dmg: float = float(cfg["tick_damage"])
	var radius: float = float(cfg["radius"])
	for child in get_children():
		if child.name.begins_with("enemy_") and caster.position.distance_to(child.position) <= radius:
			child.take_damage(initial_dmg, sender_id)
			if child.has_method("apply_poison"):
				child.apply_poison(int(cfg["ticks"]), tick_dmg, sender_id)

# Şimşek Hamlesi — en yakın düşmana ışınlanıp vurur (zincirsiz — zincir
# artık ayrı bir T2 yeteneği "Çift Şimşek", bkz. plan). position client-
# otoriter olduğundan (bkz. respawn_teleport'taki aynı gotcha, Faz B)
# sunucu burada caster.position'ı DOĞRUDAN değiştirse bile gerçek
# istemciye yansımaz — ability_teleport RPC'siyle istemciye "kendi
# pozisyonunu buna ayarla" deniyor.
func _ability_firtina_avcisi_t1(sender_id: int, cfg: Dictionary) -> void:
	var caster: Node2D = get_node(str(sender_id))
	var nearest: Node2D = null
	var nearest_dist := INF
	for child in get_children():
		if child.name.begins_with("enemy_"):
			var d: float = caster.position.distance_to(child.position)
			if d < nearest_dist:
				nearest_dist = d
				nearest = child
	if nearest == null:
		return
	var dir: Vector2 = (caster.position - nearest.position).normalized()
	if dir == Vector2.ZERO:
		dir = Vector2.RIGHT
	var new_pos: Vector2 = nearest.position + dir * ATTACK_RANGE
	caster.position = new_pos
	if multiplayer.get_peers().has(sender_id):
		rpc_id(sender_id, "ability_teleport", new_pos)
	nearest.take_damage(float(cfg["base_damage"]), sender_id)

func _find_nearest_enemy_to(pos: Vector2, max_dist: float = INF) -> Node2D:
	var nearest: Node2D = null
	var nearest_dist := INF
	for child in get_children():
		if child.name.begins_with("enemy_"):
			var d: float = pos.distance_to(child.position)
			if d < nearest_dist and d <= max_dist:
				nearest_dist = d
				nearest = child
	return nearest

# --- Faz E2 (Lv20 yetenekleri) ---

# Toparlanma — kendine anlık iyileştirme.
func _ability_koylu_t2(sender_id: int, cfg: Dictionary) -> void:
	var pname := str(sender_id)
	if not has_node(pname):
		return
	var p: Node2D = get_node(pname)
	p.health = min(p.max_health, p.health + float(cfg["base_heal"]))
	_broadcast_health(pname, p.health)

# Alev Zinciri — geniş aramayla en yakın düşmana büyük hasar + yakındaki
# ikinci bir hedefe zincirleme (ışınlanmasız — büyücü caster, avcı/kılıç
# ustası gibi fiziksel ışınlanmıyor, bkz. plan notu).
func _ability_buyucu_t2(sender_id: int, cfg: Dictionary) -> void:
	var caster: Node2D = get_node(str(sender_id))
	var primary := _find_nearest_enemy_to(caster.position, float(cfg["search_radius"]))
	if primary == null:
		return
	var dmg: float = float(cfg["base_damage"])
	primary.take_damage(dmg, sender_id)
	var chain_radius: float = float(cfg["chain_radius"])
	var chain_dmg: float = dmg * float(cfg["chain_mult"])
	for child in get_children():
		if child.name.begins_with("enemy_") and child != primary and primary.position.distance_to(child.position) <= chain_radius:
			child.take_damage(chain_dmg, sender_id)

# Kan Öfkesi / Veba Gücü — kendine geçici hasar bonusu (bkz.
# _ability_damage_bonus, request_attack'taki entegrasyon).
func _ability_kilic_ustasi_t2(sender_id: int, cfg: Dictionary) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	_ability_damage_bonus[sender_id] = {
		"amount": float(cfg["base_damage_bonus"]),
		"expires_at": now + float(cfg["duration"]),
	}

func _ability_vebali_t2(sender_id: int, cfg: Dictionary) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	_ability_damage_bonus[sender_id] = {
		"amount": float(cfg["base_damage_bonus"]),
		"expires_at": now + float(cfg["duration"]),
	}

# Kutsal Kalkan — koylu'nun T1 zırh mantığı + rahibe'nin T1 kendi+parti
# hedef seçme döngüsü birleştirildi (plan'da önceden belirtilen 2. yeni
# yapı taşı — "parti hedefli zırh buff'ı").
func _ability_firtina_rahibesi_t2(sender_id: int, cfg: Dictionary) -> void:
	var caster: Node2D = get_node(str(sender_id))
	var now := Time.get_ticks_msec() / 1000.0
	var amount: float = float(cfg["base_armor"])
	var duration: float = float(cfg["duration"])
	var radius: float = float(cfg["radius"])
	var targets: Array = [sender_id]
	if _party_of.has(sender_id):
		for pid in _party_members(_party_of[sender_id]):
			if pid != sender_id:
				targets.append(pid)
	for pid in targets:
		var pname := str(pid)
		if not has_node(pname):
			continue
		if pid != sender_id and get_node(pname).position.distance_to(caster.position) > radius:
			continue
		_ability_armor_bonus[pid] = {"amount": amount, "expires_at": now + duration}

# Çift Şimşek — T1 "Şimşek Hamlesi"nin ışınlanma+vuruş deseni + yakındaki
# ikinci bir hedefe zincirleme.
func _ability_firtina_avcisi_t2(sender_id: int, cfg: Dictionary) -> void:
	var caster: Node2D = get_node(str(sender_id))
	var nearest := _find_nearest_enemy_to(caster.position)
	if nearest == null:
		return
	var dir: Vector2 = (caster.position - nearest.position).normalized()
	if dir == Vector2.ZERO:
		dir = Vector2.RIGHT
	var new_pos: Vector2 = nearest.position + dir * ATTACK_RANGE
	caster.position = new_pos
	if multiplayer.get_peers().has(sender_id):
		rpc_id(sender_id, "ability_teleport", new_pos)
	var dmg: float = float(cfg["base_damage"])
	nearest.take_damage(dmg, sender_id)
	var chain_radius: float = float(cfg["chain_radius"])
	var chain_dmg: float = dmg * float(cfg["chain_mult"])
	for child in get_children():
		if child.name.begins_with("enemy_") and child != nearest and nearest.position.distance_to(child.position) <= chain_radius:
			child.take_damage(chain_dmg, sender_id)

# --- Faz E3 (Lv30 yetenekleri) ---

# Kalkan Duvarı — Kutsal Kalkan'ın (T2) birebir aynı parti-zırh deseni,
# sadece sayılar farklı.
func _ability_koylu_t3(sender_id: int, cfg: Dictionary) -> void:
	var caster: Node2D = get_node(str(sender_id))
	var now := Time.get_ticks_msec() / 1000.0
	var amount: float = float(cfg["base_armor"])
	var duration: float = float(cfg["duration"])
	var radius: float = float(cfg["radius"])
	var targets: Array = [sender_id]
	if _party_of.has(sender_id):
		for pid in _party_members(_party_of[sender_id]):
			if pid != sender_id:
				targets.append(pid)
	for pid in targets:
		var pname := str(pid)
		if not has_node(pname):
			continue
		if pid != sender_id and get_node(pname).position.distance_to(caster.position) > radius:
			continue
		_ability_armor_bonus[pid] = {"amount": amount, "expires_at": now + duration}

# Manastik Kalkan — zırh (Sağlam Duruş'un aynısı) + hasar bonusu (Kan
# Öfkesi'nin aynısı) tek yetenekte birleştirildi.
func _ability_buyucu_t3(sender_id: int, cfg: Dictionary) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	var expires_at := now + float(cfg["duration"])
	_ability_armor_bonus[sender_id] = {"amount": float(cfg["base_armor"]), "expires_at": expires_at}
	_ability_damage_bonus[sender_id] = {"amount": float(cfg["base_damage_bonus"]), "expires_at": expires_at}

# Yıkım Vuruşu — Şimşek Hamlesi'nin (T1) ışınlanma+tekli-vuruş deseninin
# birebir aynısı, zincirsiz, sadece hasar sayısı farklı.
func _ability_kilic_ustasi_t3(sender_id: int, cfg: Dictionary) -> void:
	var caster: Node2D = get_node(str(sender_id))
	var nearest := _find_nearest_enemy_to(caster.position)
	if nearest == null:
		return
	var dir: Vector2 = (caster.position - nearest.position).normalized()
	if dir == Vector2.ZERO:
		dir = Vector2.RIGHT
	var new_pos: Vector2 = nearest.position + dir * ATTACK_RANGE
	caster.position = new_pos
	if multiplayer.get_peers().has(sender_id):
		rpc_id(sender_id, "ability_teleport", new_pos)
	nearest.take_damage(float(cfg["base_damage"]), sender_id)

# Nova Patlaması — büyücü/kılıç ustasının _ability_aoe_damage'ıyla aynı
# yardımcıyı kullanıyor.
func _ability_firtina_rahibesi_t3(sender_id: int, cfg: Dictionary) -> void:
	_ability_aoe_damage(sender_id, float(cfg["base_damage"]), float(cfg["radius"]))

# Ölüm Dokunuşu — Şimşek Hamlesi'nin ışınlanma+vuruş deseni + Zehir
# Bulutu'nun (T1) apply_poison DOT'u, aynı hedefe birleştirildi.
func _ability_vebali_t3(sender_id: int, cfg: Dictionary) -> void:
	var caster: Node2D = get_node(str(sender_id))
	var nearest := _find_nearest_enemy_to(caster.position)
	if nearest == null:
		return
	var dir: Vector2 = (caster.position - nearest.position).normalized()
	if dir == Vector2.ZERO:
		dir = Vector2.RIGHT
	var new_pos: Vector2 = nearest.position + dir * ATTACK_RANGE
	caster.position = new_pos
	if multiplayer.get_peers().has(sender_id):
		rpc_id(sender_id, "ability_teleport", new_pos)
	nearest.take_damage(float(cfg["base_damage"]), sender_id)
	if nearest.has_method("apply_poison"):
		nearest.apply_poison(int(cfg["ticks"]), float(cfg["tick_damage"]), sender_id)

# Fırtına Kalkanı — Sağlam Duruş'un (koylu T1) kendine-zırh deseninin
# birebir aynısı, sadece sayılar farklı.
func _ability_firtina_avcisi_t3(sender_id: int, cfg: Dictionary) -> void:
	var now := Time.get_ticks_msec() / 1000.0
	_ability_armor_bonus[sender_id] = {
		"amount": float(cfg["base_armor"]),
		"expires_at": now + float(cfg["duration"]),
	}

# --- Faz E4 (Lv40 yetenekleri) ---

# Kahramanca Direniş — Sağlam Duruş'un zırhı + Toparlanma'nın self-heal'i
# tek yetenekte, tavan (T4) numaralarıyla.
func _ability_koylu_t4(sender_id: int, cfg: Dictionary) -> void:
	var pname := str(sender_id)
	if not has_node(pname):
		return
	var now := Time.get_ticks_msec() / 1000.0
	_ability_armor_bonus[sender_id] = {
		"amount": float(cfg["base_armor"]),
		"expires_at": now + float(cfg["duration"]),
	}
	var p: Node2D = get_node(pname)
	p.health = min(p.max_health, p.health + float(cfg["base_heal"]))
	_broadcast_health(pname, p.health)

# Arkan Yağmuru / Kan Girdabı / Yıldırım Fırtınası — _ability_aoe_damage'ın
# tavan (T4) numaralarıyla tekrar kullanımı.
func _ability_buyucu_t4(sender_id: int, cfg: Dictionary) -> void:
	_ability_aoe_damage(sender_id, float(cfg["base_damage"]), float(cfg["radius"]))

func _ability_kilic_ustasi_t4(sender_id: int, cfg: Dictionary) -> void:
	_ability_aoe_damage(sender_id, float(cfg["base_damage"]), float(cfg["radius"]))

func _ability_firtina_avcisi_t4(sender_id: int, cfg: Dictionary) -> void:
	_ability_aoe_damage(sender_id, float(cfg["base_damage"]), float(cfg["radius"]))

# Toplu Şifa — Şifa Dalgası'nın (T1) kendi+parti heal deseninin tavan
# numaralarla tekrarı.
func _ability_firtina_rahibesi_t4(sender_id: int, cfg: Dictionary) -> void:
	var caster: Node2D = get_node(str(sender_id))
	var heal: float = float(cfg["base_heal"])
	var radius: float = float(cfg["radius"])
	var targets: Array = [sender_id]
	if _party_of.has(sender_id):
		for pid in _party_members(_party_of[sender_id]):
			if pid != sender_id:
				targets.append(pid)
	for pid in targets:
		var pname := str(pid)
		if not has_node(pname):
			continue
		var p: Node2D = get_node(pname)
		if pid != sender_id and p.position.distance_to(caster.position) > radius:
			continue
		p.health = min(p.max_health, p.health + heal)
		_broadcast_health(pname, p.health)

# Salgın — Zehir Bulutu'nun (T1) alan+DOT deseninin tavan numaralarla tekrarı.
func _ability_vebali_t4(sender_id: int, cfg: Dictionary) -> void:
	var caster: Node2D = get_node(str(sender_id))
	var initial_dmg: float = float(cfg["base_damage"])
	var tick_dmg: float = float(cfg["tick_damage"])
	var radius: float = float(cfg["radius"])
	for child in get_children():
		if child.name.begins_with("enemy_") and caster.position.distance_to(child.position) <= radius:
			child.take_damage(initial_dmg, sender_id)
			if child.has_method("apply_poison"):
				child.apply_poison(int(cfg["ticks"]), tick_dmg, sender_id)

@rpc("authority", "reliable")
func ability_teleport(new_position: Vector2) -> void:
	var me_name := str(_local_player_id)
	if has_node(me_name):
		get_node(me_name).position = new_position

@rpc("authority", "reliable")
func ability_cast_notification(caster_name: String, class_id: String, slot_index: int) -> void:
	print("ABILITY_CAST caster=", caster_name, " class=", class_id, " slot=", slot_index)

func _on_enemy_died(killer_peer_id: int, enemy: Node2D) -> void:
	if not _is_server:
		return
	var user_info: Dictionary = _peer_user.get(killer_peer_id, {})
	var user_id: int = int(user_info.get("user_id", -1))
	var xp_reward: int = enemy.xp_reward
	var silver_reward: int = enemy.silver_reward
	var zone_index: int = _enemy_zone.get(enemy.name, 0)
	var drop_id := _roll_item_drop(zone_index)
	var died_name := enemy.name
	_enemy_zone.erase(enemy.name)
	enemy.queue_free()
	if user_id != -1:
		if _party_of.has(killer_peer_id):
			# Faz 5 — partideyse ödül tüm parti üyeleri arasında eşit
			# bölüşülür (item drop sadece gerçek öldürene gider, ambiguity
			# olmasın diye).
			var members := _party_members(_party_of[killer_peer_id])
			var share_count: int = max(1, members.size())
			var xp_share: int = max(1, xp_reward / share_count)
			var silver_share: int = max(1, silver_reward / share_count)
			print("PARTY_REWARD_SPLIT killer=", killer_peer_id, " members=", members, " xp_share=", xp_share, " silver_share=", silver_share)
			for pid in members:
				var member_user_id: int = int(_peer_user.get(pid, {}).get("user_id", -1))
				if member_user_id != -1:
					_send_reward(pid, member_user_id, silver_share, xp_share, drop_id if pid == killer_peer_id else "")
		else:
			_send_reward(killer_peer_id, user_id, silver_reward, xp_reward, drop_id)
	# Faz F7 — Kan Lordu/swarm normal zone respawn akışına GİRMİYOR, kendi
	# özel deseniyle yeniden doğuyor (bkz. _spawn_boss/_spawn_boss_kabus).
	if died_name == BOSS_NAME:
		for peer_id in multiplayer.get_peers():
			rpc_id(peer_id, "reward_notification", "Kan Lordu yenildi! Bölgeye tekrar huzur geldi.")
		await get_tree().create_timer(BOSS_RESPAWN_DELAY).timeout
		_spawn_boss()
		return
	if died_name.begins_with(BOSS_KABUS_PREFIX):
		await get_tree().create_timer(RESPAWN_DELAY).timeout
		_spawn_boss_kabus(died_name)
		return
	await get_tree().create_timer(RESPAWN_DELAY).timeout
	_spawn_one_enemy(zone_index)

func _roll_item_drop(zone_index: int) -> String:
	# Faz C — can iksiri, bölgeden bağımsız düz bir oranla, eşya düşmesiyle
	# KARŞILIKLI DIŞLAYICI (hangisi önce vurursa) — _send_reward'ın mevcut
	# tek-itemDefId-per-kill sözleşmesi değişmiyor, backend'e sıfır değişiklik.
	if randf() <= POTION_DROP_CHANCE:
		return POTION_ITEM_ID
	var zone: Dictionary = ZONES[zone_index]
	if randf() > float(zone["drop_chance"]):
		return ""
	var rarity := _roll_rarity(zone["rarity_weights"])
	var slot: String = SLOTS[randi() % SLOTS.size()]
	return RARITY_ITEM_IDS[rarity][slot]

func _roll_rarity(weights: Dictionary) -> String:
	var roll := randf()
	var cumulative := 0.0
	for rarity in weights.keys():
		cumulative += float(weights[rarity])
		if roll <= cumulative:
			return rarity
	return weights.keys()[0]

# --- Saldırı: istemci "bu düşmana vurmak istiyorum" der, sunucu menzil/
# bekleme süresini doğrulayıp hasarı SUNUCUDA uygular. ---

@rpc("any_peer", "reliable")
func request_attack(enemy_name: String) -> void:
	if not _is_server:
		return
	var sender_id := multiplayer.get_remote_sender_id()
	if not _peer_user.has(sender_id):
		return
	var now := Time.get_ticks_msec() / 1000.0
	var last: float = _last_attack_time.get(sender_id, 0.0)
	if now - last < ATTACK_COOLDOWN:
		return
	var attacker_name := str(sender_id)
	if not has_node(attacker_name) or not has_node(enemy_name):
		return
	var attacker: Node2D = get_node(attacker_name)
	var enemy: Node2D = get_node(enemy_name)
	if not enemy.has_method("take_damage"):
		return
	if attacker.position.distance_to(enemy.position) > ATTACK_RANGE:
		return
	_last_attack_time[sender_id] = now
	var damage_bonus: float = float(_peer_user[sender_id].get("damage_bonus", 0))
	# Faz E2 — geçici yetenek hasar bonusu (bkz. _ability_damage_bonus,
	# _ability_armor_bonus'un aynı desenle hasar tarafındaki karşılığı).
	var ability_buff: Dictionary = _ability_damage_bonus.get(sender_id, {})
	if not ability_buff.is_empty() and now < float(ability_buff.get("expires_at", 0.0)):
		damage_bonus += float(ability_buff.get("amount", 0.0))
	enemy.take_damage(ATTACK_DAMAGE + damage_bonus, sender_id)

# --- Parti: davet/kabul/ayrılma, sadece bu haritaya özgü geçici bir
# gruplama (kalıcı DB'ye hiç yazılmıyor). ---

@rpc("any_peer", "reliable")
func request_party_invite(target_name: String) -> void:
	if not _is_server:
		return
	var sender_id := multiplayer.get_remote_sender_id()
	if not _peer_user.has(sender_id):
		return
	var target_id := int(target_name) if target_name.is_valid_int() else -1
	if target_id == -1 or not _peer_user.has(target_id) or target_id == sender_id:
		return
	_pending_invites[target_id] = sender_id
	if multiplayer.get_peers().has(target_id):
		var inviter_class: String = str(_peer_user[sender_id].get("class_id", "?"))
		rpc_id(target_id, "party_invite_received", inviter_class)

@rpc("any_peer", "reliable")
func accept_party_invite() -> void:
	if not _is_server:
		return
	var sender_id := multiplayer.get_remote_sender_id()
	if not _pending_invites.has(sender_id):
		if multiplayer.get_peers().has(sender_id):
			rpc_id(sender_id, "party_error", "Bekleyen bir davet yok.")
		return
	var inviter_id: int = _pending_invites[sender_id]
	_pending_invites.erase(sender_id)
	if not _peer_user.has(inviter_id):
		return
	var party_id: int = _party_of.get(inviter_id, inviter_id)
	_party_of[inviter_id] = party_id
	_party_of[sender_id] = party_id
	print("PARTY_FORMED party_id=", party_id, " members=", _party_members(party_id))
	_broadcast_party_update(party_id)

@rpc("any_peer", "reliable")
func leave_party() -> void:
	if not _is_server:
		return
	var sender_id := multiplayer.get_remote_sender_id()
	if not _party_of.has(sender_id):
		return
	var party_id: int = _party_of[sender_id]
	_party_of.erase(sender_id)
	if multiplayer.get_peers().has(sender_id):
		rpc_id(sender_id, "party_error", "Partiden ayrıldın.")
	_broadcast_party_update(party_id)

func _party_members(party_id: int) -> Array:
	var members: Array = []
	for pid in _party_of.keys():
		if _party_of[pid] == party_id:
			members.append(pid)
	return members

func _broadcast_party_update(party_id: int) -> void:
	var members := _party_members(party_id)
	var names := PackedStringArray()
	for pid in members:
		names.append(str(_peer_user.get(pid, {}).get("class_id", "?")))
	var text := "Parti (%d kişi): %s" % [members.size(), ", ".join(names)]
	for pid in members:
		if multiplayer.get_peers().has(pid):
			rpc_id(pid, "party_update", text)

@rpc("authority", "reliable")
func party_invite_received(inviter_class: String) -> void:
	status_label.text = "%s seni partiye davet etti — kabul için O'ya bas." % inviter_class
	if "--auto-party" in OS.get_cmdline_args():
		rpc_id(1, "accept_party_invite")

@rpc("authority", "reliable")
func party_update(text: String) -> void:
	status_label.text = text

@rpc("authority", "reliable")
func party_error(message: String) -> void:
	status_label.text = message

# --- Ödül: sunucu Node internal API'sine yazar, sonucu öldüren istemciye bildirir. ---

func _send_reward(peer_id: int, user_id: int, silver: int, xp: int, item_def_id: String) -> void:
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_reward_response.bind(http, peer_id))
	var payload := {"userId": user_id, "silver": silver, "xp": xp}
	if item_def_id != "":
		payload["itemDefId"] = item_def_id
	var body := JSON.stringify(payload)
	var headers := [
		"Content-Type: application/json",
		"X-Internal-Secret: " + _internal_secret(),
	]
	var err := http.request(_node_api_base() + "/internal/reward-kill", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		print("REWARD_REQUEST_FAILED peer=", peer_id, " err=", err)
		http.queue_free()

func _on_reward_response(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest, peer_id: int) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK or code != 200:
		print("REWARD_FAILED peer=", peer_id, " code=", code)
		return
	var data = json.get_data()
	var inner: Dictionary = data.get("data", {})
	# Faz D — _peer_user[peer_id]["level"] sadece bağlantı anında (auth
	# response) set ediliyordu, oturum içinde seviye atladıkça hiç
	# güncellenmiyordu. Seviye kapılı yetenek sistemi (request_use_ability)
	# bu değeri canlı okuduğu için, her ödül yanıtında (leveledUp şartından
	# BAĞIMSIZ) güncelliyoruz.
	if _peer_user.has(peer_id):
		_peer_user[peer_id]["level"] = int(inner.get("level", _peer_user[peer_id]["level"]))
	var msg := "Düşman öldürüldü! Seviye %d, Gümüş %d, Tecrübe %d" % [
		int(inner.get("level", 1)), int(inner.get("silver", 0)), int(inner.get("xp", 0)),
	]
	if inner.get("leveledUp", false):
		msg += " — SEVİYE ATLADIN!"
	var dropped = inner.get("droppedItem")
	if dropped != null:
		msg += " | Düştü: %s" % str(dropped.get("name", "?"))
	print("REWARD peer=", peer_id, " -> ", msg)
	if multiplayer.get_peers().has(peer_id):
		rpc_id(peer_id, "reward_notification", msg)

@rpc("authority", "reliable")
func reward_notification(message: String) -> void:
	status_label.text = message
	print("REWARD_NOTIFICATION: ", message)

# --- Faz C: can iksiri kullanma. Godot sunucusu HANGİ envanter satırının
# kullanılacağını hiç bilmiyor — backend en eski (FIFO) consumable satırını
# seçip siler (bkz. plans/humble-chasing-galaxy.md "Faz C.5"). ---

@rpc("any_peer", "reliable")
func request_use_potion() -> void:
	if not _is_server:
		return
	var sender_id := multiplayer.get_remote_sender_id()
	if not _peer_user.has(sender_id):
		return
	var now := Time.get_ticks_msec() / 1000.0
	if now - _last_potion_use.get(sender_id, 0.0) < POTION_USE_COOLDOWN:
		return
	var player_name := str(sender_id)
	if not has_node(player_name):
		return
	var player: Node2D = get_node(player_name)
	if player.health >= player.max_health:
		if multiplayer.get_peers().has(sender_id):
			rpc_id(sender_id, "reward_notification", "Can zaten dolu.")
		return
	_last_potion_use[sender_id] = now
	_send_use_potion(sender_id, int(_peer_user[sender_id]["user_id"]), player)

func _send_use_potion(peer_id: int, user_id: int, player: Node2D) -> void:
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_use_potion_response.bind(http, peer_id, player))
	var body := JSON.stringify({"userId": user_id})
	var headers := [
		"Content-Type: application/json",
		"X-Internal-Secret: " + _internal_secret(),
	]
	var err := http.request(_node_api_base() + "/internal/use-potion", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		print("USE_POTION_REQUEST_FAILED peer=", peer_id, " err=", err)
		http.queue_free()

func _on_use_potion_response(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest, peer_id: int, player: Node2D) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK or code != 200:
		if multiplayer.get_peers().has(peer_id):
			rpc_id(peer_id, "reward_notification", "Can iksirin yok.")
		return
	var inner: Dictionary = json.get_data().get("data", {})
	var heal: float = float(inner.get("healAmount", 0))
	if is_instance_valid(player):
		player.health = min(player.max_health, player.health + heal)
		_broadcast_health(str(peer_id), player.health)
	if multiplayer.get_peers().has(peer_id):
		rpc_id(peer_id, "reward_notification", "Can iksiri kullandın! (+%d)" % int(heal))
