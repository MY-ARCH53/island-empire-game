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

const FarmEnemyScene := preload("res://scenes/FarmEnemy.tscn")

# Bölgeli zorluk sistemi (ek özellik, 2026-08-13 — bkz.
# plans/humble-chasing-galaxy.md "Bölgeli farm haritası"). 4 iç içe halka,
# merkeze göre eşit 350 birim genişlikte. Düşman sayısı halkaların gerçek
# alan oranından (1:3:5:7) geliyor, rastgele değil. `pool`'daki tipler
# ENEMY_BASE_STATS'tan taban istatistiği alır, sonra difficulty_mult
# (can) / reward_mult (xp+gümüş) ile çarpılır; `elite=true` olan bölgede
# ayrıca ELITE_HEALTH_MULT/ELITE_REWARD_MULT uygulanır.
const ZONES := [
	{"name": "tier1", "min_r": 0.0,    "max_r": 350.0,  "pool": ["bat"],
	 "difficulty_mult": 1.0, "reward_mult": 1.0, "elite": false, "enemy_count": 4,
	 "drop_chance": 0.30, "rarity_weights": {"common": 1.0}},
	{"name": "tier2", "min_r": 350.0,  "max_r": 700.0,  "pool": ["skeleton", "ghost"],
	 "difficulty_mult": 1.8, "reward_mult": 2.0, "elite": false, "enemy_count": 12,
	 "drop_chance": 0.35, "rarity_weights": {"common": 0.65, "rare": 0.35}},
	{"name": "tier3", "min_r": 700.0,  "max_r": 1050.0, "pool": ["brute", "gulyabani"],
	 "difficulty_mult": 3.0, "reward_mult": 3.5, "elite": false, "enemy_count": 20,
	 "drop_chance": 0.40, "rarity_weights": {"common": 0.30, "rare": 0.50, "epic": 0.20}},
	{"name": "tier4", "min_r": 1050.0, "max_r": 1400.0, "pool": ["brute", "gulyabani"],
	 "difficulty_mult": 4.5, "reward_mult": 5.0, "elite": true, "enemy_count": 28,
	 "drop_chance": 0.50, "rarity_weights": {"common": 0.10, "rare": 0.30, "epic": 0.40, "legendary": 0.20}},
]
const ELITE_HEALTH_MULT := 1.3
const ELITE_REWARD_MULT := 1.5

# Farm-özel taban istatistikler — roguelite'ın Upgrades.ENEMIES'inden
# BİREBİR kopyalanmadı (o dict tek-oyunculu DPS/tempo için dengelenmiş,
# burada ATTACK_DAMAGE=12/ATTACK_COOLDOWN=0.6 farklı bir PvE döngüsü).
const ENEMY_BASE_STATS := {
	"bat":       {"health": 30.0, "xp": 8,  "silver": 5},
	"skeleton":  {"health": 55.0, "xp": 14, "silver": 10},
	"ghost":     {"health": 42.0, "xp": 12, "silver": 9},
	"brute":     {"health": 140.0, "xp": 30, "silver": 24},
	"gulyabani": {"health": 95.0, "xp": 22, "silver": 18},
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
	player.position = Vector2(randf_range(-150.0, 150.0), randf_range(-150.0, 150.0))
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
	}
	print("AUTH_OK peer=", peer_id, " user_id=", _peer_user[peer_id]["user_id"], " class=", _peer_user[peer_id]["class_id"])
	spawner.spawn({"id": peer_id, "class_id": _peer_user[peer_id]["class_id"]})
	rpc_id(peer_id, "auth_result", true, "Hoş geldin, %s! (WASD hareket, SPACE saldırı)" % _peer_user[peer_id]["class_id"])

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
	if test_zone != "":
		var zi := int(test_zone)
		var me_name0 := str(_local_player_id)
		if has_node(me_name0) and zi >= 0 and zi < ZONES.size():
			var me0: Node2D = get_node(me_name0)
			var zone: Dictionary = ZONES[zi]
			var mid_r: float = (float(zone["min_r"]) + float(zone["max_r"])) / 2.0
			me0.position = Vector2(mid_r, 0.0)
			print("ZONE_WARP zone=", zone["name"], " pos=", me0.position)
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
	print("TOTAL_ENEMIES_SPAWNED=", _enemy_counter)

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

func _spawn_one_enemy(zone_index: int) -> void:
	var zone: Dictionary = ZONES[zone_index]
	var pool: Array = zone["pool"]
	var enemy_type: String = pool[randi() % pool.size()]
	var base_stats: Dictionary = ENEMY_BASE_STATS[enemy_type]
	var is_elite: bool = zone["elite"]
	var health_mult: float = zone["difficulty_mult"] * (ELITE_HEALTH_MULT if is_elite else 1.0)
	var reward_mult: float = zone["reward_mult"] * (ELITE_REWARD_MULT if is_elite else 1.0)

	var enemy: Node2D = FarmEnemyScene.instantiate()
	enemy.name = "enemy_%d" % _enemy_counter
	_enemy_counter += 1
	enemy.max_health = base_stats["health"] * health_mult
	enemy.xp_reward = int(round(base_stats["xp"] * reward_mult))
	enemy.silver_reward = int(round(base_stats["silver"] * reward_mult))
	enemy.enemy_type = enemy_type
	enemy.is_elite = is_elite
	enemy.position = _random_zone_position(zone)
	enemy.died.connect(_on_enemy_died.bind(enemy))
	_enemy_zone[enemy.name] = zone_index
	add_child(enemy)

func _on_enemy_died(killer_peer_id: int, enemy: Node2D) -> void:
	if not _is_server:
		return
	var user_info: Dictionary = _peer_user.get(killer_peer_id, {})
	var user_id: int = int(user_info.get("user_id", -1))
	var xp_reward: int = enemy.xp_reward
	var silver_reward: int = enemy.silver_reward
	var zone_index: int = _enemy_zone.get(enemy.name, 0)
	var drop_id := _roll_item_drop(zone_index)
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
	await get_tree().create_timer(RESPAWN_DELAY).timeout
	_spawn_one_enemy(zone_index)

func _roll_item_drop(zone_index: int) -> String:
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
