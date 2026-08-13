extends Node2D

# "Kan Adası: Online" — PvP haritasının GERÇEK OYUNCU istemcisi. bkz.
# online_farm_client.gd'deki notlar (aynı desen, farm yerine PvP
# sunucusuna bağlanıyor — ayrı port, ayrı dedicated süreç).

const PORT := 9051
const LOCAL_HOST := "127.0.0.1"
const PROD_HOST := "islandsempire.com"

const OnlinePvpPlayerScene := preload("res://scenes/OnlinePvpPlayer.tscn")

@onready var spawner: MultiplayerSpawner = $PlayerSpawner
@onready var status_label: Label = $UI/StatusLabel
@onready var leave_button: Button = $UI/LeaveButton

var _local_player_id: int = -1

func _server_host() -> String:
	var override := OS.get_environment("PVP_SERVER_HOST")
	if override != "":
		return override
	if OS.has_feature("editor") or OS.is_debug_build():
		return LOCAL_HOST
	return PROD_HOST

# Normalde GameManager.jwt_token kullanılır (gerçek oyuncu akışı). Sadece
# otomatik test için: --token=<jwt> cmdline argümanı varsa onu kullan.
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
	var player: Node2D = OnlinePvpPlayerScene.instantiate()
	player.name = str(id)
	player.class_id = str(data.get("class_id", "koylu"))
	player.set_multiplayer_authority(id)
	player.position = Vector2(randf_range(-150.0, 150.0), randf_range(-150.0, 150.0))
	return player

# submit_auth/request_pvp_attack'ın GÖVDESİ sadece sunucuda çalışır (bkz.
# godot-server/scripts/pvp_main.gd). Sadece @rpc imzası için burada duruyorlar
# — bkz. online_farm_client.gd'deki aynı notlar.
@rpc("any_peer", "reliable")
func submit_auth(_token: String) -> void:
	pass

@rpc("any_peer", "reliable")
func request_pvp_attack(_target_name: String) -> void:
	pass

@rpc("authority", "reliable")
func auth_result(success: bool, message: String) -> void:
	status_label.text = message

@rpc("authority", "reliable")
func health_update(player_name: String, new_health: float) -> void:
	if has_node(player_name):
		get_node(player_name).health = new_health

@rpc("authority", "reliable")
func pvp_kill_notification(message: String) -> void:
	status_label.text = message

func leave_map() -> void:
	if multiplayer.multiplayer_peer:
		multiplayer.multiplayer_peer.close()
	get_tree().change_scene_to_file("res://scenes/MainMenu.tscn")

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		leave_map()
