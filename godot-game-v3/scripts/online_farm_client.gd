extends Node2D

# "Kan Adası: Online" — farm haritasının GERÇEK OYUNCU istemcisi. Bu,
# godot-server/scripts/main.gd'nin (dedicated sunucu) İSTEMCİ rolünün
# godot-game-v3 içine taşınmış hâli — sunucu tarafı burada YOK, çünkü bu
# script gerçek oyuncunun makinesinde çalışıyor, dedicated sunucuda değil.
# Faz 0'da kanıtlanan gotcha: MultiplayerSpawner'ın spawn_function'ı
# istemcide de aynı şekilde tanımlı olmalı (sunucunun "şu id spawn oldu"
# mesajını doğru sahneye çevirebilmek için).
#
# Sunucu adresi: editörde/debug build'de localhost, gerçek (export edilmiş)
# build'de prod VPS — `backend_bridge.gd → _api_base()` ile aynı desen.
# `godot-server` 2026-08-13'te islandsempire.com'a deploy edildi (bkz.
# plans/humble-chasing-galaxy.md).

const PORT := 9050
const LOCAL_HOST := "127.0.0.1"
const PROD_HOST := "islandsempire.com"

const OnlineRemotePlayerScene := preload("res://scenes/OnlineRemotePlayer.tscn")

@onready var spawner: MultiplayerSpawner = $PlayerSpawner
@onready var status_label: Label = $UI/StatusLabel
@onready var leave_button: Button = $UI/LeaveButton

var _local_player_id: int = -1

func _server_host() -> String:
	var override := OS.get_environment("FARM_SERVER_HOST")
	if override != "":
		return override
	if OS.has_feature("editor") or OS.is_debug_build():
		return LOCAL_HOST
	return PROD_HOST

# Normalde GameManager.jwt_token kullanılır (gerçek oyuncu akışı). Sadece
# otomatik test için: --token=<jwt> cmdline argümanı varsa onu kullan
# (bkz. godot-server'daki aynı test deseni).
func _resolve_jwt() -> String:
	for arg in OS.get_cmdline_args():
		if arg.begins_with("--token="):
			return arg.substr("--token=".length())
	return GameManager.jwt_token

func _ready() -> void:
	spawner.spawn_function = _spawn_player
	leave_button.pressed.connect(leave_map)
	var peer := WebSocketMultiplayerPeer.new()
	var err := peer.create_client("ws://%s:%d" % [_server_host(), PORT])
	if err != OK:
		status_label.text = "Bağlantı hatası (err=%d)" % err
		return
	multiplayer.multiplayer_peer = peer
	multiplayer.connected_to_server.connect(_on_connected_to_server)
	multiplayer.connection_failed.connect(_on_connection_failed)
	multiplayer.server_disconnected.connect(_on_server_disconnected)
	status_label.text = "Bağlanıyor..."

func _on_connected_to_server() -> void:
	_local_player_id = multiplayer.get_unique_id()
	status_label.text = "Kimlik doğrulanıyor..."
	rpc_id(1, "submit_auth", _resolve_jwt())

func _on_connection_failed() -> void:
	status_label.text = "Sunucuya bağlanılamadı."

func _on_server_disconnected() -> void:
	status_label.text = "Sunucu bağlantısı koptu."

func _spawn_player(data: Dictionary) -> Node2D:
	var id: int = int(data["id"])
	var player: Node2D = OnlineRemotePlayerScene.instantiate()
	player.name = str(id)
	player.class_id = str(data.get("class_id", "koylu"))
	player.set_multiplayer_authority(id)
	player.position = Vector2(randf_range(-150.0, 150.0), randf_range(-150.0, 150.0))
	return player

# submit_auth/request_attack'ın GÖVDESİ sadece sunucuda çalışır (bkz.
# godot-server/scripts/main.gd). Burada sadece @rpc imzası olarak duruyorlar
# — Godot, rpc_id() ile giden bir çağrının aktarım modunu belirlemek için
# ÇAĞIRAN tarafta da aynı isimde yapılandırılmış bir RPC arıyor, yoksa
# "Unable to get the RPC configuration" hatası veriyor (bu proje bunu
# elle keşfetti — main.gd'de bu sorun hiç çıkmadı çünkü orada aynı script
# hem sunucu hem istemci rolünde çalışıyor, gövdeler zaten mevcuttu).
@rpc("any_peer", "reliable")
func submit_auth(_token: String) -> void:
	pass

@rpc("any_peer", "reliable")
func request_attack(_enemy_name: String) -> void:
	pass

# Faz 5 — parti (davet/kabul/ayrıl), bkz. godot-server/scripts/main.gd.
@rpc("any_peer", "reliable")
func request_party_invite(_target_name: String) -> void:
	pass

@rpc("any_peer", "reliable")
func accept_party_invite() -> void:
	pass

@rpc("any_peer", "reliable")
func leave_party() -> void:
	pass

@rpc("authority", "reliable")
func auth_result(success: bool, message: String) -> void:
	status_label.text = message

@rpc("authority", "reliable")
func reward_notification(message: String) -> void:
	status_label.text = message

@rpc("authority", "reliable")
func party_invite_received(inviter_class: String) -> void:
	status_label.text = "%s seni partiye davet etti — kabul için O'ya bas." % inviter_class

@rpc("authority", "reliable")
func party_update(text: String) -> void:
	status_label.text = text

@rpc("authority", "reliable")
func party_error(message: String) -> void:
	status_label.text = message

func leave_map() -> void:
	if multiplayer.multiplayer_peer:
		multiplayer.multiplayer_peer.close()
	get_tree().change_scene_to_file("res://scenes/MainMenu.tscn")

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		leave_map()
