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
const ENEMY_COUNT := 5
const RESPAWN_DELAY := 4.0
const COMMON_DROPS := ["wooden_sword", "cloth_armor", "wooden_shield"]
const DROP_CHANCE := 0.35

const FarmEnemyScene := preload("res://scenes/FarmEnemy.tscn")

@onready var spawner: MultiplayerSpawner = $PlayerSpawner
@onready var status_label: Label = $UI/StatusLabel

var _is_server: bool = false
var _peer_user: Dictionary = {}       # peer_id -> {user_id, class_id, level}
var _last_attack_time: Dictionary = {}  # peer_id -> float saniye
var _enemy_counter: int = 0

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
	var node_name := str(id)
	if has_node(node_name):
		get_node(node_name).queue_free()

func _spawn_player(id: int) -> Node2D:
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
	spawner.spawn(peer_id)
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
	for i in range(12):
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
					me.position = me.position.move_toward(nearest.position, ATTACK_RANGE * 0.6)
				else:
					rpc_id(1, "request_attack", nearest.name)
		await get_tree().create_timer(0.5).timeout
	var img := get_viewport().get_texture().get_image()
	img.save_png("res://farm_test_client_%d.png" % _local_player_id)
	print("AUTO_ATTACK_DONE id=", _local_player_id)

# --- Düşmanlar (sadece sunucu spawn eder; MultiplayerSpawner'ın
# spawnable_scenes listesi sayesinde istemcilere otomatik replike olur). ---

func _spawn_initial_enemies() -> void:
	for i in range(ENEMY_COUNT):
		_spawn_one_enemy()

func _spawn_one_enemy() -> void:
	var enemy: Node2D = FarmEnemyScene.instantiate()
	enemy.name = "enemy_%d" % _enemy_counter
	_enemy_counter += 1
	enemy.position = Vector2(randf_range(-250.0, 250.0), randf_range(-250.0, 250.0))
	enemy.died.connect(_on_enemy_died.bind(enemy))
	add_child(enemy)

func _on_enemy_died(killer_peer_id: int, enemy: Node2D) -> void:
	if not _is_server:
		return
	var user_info: Dictionary = _peer_user.get(killer_peer_id, {})
	var user_id: int = int(user_info.get("user_id", -1))
	var xp_reward: int = enemy.xp_reward
	var silver_reward: int = enemy.silver_reward
	var drop_id := _roll_item_drop()
	enemy.queue_free()
	if user_id != -1:
		_send_reward(killer_peer_id, user_id, silver_reward, xp_reward, drop_id)
	await get_tree().create_timer(RESPAWN_DELAY).timeout
	_spawn_one_enemy()

func _roll_item_drop() -> String:
	if randf() > DROP_CHANCE:
		return ""
	return COMMON_DROPS[randi() % COMMON_DROPS.size()]

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
