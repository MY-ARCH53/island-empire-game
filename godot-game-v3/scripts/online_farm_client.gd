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

# Büyük Harita Genişlemesi (bkz. plans/humble-chasing-galaxy.md) — sadece
# görüntüleme için, godot-server/scripts/main.gd → ZONES'un yarıçap/isim
# kısmının bir aynası (oynanış mantığı yok, sadece "hangi bölgedeyim"
# göstergesi için).
const ZONE_DISPLAY := [
	{"max_r": 220.0,  "name": "Köy"},
	{"max_r": 750.0,  "name": "Tier 1 — Yeşil Çayır"},
	{"max_r": 1400.0, "name": "Tier 2 — Unutulmuş Mezarlık"},
	{"max_r": 2100.0, "name": "Tier 3 — Verimli Vadi"},
	{"max_r": 2800.0, "name": "Tier 4 — Yağmur Ormanı"},
	{"max_r": INF,    "name": "Tier 5 — Kızıl Lav Diyarı"},
]

# Faz F2 — köy + Tier1 (Yeşil Çayır) zemin portu. game.gd'deki (tek-oyunculu
# roguelite) _spawn_village()/_grass_envelope()/_paint_ground() mantığının
# birebir yeniden yazımı (kod paylaşılmıyor, sadece teknik port edildi).
# Basitleştirme: game.gd'de kıyı/deniz geçişi de var, burada YOK — Tier1'in
# ötesinde farklı bir biome (Faz F3'te mezarlık) başlıyor, deniz değil, o
# yüzden COAST_TAPER kısmı hiç yok.
const TerrainLookup := preload("res://assets/tileset/meadow_terrain_lookup.gd")
# Faz F3 — Tier2 "Unutulmuş Mezarlık", zaten ÜRETİLMİŞ ama hiç kullanılmayan
# graveyard_terrain.tres'in yeniden devreye alınması (0 yeni PixelLab
# maliyeti). "0"=çatlak mezarlık toprağı+kemik/kaldırım taşı, "1"=yamalı
# ölü çim+düşmüş yaprak (bkz. graveyard_tileset_metadata.json).
const GraveyardLookup := preload("res://assets/tileset/graveyard_terrain_lookup.gd")
# Faz F4 — Tier3 "Verimli Vadi", ilk YENİ PixelLab tileset (create_topdown_tileset,
# 32x32, meadow/graveyard ile aynı format). "0"=kuru toprak patika+çakıl,
# "1"=altın buğday tarlası (bkz. valley_tileset_metadata.json).
const ValleyLookup := preload("res://assets/tileset/valley_terrain_lookup.gd")
# Faz F5 — Tier4 "Yağmur Ormanı" tileset'i. "0"=bataklık çamuru+yaprak,
# "1"=sisli orman yaprağı+yosun (bkz. jungle_tileset_metadata.json).
const JungleLookup := preload("res://assets/tileset/jungle_terrain_lookup.gd")
# Faz F6 — Tier5 "Kızıl Lav Diyarı" tileset'i. "0"=çatlak obsidyen kaya,
# "1"=parlayan erimiş lav (bkz. lava_tileset_metadata.json).
const LavaLookup := preload("res://assets/tileset/lava_terrain_lookup.gd")
const HouseScene := preload("res://scenes/House.tscn")
const WellScene := preload("res://scenes/Well.tscn")
const HouseTextures := [
	preload("res://assets/props/house_thatch.png"),
	preload("res://assets/props/house_tile_roof.png"),
]
const WellTexture := preload("res://assets/props/well.png")
# Faz F9 — biome dekorasyonu (PixelLab create_map_object). Tree.tscn genel
# amaçlı bir "dekor obje" sahnesi (StaticBody2D+Sprite2D+set_texture(),
# House/Well'de de kullanılan aynı tree.gd script'i) — 9 yeni doku için
# YENİ bir sahne yazmaya gerek yok, hepsi bu tek sahneyi paylaşıyor.
const DecorScene := preload("res://scenes/Tree.tscn")
const TIER3_DECOR_TEXTURES := [
	preload("res://assets/props/hay_bale.png"),
	preload("res://assets/props/fence_post.png"),
	preload("res://assets/props/scarecrow.png"),
]
const TIER4_DECOR_TEXTURES := [
	preload("res://assets/props/giant_mushroom.png"),
	preload("res://assets/props/hanging_vine.png"),
	preload("res://assets/props/jungle_puddle.png"),
]
const TIER5_DECOR_TEXTURES := [
	preload("res://assets/props/obsidian_rocks.png"),
	preload("res://assets/props/ash_pile.png"),
	preload("res://assets/props/charred_log.png"),
]
const DECOR_COUNT_PER_TIER := 36
const VILLAGE_RADIUS := 220.0
const GRASS_RAMP_END := 370.0   # köy sınırından sonra çim yoğunluğu bu yarıçapa kadar artıyor
const TIER1_MAX_R := 750.0      # köy+Tier1 sınırı
const GROUND_CELL := 32
const GROUND_MAX_CELL := 24     # ceil(TIER1_MAX_R / GROUND_CELL)
const TIER2_MIN_R := 750.0
const TIER2_MAX_R := 1400.0     # Faz F3 kapsamı: köy+Tier1+Tier2
const TIER2_MAX_CELL := 44      # ceil(TIER2_MAX_R / GROUND_CELL)
const TIER2_GRASS_RATIO := 0.4  # ölü çim/toprak karışım oranı (sabit, envelope yok)
const TIER3_MIN_R := 1400.0
const TIER3_MAX_R := 2100.0     # Faz F4 kapsamı: köy+Tier1+Tier2+Tier3
const TIER3_MAX_CELL := 66      # ceil(TIER3_MAX_R / GROUND_CELL)
const TIER3_WHEAT_RATIO := 0.6  # buğday/toprak karışımı — tarla ağırlıklı, mezarlıktan daha yoğun
const TIER4_MIN_R := 2100.0
const TIER4_MAX_R := 2800.0     # Faz F5 kapsamı: köy+Tier1+Tier2+Tier3+Tier4
const TIER4_MAX_CELL := 88      # ceil(TIER4_MAX_R / GROUND_CELL)
const TIER4_FOLIAGE_RATIO := 0.55  # sisli yaprak/bataklık çamuru karışımı
const TIER5_MIN_R := 2800.0
# Faz F6 kapsamı: köy+Tier1..5 TAMAMLANDI. Görsel sınır 4200'e kadar
# (ZONES[4].max_r=3500'ün ötesi) çünkü Kan Lordu'nun İni (BOSS_POSITION
# ~3800, bkz. godot-server/scripts/main.gd) de aynı lav temasını
# paylaşıyor — ayrı bir tileset üretmeye gerek yok (plan: "Lav
# tileset'inin varyasyonu"), zorluk/ödül sistemi (ZONES) buna göre
# DEĞİŞMİYOR, sadece zemin görseli boss alanını da kaplayacak kadar uzanıyor.
const TIER5_MAX_R := 4200.0
const TIER5_MAX_CELL := 132     # ceil(TIER5_MAX_R / GROUND_CELL)
const TIER5_LAVA_RATIO := 0.35  # lav/obsidyen karışımı — çoğunlukla katı kaya, tehlikeli lav gölcükleri seyrek
const TOAST_HOLD_SEC := 3.0
const TOAST_FADE_SEC := 1.0

# İksir/yetenek HUD'u — godot-server/scripts/main.gd → ABILITIES'in isim/
# cooldown kısmının bir aynası (ZONE_DISPLAY'deki desenin aynısı, salt
# görüntüleme — gerçek kapı/cooldown her zaman sunucuda). Her sınıfın 4
# AYRI yeteneği var (Lv10/20/30/40, R/T/Y/U tuşları) — Faz D'deki "tek
# yetenek güçlenir" modelinden farklı, bkz. plans/humble-chasing-galaxy.md
# "Sınıf Yetenekleri Genişlemesi". İksir sayısı yeni bir RPC/DB alanı
# GEREKTİRMİYOR: mevcut reward_notification/BackendBridge REST
# çağrılarından çıkarılıyor (bkz. _on_inventory_fetched, reward_notification'daki
# metin ayrıştırması).
const ABILITY_INFO := {
	"koylu": [
		{"name": "Sağlam Duruş", "cooldown": 20.0},
		{"name": "Toparlanma", "cooldown": 12.0},
		{"name": "Kalkan Duvarı", "cooldown": 25.0},
		{"name": "Kahramanca Direniş", "cooldown": 30.0},
	],
	"buyucu": [
		{"name": "Büyü Patlaması", "cooldown": 8.0},
		{"name": "Alev Zinciri", "cooldown": 10.0},
		{"name": "Manastik Kalkan", "cooldown": 20.0},
		{"name": "Arkan Yağmuru", "cooldown": 15.0},
	],
	"kilic_ustasi": [
		{"name": "Kasırga Darbesi", "cooldown": 6.0},
		{"name": "Kan Öfkesi", "cooldown": 15.0},
		{"name": "Yıkım Vuruşu", "cooldown": 9.0},
		{"name": "Kan Girdabı", "cooldown": 12.0},
	],
	"firtina_rahibesi": [
		{"name": "Şifa Dalgası", "cooldown": 15.0},
		{"name": "Kutsal Kalkan", "cooldown": 15.0},
		{"name": "Nova Patlaması", "cooldown": 10.0},
		{"name": "Toplu Şifa", "cooldown": 22.0},
	],
	"vebali": [
		{"name": "Zehir Bulutu", "cooldown": 10.0},
		{"name": "Veba Gücü", "cooldown": 15.0},
		{"name": "Ölüm Dokunuşu", "cooldown": 12.0},
		{"name": "Salgın", "cooldown": 18.0},
	],
	"firtina_avcisi": [
		{"name": "Şimşek Hamlesi", "cooldown": 7.0},
		{"name": "Çift Şimşek", "cooldown": 9.0},
		{"name": "Fırtına Kalkanı", "cooldown": 16.0},
		{"name": "Yıldırım Fırtınası", "cooldown": 14.0},
	],
}
const ABILITY_UNLOCK_LEVELS := [10, 20, 30, 40]
const ABILITY_KEYS := ["R", "T", "Y", "U"]
const POTION_NAME := "Küçük Can İksiri"
# Ekranın alt orta noktasındaki tecrübe çubuğu — godot-server/scripts/
# main.gd → _fetch_reward'ın reward_notification metnindeki "Tecrübe %d"
# kısmından (ZATEN var olan mesaj, yeni RPC alanı gerekmiyor) canlı takip
# ediliyor. Gereken toplam xp, backend/src/controllers/internal.controller.js
# → xpNeededForLevel(level) ile BİREBİR AYNI formül (50 + level*30) —
# burada da tekrarlanıyor çünkü sunucu bunu hiç RPC ile göndermiyor.
const XP_BASE := 50
const XP_PER_LEVEL := 30

# Faz F11 — item satışı. Bu sabitler SADECE fiyat ÖNİZLEMESİ için (online_hub.gd
# → ENCHANT_SILVER_COST'un aynı deseni) — gerçek fiyat her zaman sunucuda
# hesaplanır (backend/src/controllers/online.controller.js → computeSellPrice),
# istemci hiçbir zaman kendi fiyatını "gerçek" saymaz.
const SELL_PRICE_BY_RARITY := {"common": 15, "rare": 40, "epic": 100, "legendary": 250}
const SELL_ENCHANT_BONUS_PER_LEVEL := 0.2
const SLOT_NAMES := {"weapon": "Silah", "armor": "Zırh", "shield": "Kalkan", "consumable": "Tüketim"}
const RARITY_COLORS := {
	"common": Color(0.8, 0.8, 0.8, 1),
	"rare": Color(0.4, 0.65, 1.0, 1),
	"epic": Color(0.75, 0.4, 0.95, 1),
	"legendary": Color(1.0, 0.65, 0.15, 1),
}

@onready var village_ground: TileMapLayer = $VillageGround
@onready var tier2_ground: TileMapLayer = $Tier2Ground
@onready var tier3_ground: TileMapLayer = $Tier3Ground
@onready var tier4_ground: TileMapLayer = $Tier4Ground
@onready var tier5_ground: TileMapLayer = $Tier5Ground
@onready var world_props: Node2D = $WorldProps
@onready var spawner: MultiplayerSpawner = $PlayerSpawner
@onready var status_label: Label = $UI/StatusLabel
@onready var zone_label: Label = $UI/ZoneLabel
@onready var toast_label: Label = $UI/ToastLabel
@onready var leave_button: Button = $UI/LeaveButton
@onready var potion_label: Label = $UI/PotionLabel
@onready var ability_labels: Array[Label] = [$UI/Ability1Label, $UI/Ability2Label, $UI/Ability3Label, $UI/Ability4Label]
@onready var exp_bar: ProgressBar = $UI/ExpBar
@onready var exp_label: Label = $UI/ExpBar/ExpLabel
@onready var inventory_panel: Panel = $UI/InventoryPanel
@onready var inventory_close_button: Button = $UI/InventoryPanel/VBox/TitleRow/InvCloseButton
@onready var inventory_items_box: VBoxContainer = $UI/InventoryPanel/VBox/InvScrollContainer/InvItems
@onready var camera: Camera2D = $Camera2D

var _local_player_id: int = -1
var _last_zone_name: String = ""
var _toast_tween: Tween
var _potion_count: int = 0
var _character_level: int = 1
var _character_xp: int = 0
var _ability_ready_at: Array[float] = [0.0, 0.0, 0.0, 0.0]
var _inventory: Array = []
var _equipped: Dictionary = {}

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
	inventory_close_button.pressed.connect(_close_inventory)
	BackendBridge.online_sell_result.connect(_on_sell_result)
	_paint_village_ground()
	_paint_tier2_ground()
	_paint_tier3_ground()
	_paint_tier4_ground()
	_paint_tier5_ground()
	_spawn_village()
	_spawn_biome_decor(TIER3_MIN_R, TIER3_MAX_R, TIER3_DECOR_TEXTURES)
	_spawn_biome_decor(TIER4_MIN_R, TIER4_MAX_R, TIER4_DECOR_TEXTURES)
	_spawn_biome_decor(TIER5_MIN_R, TIER5_MAX_R, TIER5_DECOR_TEXTURES)
	Audio.play_music("farm")
	# BackendBridge.get_online_*() GameManager.jwt_token'ı okuyor — normal
	# oyun akışında zaten set edilmiş oluyor (giriş ana menüde yapılıyor),
	# burada sadece --token= ile başlatılan test istemcilerinde de REST
	# çağrılarının çalışması için (WebSocket auth'ta zaten yapılan) aynı
	# değeri GameManager'a da yazıyoruz — gerçek oyunda no-op.
	GameManager.jwt_token = _resolve_jwt()
	BackendBridge.online_character_result.connect(_on_character_fetched)
	BackendBridge.online_inventory_result.connect(_on_inventory_fetched)
	BackendBridge.get_online_character()
	BackendBridge.get_online_inventory()
	_update_potion_label()
	_update_exp_bar()
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
	_update_ability_labels()

# game.gd'deki _grass_envelope()'un basitleştirilmiş hâli — köy içi çıplak
# (0.0), GRASS_RAMP_END'e kadar artan çim yoğunluğu, sonrası tam çim (1.0).
func _grass_envelope(dist: float) -> float:
	if dist < VILLAGE_RADIUS:
		return 0.0
	if dist < GRASS_RAMP_END:
		return clampf((dist - VILLAGE_RADIUS) / (GRASS_RAMP_END - VILLAGE_RADIUS), 0.0, 1.0)
	return 1.0

# game.gd → _paint_ground()'un birebir aynı Wang köşe-eşleme deseni (bkz.
# TerrainLookup notu) — SADECE 0..TIER1_MAX_R aralığı boyanıyor (Faz F2
# kapsamı), ötesi Faz F3+'ta kendi biome tileset'leriyle dolduruluyor.
func _paint_village_ground() -> void:
	var vertices: Dictionary = {}
	for i in range(90):
		var cx: int = randi_range(-GROUND_MAX_CELL, GROUND_MAX_CELL)
		var cy: int = randi_range(-GROUND_MAX_CELL, GROUND_MAX_CELL)
		var center_dist: float = Vector2(cx, cy).length() * GROUND_CELL
		if randf() > _grass_envelope(center_dist):
			continue
		var blob_count: int = randi_range(2, 4)
		for b in range(blob_count):
			var bx: int = cx + randi_range(-3, 3)
			var by: int = cy + randi_range(-3, 3)
			var w: int = randi_range(3, 6)
			var h: int = randi_range(3, 6)
			for vx in range(bx, bx + w + 1):
				for vy in range(by, by + h + 1):
					vertices[Vector2i(vx, vy)] = 1
	for x in range(-GROUND_MAX_CELL, GROUND_MAX_CELL + 1):
		for y in range(-GROUND_MAX_CELL, GROUND_MAX_CELL + 1):
			var world_dist: float = Vector2(x, y).length() * GROUND_CELL
			if world_dist >= TIER1_MAX_R:
				continue
			var nw: int = vertices.get(Vector2i(x, y), 0)
			var ne: int = vertices.get(Vector2i(x + 1, y), 0)
			var sw: int = vertices.get(Vector2i(x, y + 1), 0)
			var se: int = vertices.get(Vector2i(x + 1, y + 1), 0)
			var key: String = "%d,%d,%d,%d" % [nw, ne, sw, se]
			var atlas_coords: Vector2i = TerrainLookup.LOOKUP.get(key, Vector2i(2, 1))
			village_ground.set_cell(Vector2i(x, y), 0, atlas_coords, 0)

# Faz F3 — Tier2 "Unutulmuş Mezarlık" zemin boyaması. game.gd'deki envelope
# deseninden farklı: burada sabit bir karışım oranı kullanılıyor (envelope
# yok) çünkü Tier2'nin TAMAMI tek bir biome — kademeli geçiş yerine baştan
# sona homojen bir "yamalı ölü çim + çatlak toprak" karışımı isteniyor.
func _paint_tier2_ground() -> void:
	var vertices: Dictionary = {}
	for i in range(70):
		var cx: int = randi_range(-TIER2_MAX_CELL, TIER2_MAX_CELL)
		var cy: int = randi_range(-TIER2_MAX_CELL, TIER2_MAX_CELL)
		var center_dist: float = Vector2(cx, cy).length() * GROUND_CELL
		if center_dist < TIER2_MIN_R or center_dist >= TIER2_MAX_R:
			continue
		if randf() > TIER2_GRASS_RATIO:
			continue
		var blob_count: int = randi_range(2, 4)
		for b in range(blob_count):
			var bx: int = cx + randi_range(-3, 3)
			var by: int = cy + randi_range(-3, 3)
			var w: int = randi_range(3, 6)
			var h: int = randi_range(3, 6)
			for vx in range(bx, bx + w + 1):
				for vy in range(by, by + h + 1):
					vertices[Vector2i(vx, vy)] = 1
	for x in range(-TIER2_MAX_CELL, TIER2_MAX_CELL + 1):
		for y in range(-TIER2_MAX_CELL, TIER2_MAX_CELL + 1):
			var world_dist: float = Vector2(x, y).length() * GROUND_CELL
			if world_dist < TIER2_MIN_R or world_dist >= TIER2_MAX_R:
				continue
			var nw: int = vertices.get(Vector2i(x, y), 0)
			var ne: int = vertices.get(Vector2i(x + 1, y), 0)
			var sw: int = vertices.get(Vector2i(x, y + 1), 0)
			var se: int = vertices.get(Vector2i(x + 1, y + 1), 0)
			var key: String = "%d,%d,%d,%d" % [nw, ne, sw, se]
			var atlas_coords: Vector2i = GraveyardLookup.LOOKUP.get(key, Vector2i(2, 1))
			tier2_ground.set_cell(Vector2i(x, y), 0, atlas_coords, 0)

# Faz F4 — Tier3 "Verimli Vadi" zemin boyaması, Tier2 ile aynı desen (sabit
# karışım oranı, envelope yok) ama daha yüksek buğday yoğunluğu.
func _paint_tier3_ground() -> void:
	var vertices: Dictionary = {}
	for i in range(90):
		var cx: int = randi_range(-TIER3_MAX_CELL, TIER3_MAX_CELL)
		var cy: int = randi_range(-TIER3_MAX_CELL, TIER3_MAX_CELL)
		var center_dist: float = Vector2(cx, cy).length() * GROUND_CELL
		if center_dist < TIER3_MIN_R or center_dist >= TIER3_MAX_R:
			continue
		if randf() > TIER3_WHEAT_RATIO:
			continue
		var blob_count: int = randi_range(2, 4)
		for b in range(blob_count):
			var bx: int = cx + randi_range(-3, 3)
			var by: int = cy + randi_range(-3, 3)
			var w: int = randi_range(3, 6)
			var h: int = randi_range(3, 6)
			for vx in range(bx, bx + w + 1):
				for vy in range(by, by + h + 1):
					vertices[Vector2i(vx, vy)] = 1
	for x in range(-TIER3_MAX_CELL, TIER3_MAX_CELL + 1):
		for y in range(-TIER3_MAX_CELL, TIER3_MAX_CELL + 1):
			var world_dist: float = Vector2(x, y).length() * GROUND_CELL
			if world_dist < TIER3_MIN_R or world_dist >= TIER3_MAX_R:
				continue
			var nw: int = vertices.get(Vector2i(x, y), 0)
			var ne: int = vertices.get(Vector2i(x + 1, y), 0)
			var sw: int = vertices.get(Vector2i(x, y + 1), 0)
			var se: int = vertices.get(Vector2i(x + 1, y + 1), 0)
			var key: String = "%d,%d,%d,%d" % [nw, ne, sw, se]
			var atlas_coords: Vector2i = ValleyLookup.LOOKUP.get(key, Vector2i(2, 1))
			tier3_ground.set_cell(Vector2i(x, y), 0, atlas_coords, 0)

# Faz F5 — Tier4 "Yağmur Ormanı" zemin boyaması, Tier2/Tier3 ile aynı desen.
func _paint_tier4_ground() -> void:
	var vertices: Dictionary = {}
	for i in range(90):
		var cx: int = randi_range(-TIER4_MAX_CELL, TIER4_MAX_CELL)
		var cy: int = randi_range(-TIER4_MAX_CELL, TIER4_MAX_CELL)
		var center_dist: float = Vector2(cx, cy).length() * GROUND_CELL
		if center_dist < TIER4_MIN_R or center_dist >= TIER4_MAX_R:
			continue
		if randf() > TIER4_FOLIAGE_RATIO:
			continue
		var blob_count: int = randi_range(2, 4)
		for b in range(blob_count):
			var bx: int = cx + randi_range(-3, 3)
			var by: int = cy + randi_range(-3, 3)
			var w: int = randi_range(3, 6)
			var h: int = randi_range(3, 6)
			for vx in range(bx, bx + w + 1):
				for vy in range(by, by + h + 1):
					vertices[Vector2i(vx, vy)] = 1
	for x in range(-TIER4_MAX_CELL, TIER4_MAX_CELL + 1):
		for y in range(-TIER4_MAX_CELL, TIER4_MAX_CELL + 1):
			var world_dist: float = Vector2(x, y).length() * GROUND_CELL
			if world_dist < TIER4_MIN_R or world_dist >= TIER4_MAX_R:
				continue
			var nw: int = vertices.get(Vector2i(x, y), 0)
			var ne: int = vertices.get(Vector2i(x + 1, y), 0)
			var sw: int = vertices.get(Vector2i(x, y + 1), 0)
			var se: int = vertices.get(Vector2i(x + 1, y + 1), 0)
			var key: String = "%d,%d,%d,%d" % [nw, ne, sw, se]
			var atlas_coords: Vector2i = JungleLookup.LOOKUP.get(key, Vector2i(2, 1))
			tier4_ground.set_cell(Vector2i(x, y), 0, atlas_coords, 0)

# Faz F6 — Tier5 "Kızıl Lav Diyarı" zemin boyaması, Tier2/3/4 ile aynı
# desen ama daha düşük "üst terrain" (lav) oranı — çoğunlukla katı
# obsidyen, seyrek/tehlikeli lav gölcükleri.
func _paint_tier5_ground() -> void:
	var vertices: Dictionary = {}
	for i in range(140):
		var cx: int = randi_range(-TIER5_MAX_CELL, TIER5_MAX_CELL)
		var cy: int = randi_range(-TIER5_MAX_CELL, TIER5_MAX_CELL)
		var center_dist: float = Vector2(cx, cy).length() * GROUND_CELL
		if center_dist < TIER5_MIN_R or center_dist >= TIER5_MAX_R:
			continue
		if randf() > TIER5_LAVA_RATIO:
			continue
		var blob_count: int = randi_range(2, 4)
		for b in range(blob_count):
			var bx: int = cx + randi_range(-3, 3)
			var by: int = cy + randi_range(-3, 3)
			var w: int = randi_range(3, 6)
			var h: int = randi_range(3, 6)
			for vx in range(bx, bx + w + 1):
				for vy in range(by, by + h + 1):
					vertices[Vector2i(vx, vy)] = 1
	for x in range(-TIER5_MAX_CELL, TIER5_MAX_CELL + 1):
		for y in range(-TIER5_MAX_CELL, TIER5_MAX_CELL + 1):
			var world_dist: float = Vector2(x, y).length() * GROUND_CELL
			if world_dist < TIER5_MIN_R or world_dist >= TIER5_MAX_R:
				continue
			var nw: int = vertices.get(Vector2i(x, y), 0)
			var ne: int = vertices.get(Vector2i(x + 1, y), 0)
			var sw: int = vertices.get(Vector2i(x, y + 1), 0)
			var se: int = vertices.get(Vector2i(x + 1, y + 1), 0)
			var key: String = "%d,%d,%d,%d" % [nw, ne, sw, se]
			var atlas_coords: Vector2i = LavaLookup.LOOKUP.get(key, Vector2i(2, 1))
			tier5_ground.set_cell(Vector2i(x, y), 0, atlas_coords, 0)

# game.gd → _spawn_village()'ın birebir aynısı (5 ev halka şeklinde + 1
# kuyu) — SADECE görsel, çarpışma yok (online oyuncu hareketi
# CharacterBody2D kullanmıyor, bkz. plan "bilinçli kapsam kararı").
func _spawn_village() -> void:
	var building_count := 5
	for i in range(building_count):
		var angle: float = (TAU / building_count) * i + randf_range(-0.2, 0.2)
		var dist: float = randf_range(120.0, 190.0)
		var pos: Vector2 = Vector2(cos(angle), sin(angle)) * dist
		var house := HouseScene.instantiate()
		world_props.add_child(house)
		house.global_position = pos
		house.set_texture(HouseTextures[randi() % HouseTextures.size()])
	var well := WellScene.instantiate()
	world_props.add_child(well)
	well.global_position = Vector2(0, 90)
	well.set_texture(WellTexture)

# Faz F9 — biome dekorasyonu. game.gd → _random_field_position()'daki aynı
# annulus-uniform rastgele nokta tekniği (min_r/max_r arası tekdüze alan
# dağılımı) — landmark min-spacing kontrolü kasıtlı YOK (game.gd'deki
# _find_landmark_position'dan farklı), 36 obje/biome için üst üste binme
# riski görsel olarak önemsiz, ekstra karmaşıklığa değmiyor.
func _spawn_biome_decor(min_r: float, max_r: float, textures: Array) -> void:
	for i in range(DECOR_COUNT_PER_TIER):
		var angle: float = randf_range(0.0, TAU)
		var dist: float = sqrt(randf_range(min_r * min_r, max_r * max_r))
		var pos: Vector2 = Vector2(cos(angle), sin(angle)) * dist
		var decor := DecorScene.instantiate()
		world_props.add_child(decor)
		decor.global_position = pos
		decor.set_texture(textures[randi() % textures.size()])

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

func _update_potion_label() -> void:
	potion_label.text = "İksir: %d  (H)" % _potion_count

func _xp_needed_for_level(level: int) -> int:
	return XP_BASE + level * XP_PER_LEVEL

func _update_exp_bar() -> void:
	var needed := _xp_needed_for_level(_character_level)
	exp_bar.max_value = float(needed)
	exp_bar.value = float(_character_xp)
	exp_label.text = "%d / %d" % [_character_xp, needed]

# reward_notification'ın metni her zaman "... Tecrübe %d" ile bitiyor
# (bkz. godot-server/scripts/main.gd → _fetch_reward) — _parse_level_from_message
# ile aynı desen, yeni RPC alanı gerekmiyor.
func _parse_xp_from_message(message: String) -> int:
	var idx := message.find("Tecrübe ")
	if idx == -1:
		return -1
	var start := idx + "Tecrübe ".length()
	var end := start
	while end < message.length() and message[end].is_valid_int():
		end += 1
	if end == start:
		return -1
	return int(message.substr(start, end - start))

func _update_ability_labels() -> void:
	var me_name := str(_local_player_id)
	if not has_node(me_name):
		return
	var class_id: String = get_node(me_name).class_id
	var slots: Array = ABILITY_INFO.get(class_id, [])
	var now := Time.get_ticks_msec() / 1000.0
	for i in range(ability_labels.size()):
		var label := ability_labels[i]
		if i >= slots.size():
			label.text = "%s: —" % ABILITY_KEYS[i]
			continue
		var info: Dictionary = slots[i]
		if _character_level < ABILITY_UNLOCK_LEVELS[i]:
			label.text = "%s: %s (Sv.%d'da açılır)" % [ABILITY_KEYS[i], info["name"], ABILITY_UNLOCK_LEVELS[i]]
			continue
		var remaining: float = _ability_ready_at[i] - now
		if remaining > 0.0:
			label.text = "%s: %s (%.1fs)" % [ABILITY_KEYS[i], info["name"], remaining]
		else:
			label.text = "%s: %s (Hazır)" % [ABILITY_KEYS[i], info["name"]]

# Karakter seviyesi/envanteri her REST çağrısını beklemeden en güncel
# tutulsun diye — mevcut reward_notification/BackendBridge akışlarından
# çıkarılıyor, yeni bir sunucu/DB alanı gerekmiyor (bkz. yukarıdaki not).
func _on_character_fetched(success: bool, data: Variant, _message: String) -> void:
	if success and data is Dictionary:
		_character_level = int(data.get("level", 1))
		_character_xp = int(data.get("xp", 0))
		_update_exp_bar()

func _on_inventory_fetched(success: bool, data: Dictionary, _message: String) -> void:
	if not success:
		return
	var items: Array = data.get("items", [])
	_inventory = items
	_equipped = data.get("equipped", {})
	var count := 0
	for item in items:
		if str(item.get("item_def_id", "")) == "minor_health_potion":
			count += 1
	_potion_count = count
	_update_potion_label()
	if inventory_panel.visible:
		_refresh_inventory_panel()

# reward_notification'ın metni her zaman "... Seviye %d, ..." içeriyor
# (bkz. godot-server/scripts/main.gd → _on_reward_response) — yeni bir
# RPC alanı eklemeden karakter seviyesini canlı takip etmek için ayrıştırıyoruz.
func _parse_level_from_message(message: String) -> int:
	var idx := message.find("Seviye ")
	if idx == -1:
		return -1
	var start := idx + "Seviye ".length()
	var end := start
	while end < message.length() and message[end].is_valid_int():
		end += 1
	if end == start:
		return -1
	return int(message.substr(start, end - start))

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

# Faz C — can iksiri kullanma isteği, bkz. godot-server/scripts/main.gd.
@rpc("any_peer", "reliable")
func request_use_potion() -> void:
	pass

# Faz D/E — sınıfa özgü yetenek kullanma isteği (slot_index: 0-3, R/T/Y/U),
# bkz. godot-server/scripts/main.gd.
@rpc("any_peer", "reliable")
func request_use_ability(_slot_index: int) -> void:
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
	var lvl := _parse_level_from_message(message)
	if lvl != -1:
		_character_level = lvl
	var xp := _parse_xp_from_message(message)
	if xp != -1:
		_character_xp = xp
	if lvl != -1 or xp != -1:
		_update_exp_bar()
	if message.find("Düştü: " + POTION_NAME) != -1:
		_potion_count += 1
		_update_potion_label()
	elif message.begins_with("Can iksiri kullandın!"):
		_potion_count = max(0, _potion_count - 1)
		_update_potion_label()
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

# Faz D/E — hasar/heal zaten health_update ile gidiyor, bu sadece "biri
# yetenek kullandı" anının görsel/sesli geri bildirimi + kendi cooldown
# sayacımızı başlatma (bkz. slot_index'e göre _ability_ready_at dizisi).
@rpc("authority", "reliable")
func ability_cast_notification(caster_name: String, class_id: String, slot_index: int) -> void:
	Audio.play("boss_slam", -8.0)
	if has_node(caster_name):
		var pos: Vector2 = get_node(caster_name).global_position
		var color: Color = Color(1.0, 0.85, 0.3) if class_id == "buyucu" else Color(0.6, 0.8, 1.0)
		Effects.spawn_burst(self, pos, color, 18, 170.0)
	if caster_name == str(_local_player_id) and ABILITY_INFO.has(class_id):
		var slots: Array = ABILITY_INFO[class_id]
		if slot_index >= 0 and slot_index < slots.size() and slot_index < _ability_ready_at.size():
			_ability_ready_at[slot_index] = (Time.get_ticks_msec() / 1000.0) + float(slots[slot_index]["cooldown"])

# position client-otoriter bir alan (movement zaten böyle çalışıyor) —
# sunucu bizi doğrudan ışınlayamaz, "kendi pozisyonunu buna ayarla" der,
# biz kendi otoriter alanımızı değiştiririz (bkz. main.gd → _on_player_died
# notu, gerçek testte yakalanan bir bug'ın düzeltmesi).
@rpc("authority", "reliable")
func respawn_teleport(new_position: Vector2) -> void:
	var me_name := str(_local_player_id)
	if has_node(me_name):
		get_node(me_name).position = new_position

# Faz D — Şimşek Hamlesi'nin ışınlanma kısmı, respawn_teleport'la aynı
# client-otoriter position gotcha'sı (bkz. main.gd → _ability_firtina_avcisi).
@rpc("authority", "reliable")
func ability_teleport(new_position: Vector2) -> void:
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
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			leave_map()
		elif event.keycode == KEY_I:
			_toggle_inventory()

# Faz F11 — envanter paneli. Görüntüleme + satış, kuşanma/güçlendirme
# HALA sadece hub'da (online_hub.gd) — burada kasıtlı olarak eklenmedi,
# kullanıcı sadece "görebileceğimiz bir inventory + satış" istedi.
func _toggle_inventory() -> void:
	if inventory_panel.visible:
		_close_inventory()
	else:
		_open_inventory()

func _open_inventory() -> void:
	inventory_panel.visible = true
	BackendBridge.get_online_inventory()
	_refresh_inventory_panel()

func _close_inventory() -> void:
	inventory_panel.visible = false

func _compute_sell_price(rarity: String, enchant_level: int) -> int:
	var base: int = SELL_PRICE_BY_RARITY.get(rarity, SELL_PRICE_BY_RARITY["common"])
	return int(round(base * (1.0 + enchant_level * SELL_ENCHANT_BONUS_PER_LEVEL)))

func _refresh_inventory_panel() -> void:
	for child in inventory_items_box.get_children():
		child.queue_free()
	if _inventory.is_empty():
		var empty_label := Label.new()
		empty_label.text = "Envanterin boş."
		inventory_items_box.add_child(empty_label)
		return
	for item in _inventory:
		_add_inventory_row(item)

func _add_inventory_row(item: Dictionary) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)

	var enchant_level: int = int(item.get("enchant_level", 0))
	var rarity: String = str(item.get("rarity", "common"))
	var slot: String = str(item.get("slot", ""))
	var level_suffix := " +%d" % enchant_level if enchant_level > 0 else ""

	var label := Label.new()
	var stats_parts: Array = []
	var effective_stats: Dictionary = item.get("effective_stats", item.get("base_stats", {}))
	for stat_key in effective_stats.keys():
		stats_parts.append("%s +%s" % [stat_key, str(effective_stats[stat_key])])
	label.text = "%s%s (%s)\n%s" % [item["name"], level_suffix, SLOT_NAMES.get(slot, slot), ", ".join(stats_parts)]
	label.add_theme_color_override("font_color", RARITY_COLORS.get(rarity, Color.WHITE))
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.autowrap_mode = TextServer.AUTOWRAP_WORD
	row.add_child(label)

	var inventory_item_id: int = int(item["id"])
	var is_equipped: bool = int(_equipped.get(slot, -1)) == inventory_item_id

	var sell_btn := Button.new()
	sell_btn.custom_minimum_size = Vector2(150, 48)
	if is_equipped:
		sell_btn.text = "Kuşanılı"
		sell_btn.disabled = true
	else:
		sell_btn.text = "Sat (%d gümüş)" % _compute_sell_price(rarity, enchant_level)
		sell_btn.pressed.connect(_on_sell_pressed.bind(inventory_item_id))
	row.add_child(sell_btn)

	inventory_items_box.add_child(row)

func _on_sell_pressed(inventory_item_id: int) -> void:
	Audio.play("ui_click")
	BackendBridge.sell_online_item(inventory_item_id)

func _on_sell_result(success: bool, data: Dictionary, message: String) -> void:
	if not success:
		_show_toast(message)
		return
	_show_toast(message)
	Audio.play("ui_click")
	BackendBridge.get_online_inventory()
