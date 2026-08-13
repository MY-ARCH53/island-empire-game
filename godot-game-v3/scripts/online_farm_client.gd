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

# Bölgeli farm haritası (bkz. plans/humble-chasing-galaxy.md "Bölgeli
# farm haritası") — sadece görüntüleme için, godot-server/scripts/main.gd
# → ZONES'un yarıçap/isim kısmının bir aynası (oynanış mantığı yok,
# sadece "hangi bölgedeyim" göstergesi için).
const ZONE_DISPLAY := [
	{"max_r": 350.0,  "name": "Tier 1 — Sakin Bölge"},
	{"max_r": 700.0,  "name": "Tier 2 — Orta Bölge"},
	{"max_r": 1050.0, "name": "Tier 3 — Tehlikeli Bölge"},
	{"max_r": INF,    "name": "Tier 4 — Elit Bölge"},
]
const TOAST_HOLD_SEC := 3.0
const TOAST_FADE_SEC := 1.0

@onready var spawner: MultiplayerSpawner = $PlayerSpawner
@onready var status_label: Label = $UI/StatusLabel
@onready var zone_label: Label = $UI/ZoneLabel
@onready var toast_label: Label = $UI/ToastLabel
@onready var leave_button: Button = $UI/LeaveButton
@onready var camera: Camera2D = $Camera2D

var _local_player_id: int = -1
var _last_zone_name: String = ""
var _toast_tween: Tween

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
	Audio.play_music("farm")
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

# Kamera, `Camera2D` haritanın kök düğümüne bağlı olduğu için varsayılan
# olarak (0,0)'da sabit duruyordu — bölgeli sistem öncesi küçük harita
# için sorun değildi, ama artık dünya 1400 yarıçapa kadar genişlediğinden
# (bkz. ZONES) oyuncuyu takip etmezse Tier2-4'teki her şey görünmez
# kalırdı. Oyuncu düğümü çocuk olarak eklenemiyor (dinamik spawn oluyor),
# o yüzden her karede pozisyonunu elle senkronize ediyoruz.
func _process(_delta: float) -> void:
	var me_name := str(_local_player_id)
	if not has_node(me_name):
		return
	var me_pos: Vector2 = get_node(me_name).position
	camera.position = me_pos
	_update_zone_label(me_pos)

func _update_zone_label(pos: Vector2) -> void:
	var dist := pos.length()
	var zone_name := ""
	for zone in ZONE_DISPLAY:
		if dist <= zone["max_r"]:
			zone_name = zone["name"]
			break
	if zone_name != _last_zone_name:
		_last_zone_name = zone_name
		zone_label.text = "Bölge: %s" % zone_name

func _on_connected_to_server() -> void:
	_local_player_id = multiplayer.get_unique_id()
	status_label.text = "Kimlik doğrulanıyor..."
	rpc_id(1, "submit_auth", _resolve_jwt())

func _on_connection_failed() -> void:
	status_label.text = "Sunucuya bağlanılamadı."

func _on_server_disconnected() -> void:
	status_label.text = "Sunucu bağlantısı koptu."
	Audio.stop_music()

func _spawn_player(data: Dictionary) -> Node2D:
	var id: int = int(data["id"])
	var player: Node2D = OnlineRemotePlayerScene.instantiate()
	player.name = str(id)
	player.class_id = str(data.get("class_id", "koylu"))
	player.set_multiplayer_authority(id)
	player.position = Vector2(randf_range(-150.0, 150.0), randf_range(-150.0, 150.0))
	player.max_health = float(data.get("max_health", 120.0))
	player.health = player.max_health
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
	if success:
		status_label.text = ""
		_show_toast(message)
	else:
		status_label.text = message

@rpc("authority", "reliable")
func reward_notification(message: String) -> void:
	_show_toast(message)
	# Mesaj metni sunucuda zaten "SEVİYE ATLADIN!" ekliyor (bkz.
	# godot-server/scripts/main.gd → _fetch_reward) — protokole yeni bir
	# alan eklemeden, mevcut metinden ayırt ediyoruz.
	if message.find("SEVİYE ATLADIN") != -1:
		Audio.play("levelup")
		var me_name := str(_local_player_id)
		if has_node(me_name):
			Effects.spawn_burst(self, get_node(me_name).position, Color(1.0, 0.9, 0.4), 22, 190.0)
	else:
		Audio.play("pickup", -6.0)

@rpc("authority", "reliable")
func party_invite_received(inviter_class: String) -> void:
	_show_toast("%s seni partiye davet etti — kabul için O'ya bas." % inviter_class)
	Audio.play("ui_click", -6.0)

@rpc("authority", "reliable")
func party_update(text: String) -> void:
	_show_toast(text)
	Audio.play("ui_click", -8.0)

@rpc("authority", "reliable")
func party_error(message: String) -> void:
	_show_toast(message)

# Faz B — düşman temas hasarı → oyuncu canı. PvP'nin health_update
# handler'ından neredeyse birebir kopya (bkz. online_pvp_client.gd) —
# flash/uçan hasar sayısı/kamera sarsıntısı/ses hepsi aynı desen.
@rpc("authority", "reliable")
func health_update(player_name: String, new_health: float) -> void:
	if not has_node(player_name):
		return
	var node = get_node(player_name)
	var old_health: float = node.health
	node.health = new_health
	var dmg: float = old_health - new_health
	if dmg <= 0.0:
		return
	node.flash_hit()
	Effects.spawn_floating_text(self, node.global_position, "-%d" % int(round(dmg)), Color(1.0, 0.35, 0.35))
	Audio.play("hit", -10.0, randf_range(0.85, 1.15))
	if player_name == str(_local_player_id):
		Audio.play("player_hurt", -4.0, randf_range(0.9, 1.05))
		camera.shake(clampf(dmg * 0.15, 2.0, 10.0))

@rpc("authority", "reliable")
func farm_death_notification(message: String) -> void:
	_show_toast(message)
	Audio.play("game_over", -6.0)

# position client-otoriter bir alan (movement zaten böyle çalışıyor) —
# sunucu bizi doğrudan ışınlayamaz, "kendi pozisyonunu buna ayarla" der,
# biz kendi otoriter alanımızı değiştiririz (bkz. main.gd → _on_player_died
# notu, gerçek testte yakalanan bir bug'ın düzeltmesi).
@rpc("authority", "reliable")
func respawn_teleport(new_position: Vector2) -> void:
	var me_name := str(_local_player_id)
	if has_node(me_name):
		get_node(me_name).position = new_position

# Tek bir StatusLabel'ı sürekli üst üste yazan mesajlarla doldurmak yerine
# (parti daveti gibi önemli bir mesaj, hemen ardından gelen bir ödül
# bildirimiyle fark edilmeden silinebiliyordu) — solup giden ayrı bir
# "toast" etiketi: 3sn tam görünür, 1sn içinde solar.
func _show_toast(text: String) -> void:
	toast_label.text = text
	if _toast_tween:
		_toast_tween.kill()
	toast_label.modulate.a = 1.0
	_toast_tween = create_tween()
	_toast_tween.tween_interval(TOAST_HOLD_SEC)
	_toast_tween.tween_property(toast_label, "modulate:a", 0.0, TOAST_FADE_SEC)

func leave_map() -> void:
	Audio.stop_music()
	if multiplayer.multiplayer_peer:
		multiplayer.multiplayer_peer.close()
	get_tree().change_scene_to_file("res://scenes/MainMenu.tscn")

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		leave_map()
