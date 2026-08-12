extends Node2D

# Faz 0 — çok oyunculu mimari doğrulama prototipi.
# Aynı script hem sunucu hem istemci rolünde çalışır (Godot'un çoklu oyuncu
# replikasyonu, MultiplayerSpawner yapılandırmasının TÜM eşlerde aynı olmasını
# gerektirir — bu yüzden ayrı sunucu/istemci sahneleri yerine tek bir sahne,
# komut satırı argümanıyla ("--server") rol seçiyor).

const PORT := 9050
const HOST := "127.0.0.1"

@onready var spawner: MultiplayerSpawner = $PlayerSpawner
@onready var status_label: Label = $UI/StatusLabel

var _is_server: bool = false

func _ready() -> void:
	spawner.spawn_function = _spawn_player
	_is_server = "--server" in OS.get_cmdline_args()
	if _is_server:
		_start_server()
	else:
		_start_client()

func _start_server() -> void:
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
	var id := multiplayer.get_unique_id()
	print("CLIENT_CONNECTED id=", id)
	status_label.text = "İSTEMCİ — id %d (WASD ile hareket et)" % id
	if "--auto-shot" in OS.get_cmdline_args():
		_run_auto_shot_test(id)

# Faz 0 doğrulama yardımcısı: bağlandıktan sonra bir süre farklı yönde hareket
# edip periyodik ekran görüntüsü alır — MCP'de screenshot aracı olmadığından
# (bu oturumda defalarca kullanılan teknik) sonucu PNG olarak gözle incelemek için.
func _run_auto_shot_test(id: int) -> void:
	await get_tree().create_timer(1.0).timeout
	for i in range(3):
		var dir := Vector2.RIGHT if id % 2 == 0 else Vector2.DOWN
		var move_seconds := 0.8
		var t := 0.0
		while t < move_seconds:
			if has_node(str(id)):
				get_node(str(id)).position += dir * 220.0 * get_process_delta_time()
			await get_tree().process_frame
			t += get_process_delta_time()
		var img := get_viewport().get_texture().get_image()
		img.save_png("res://mp_test_client_%d_shot%d.png" % [id, i])
		await get_tree().create_timer(0.4).timeout
	print("AUTO_SHOT_DONE id=", id)

func _on_connection_failed() -> void:
	print("CLIENT_CONNECTION_FAILED")
	status_label.text = "BAĞLANTI BAŞARISIZ"

func _on_server_disconnected() -> void:
	print("CLIENT_SERVER_DISCONNECTED")
	status_label.text = "SUNUCU BAĞLANTISI KOPTU"

func _on_peer_connected(id: int) -> void:
	print("PEER_CONNECTED id=", id)
	spawner.spawn(id)

func _on_peer_disconnected(id: int) -> void:
	print("PEER_DISCONNECTED id=", id)
	var node_name := str(id)
	if has_node(node_name):
		get_node(node_name).queue_free()

func _spawn_player(id: int) -> Node2D:
	var player_scene: PackedScene = load("res://scenes/RemotePlayer.tscn")
	var player: Node2D = player_scene.instantiate()
	player.name = str(id)
	player.set_multiplayer_authority(id)
	player.position = Vector2(randf_range(-120.0, 120.0), randf_range(-120.0, 120.0))
	return player
