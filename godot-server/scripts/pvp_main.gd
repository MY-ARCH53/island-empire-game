extends Node2D

# Faz 3 — PvP haritası (KO Bifrost esintili). main.gd (farm) ile aynı desen:
# kimlik doğrulama, sunucu-otoriter saldırı doğrulama. Farktan sadece
# hedefin bir düşman değil BAŞKA BİR OYUNCU olması ve ödülün gümüş/exp
# yerine NP olması var. Ayrı port (9051) → farm ve PvP tamamen izole,
# aynı anda iki ayrı headless süreç olarak çalışabilirler.

const PORT := 9051
const HOST := "127.0.0.1"
const ATTACK_RANGE := 60.0
const ATTACK_COOLDOWN := 0.6
const ATTACK_DAMAGE := 20.0
const BASE_MAX_HEALTH := 100.0
const MIN_DAMAGE := 1.0

const PvpPlayerScene := preload("res://scenes/PvpPlayer.tscn")

@onready var spawner: MultiplayerSpawner = $PlayerSpawner
@onready var status_label: Label = $UI/StatusLabel

var _is_server: bool = false
var _peer_user: Dictionary = {}       # peer_id -> {user_id, class_id, level}
var _last_attack_time: Dictionary = {}  # peer_id -> float saniye

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
	print("PVP_SERVER_STARTED port=", PORT)
	status_label.text = "PVP SUNUCU — port %d" % PORT

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

func _spawn_player(data: Dictionary) -> Node2D:
	var id: int = int(data["id"])
	var player: Node2D = PvpPlayerScene.instantiate()
	player.name = str(id)
	player.set_multiplayer_authority(id)
	player.position = Vector2(randf_range(-150.0, 150.0), randf_range(-150.0, 150.0))
	player.max_health = float(data.get("max_health", BASE_MAX_HEALTH))
	player.health = player.max_health
	return player

# --- Kimlik doğrulama: farm sunucusuyla birebir aynı desen (bkz. main.gd). ---

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
	var guild = character.get("guild")
	_peer_user[peer_id] = {
		"user_id": int(inner["userId"]),
		"class_id": str(character.get("class_id", "koylu")),
		"level": int(character.get("level", 1)),
		# Faz 4 — kuşanılan eşyanın savaş etkisi (bkz. backend/src/utils/onlineStats.js).
		"damage_bonus": float(equipped.get("damageBonus", 0)),
		"armor_bonus": float(equipped.get("armorBonus", 0)),
		"max_health_bonus": float(equipped.get("maxHealthBonus", 0)),
		# Faz 5 — aynı klandan oyuncular birbirine hasar veremez (-1 = klansız).
		"guild_id": (int(guild["guildId"]) if guild != null else -1),
	}
	print("AUTH_OK peer=", peer_id, " user_id=", _peer_user[peer_id]["user_id"], " class=", _peer_user[peer_id]["class_id"])
	# max_health'i spawn verisine ekliyoruz — sadece sunucunun kendi
	# instantiate ettiği kopyaya (_spawn_player) yazmak yetmez, GERÇEK
	# istemciye hiç ulaşmaz (bkz. main.gd'de aynı bug'ın Faz B'de
	# bulunup düzeltilmesi — burada da aynı desen kopyalanmıştı).
	var spawn_max_health: float = BASE_MAX_HEALTH + float(_peer_user[peer_id]["max_health_bonus"])
	spawner.spawn({"id": peer_id, "class_id": _peer_user[peer_id]["class_id"], "max_health": spawn_max_health})
	rpc_id(peer_id, "auth_result", true, "Hoş geldin, %s! (WASD hareket, SPACE saldırı — PvP alanı!)" % _peer_user[peer_id]["class_id"])

@rpc("authority", "reliable")
func auth_result(success: bool, message: String) -> void:
	status_label.text = message
	if success and "--auto-attack" in OS.get_cmdline_args():
		_run_auto_attack_test()

# Faz 3 doğrulama yardımcısı: kimlik doğrulandıktan sonra en yakın diğer
# oyuncuya doğru yürüyüp periyodik olarak saldırı isteği gönderir.
func _run_auto_attack_test() -> void:
	await get_tree().create_timer(0.5).timeout
	for i in range(16):
		var me_name := str(_local_player_id)
		if has_node(me_name):
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
				if nearest_dist > ATTACK_RANGE:
					me.position = me.position.move_toward(nearest.position, ATTACK_RANGE * 0.6)
				else:
					rpc_id(1, "request_pvp_attack", nearest.name)
		await get_tree().create_timer(0.5).timeout
	print("AUTO_ATTACK_DONE id=", _local_player_id)

# --- Saldırı: istemci "bu oyuncuya vurmak istiyorum" der, sunucu menzil/
# bekleme süresini doğrulayıp hasarı SUNUCUDA uygular. Ölümde NP değişimi
# Node internal API'sine yazılır (bkz. /api/internal/pvp-kill). ---

@rpc("any_peer", "reliable")
func request_pvp_attack(target_name: String) -> void:
	if not _is_server:
		return
	var sender_id := multiplayer.get_remote_sender_id()
	if not _peer_user.has(sender_id):
		return
	var target_id := int(target_name) if target_name.is_valid_int() else -1
	if target_id == -1 or not _peer_user.has(target_id) or target_id == sender_id:
		return
	# Faz 5 — aynı klandan oyuncular birbirine hasar veremez (KO'daki
	# "aynı krallık dost ateşi yok" hissinin hafif bir karşılığı).
	var sender_guild: int = int(_peer_user[sender_id].get("guild_id", -1))
	var target_guild: int = int(_peer_user[target_id].get("guild_id", -1))
	if sender_guild != -1 and sender_guild == target_guild:
		if multiplayer.get_peers().has(sender_id):
			rpc_id(sender_id, "pvp_kill_notification", "Aynı klandan bir üyeye saldıramazsın.")
		return
	var now := Time.get_ticks_msec() / 1000.0
	var last: float = _last_attack_time.get(sender_id, 0.0)
	if now - last < ATTACK_COOLDOWN:
		return
	var attacker_name := str(sender_id)
	if not has_node(attacker_name) or not has_node(target_name):
		return
	var attacker: Node2D = get_node(attacker_name)
	var target: Node2D = get_node(target_name)
	if attacker.position.distance_to(target.position) > ATTACK_RANGE:
		return
	_last_attack_time[sender_id] = now
	var damage_bonus: float = float(_peer_user[sender_id].get("damage_bonus", 0))
	var armor_bonus: float = float(_peer_user[target_id].get("armor_bonus", 0))
	var damage: float = max(MIN_DAMAGE, (ATTACK_DAMAGE + damage_bonus) - armor_bonus)
	target.health -= damage
	_broadcast_health(target_name, target.health)
	if target.health <= 0.0:
		_on_player_killed(sender_id, target_id, target)

# health, position'ın aksine SUNUCU otoriter (oyuncunun kendi can değerini
# replikasyonla göndermesine izin vermiyoruz — aksi halde istemcinin hiç
# değişmemiş can değeri sunucudaki gerçek düşürümü ezer). Bu yüzden
# PvpPlayer.tscn'in SceneReplicationConfig'inde health YOK; bunun yerine
# her değişiklik sunucudan tüm eşlere açıkça RPC ile yayınlanır.
func _broadcast_health(player_name: String, new_health: float) -> void:
	for peer_id in multiplayer.get_peers():
		rpc_id(peer_id, "health_update", player_name, new_health)

@rpc("authority", "reliable")
func health_update(player_name: String, new_health: float) -> void:
	if has_node(player_name):
		get_node(player_name).health = new_health

func _on_player_killed(killer_peer_id: int, victim_peer_id: int, victim: Node2D) -> void:
	var killer_user_id: int = int(_peer_user.get(killer_peer_id, {}).get("user_id", -1))
	var victim_user_id: int = int(_peer_user.get(victim_peer_id, {}).get("user_id", -1))
	if killer_user_id != -1 and victim_user_id != -1:
		_send_pvp_kill(killer_peer_id, victim_peer_id, killer_user_id, victim_user_id)
	victim.health = victim.max_health
	victim.position = Vector2(randf_range(-150.0, 150.0), randf_range(-150.0, 150.0))
	_broadcast_health(str(victim_peer_id), victim.health)

func _send_pvp_kill(killer_peer_id: int, victim_peer_id: int, killer_user_id: int, victim_user_id: int) -> void:
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_pvp_kill_response.bind(http, killer_peer_id, victim_peer_id))
	var body := JSON.stringify({"killerUserId": killer_user_id, "victimUserId": victim_user_id})
	var headers := [
		"Content-Type: application/json",
		"X-Internal-Secret: " + _internal_secret(),
	]
	var err := http.request(_node_api_base() + "/internal/pvp-kill", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		print("PVP_KILL_REQUEST_FAILED killer=", killer_peer_id, " err=", err)
		http.queue_free()

func _on_pvp_kill_response(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest, killer_peer_id: int, victim_peer_id: int) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK or code != 200:
		print("PVP_KILL_FAILED killer=", killer_peer_id, " code=", code)
		return
	var data = json.get_data()
	var inner: Dictionary = data.get("data", {})
	var killer_np := int(inner.get("killerNp", 0))
	var victim_np := int(inner.get("victimNp", 0))
	print("PVP_KILL killer=", killer_peer_id, " (NP=", killer_np, ") victim=", victim_peer_id, " (NP=", victim_np, ")")
	if multiplayer.get_peers().has(killer_peer_id):
		rpc_id(killer_peer_id, "pvp_kill_notification", "Rakibi öldürdün! +50 NP (toplam %d)" % killer_np)
	if multiplayer.get_peers().has(victim_peer_id):
		rpc_id(victim_peer_id, "pvp_kill_notification", "Öldürüldün! -50 NP (toplam %d)" % victim_np)

@rpc("authority", "reliable")
func pvp_kill_notification(message: String) -> void:
	status_label.text = message
	print("PVP_KILL_NOTIFICATION: ", message)
