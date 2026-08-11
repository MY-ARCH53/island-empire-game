extends Node2D

const EnemyScene := preload("res://scenes/Enemy.tscn")
const XPOrbScene := preload("res://scenes/XPOrb.tscn")
const TreeScene := preload("res://scenes/Tree.tscn")
const PondScene := preload("res://scenes/Pond.tscn")
const RockClusterScene := preload("res://scenes/RockCluster.tscn")
const HouseScene := preload("res://scenes/House.tscn")
const WellScene := preload("res://scenes/Well.tscn")
const TerrainLookup := preload("res://assets/tileset/meadow_terrain_lookup.gd")
const CoastLookup := preload("res://assets/tileset/coast_terrain_lookup.gd")

const TreeTextures := [
	preload("res://assets/props/tree_oak.png"),
	preload("res://assets/props/tree_pine.png"),
]
const DecorationTextures := [
	preload("res://assets/props/flowers.png"),
	preload("res://assets/props/grass_tuft.png"),
	preload("res://assets/props/pebbles.png"),
	preload("res://assets/props/bush.png"),
]
const PondTexture := preload("res://assets/props/pond.png")
const RockBigTexture := preload("res://assets/props/rock_cluster_big.png")
const RockSmallTexture := preload("res://assets/props/rock_cluster_small.png")
const HouseTextures := [
	preload("res://assets/props/house_thatch.png"),
	preload("res://assets/props/house_tile_roof.png"),
]
const WellTexture := preload("res://assets/props/well.png")

@onready var world: Node2D = $World
@onready var ground_decor: Node2D = $GroundDecor
@onready var player = $World/Player
@onready var hud = $HUD
@onready var level_up_menu = $LevelUpMenu
@onready var game_over_screen = $GameOverScreen
@onready var spawn_timer: Timer = $SpawnTimer
@onready var ground: TileMapLayer = $Ground
@onready var ground_coast: TileMapLayer = $GroundCoast

const BOSS_SPAWN_LEVEL := 20

# --- Dünya hikayesi: kasaba (merkez) -> açık alan -> sahil -> deniz (dünya sınırı) ---
# "Kan Adası" adını gerçek bir ada haline getiren radyal bölgeleme.
const GROUND_MIN := -40
const GROUND_MAX := 40
const VILLAGE_RADIUS := 220.0       # bu yarıçapın içi: çıplak patika (kasaba)
const FIELD_MID_RADIUS := 500.0     # çim yoğunluğunun doruğa ulaştığı yarıçap
const FIELD_RADIUS := 950.0         # kara biter, sahil/deniz tileset'i başlar
const COAST_TAPER := 150.0          # kara -> sahil geçiş genişliği
const SHORE_BASE_RADIUS := FIELD_RADIUS + 70.0
const SHORE_NOISE_AMPLITUDE := 90.0 # kıyı çizgisi düzgün daire olmasın diye
const WORLD_HALF_EXTENT := 1280.0
const VILLAGE_CLEAR_RADIUS := 260.0 # vahşi dekorasyon/ağaç/peyzaj bu yarıçapın dışında başlar
const WILDERNESS_OUTER_MARGIN := 60.0 # sahil kenarında da boş bırak

const TREE_COUNT := 55
const DECORATION_COUNT := 180
const POND_COUNT := 3
const ROCK_CLUSTER_COUNT := 10
const LANDMARK_MIN_SPACING := 260.0

var _coast_noise := FastNoiseLite.new()

var elapsed: float = 0.0
var enemy_pool: Array = ["bat", "bat", "skeleton", "ghost"]
var _levelup_queue: Array = []
var _levelup_active: bool = false
var boss_spawned: bool = false
var boss_ref: Node2D = null
var _hitstop_active: bool = false

func _ready() -> void:
	_coast_noise.seed = randi()
	_coast_noise.frequency = 0.015
	_paint_ground()
	_paint_coast()
	_spawn_village()
	_spawn_trees()
	_spawn_decorations()
	_spawn_landmarks()
	_spawn_world_boundary()
	player.died.connect(_on_player_died)
	player.health_changed.connect(hud.set_health)
	player.xp_changed.connect(hud.set_xp)
	player.leveled_up.connect(_on_leveled_up)
	player.weapon_evolved.connect(_on_weapon_evolved)
	level_up_menu.choice_selected.connect(_on_choice_selected)
	game_over_screen.play_again_pressed.connect(_on_play_again)
	game_over_screen.main_menu_pressed.connect(_on_back_to_menu)
	spawn_timer.timeout.connect(_spawn_enemy)
	spawn_timer.start()

	hud.set_health(player.health, player.max_health)
	hud.set_xp(player.xp, player.xp_needed)
	hud.set_kills(0)
	hud.set_level(1)
	hud.set_timer(0.0)

# Merkeze (kasaba) yakınken 0, tarlanın ortasında 1, sahile yaklaşırken tekrar
# 0'a düşen bir "çim olasılığı" zarfı — kasaba çıplak patika, sahil kumsal olsun.
func _grass_envelope(dist: float) -> float:
	if dist < VILLAGE_RADIUS:
		return 0.0
	if dist < FIELD_MID_RADIUS:
		return clampf((dist - VILLAGE_RADIUS) / (FIELD_MID_RADIUS - VILLAGE_RADIUS), 0.0, 1.0)
	if dist < FIELD_RADIUS - COAST_TAPER:
		return 1.0
	if dist < FIELD_RADIUS:
		return clampf((FIELD_RADIUS - dist) / COAST_TAPER, 0.0, 1.0)
	return 0.0

# NOT: TileMapLayer.set_cells_terrain_connect() elle yazılmış (PixelLab'dan
# dönüştürülmüş) bu TileSet kaynaklarıyla sessizce hiçbir hücre boyamıyor
# (doğrulandı: manuel set_cell() çalışıyor, connect() 0 hücre üretiyor).
# Bunun yerine köşe (Wang) eşleştirmesini kendimiz yapıp set_cell() ile
# yerleştiriyoruz — bkz. tools/generate_tileset.js çıktısı olan *_lookup.gd.
func _paint_ground() -> void:
	# vertex(x,y) = cell(x,y)'nin sol-üst köşesi. 0=alt terrain (toprak), 1=üst (çim).
	var vertices: Dictionary = {}

	for i in range(90):
		var cx: int = randi_range(GROUND_MIN, GROUND_MAX)
		var cy: int = randi_range(GROUND_MIN, GROUND_MAX)
		var center_dist: float = Vector2(cx, cy).length() * 32.0
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

	for x in range(GROUND_MIN, GROUND_MAX + 1):
		for y in range(GROUND_MIN, GROUND_MAX + 1):
			var world_dist: float = Vector2(x, y).length() * 32.0
			if world_dist >= FIELD_RADIUS:
				continue # bu hücreler GroundCoast katmanına ait
			var nw: int = vertices.get(Vector2i(x, y), 0)
			var ne: int = vertices.get(Vector2i(x + 1, y), 0)
			var sw: int = vertices.get(Vector2i(x, y + 1), 0)
			var se: int = vertices.get(Vector2i(x + 1, y + 1), 0)
			var key: String = "%d,%d,%d,%d" % [nw, ne, sw, se]
			var atlas_coords: Vector2i = TerrainLookup.LOOKUP.get(key, Vector2i(2, 1))
			ground.set_cell(Vector2i(x, y), 0, atlas_coords, 0)

# Sahil/deniz katmanı: kum(1)/deniz(0), kıyı çizgisi gürültüyle dalgalanır
# (mükemmel daire olmasın diye) — FastNoiseLite ile doğal bir kıyı hattı.
func _coast_terrain_at(vx: int, vy: int) -> int:
	var world_dist: float = Vector2(vx, vy).length() * 32.0
	var noise_val: float = _coast_noise.get_noise_2d(vx * 6.0, vy * 6.0)
	var shoreline: float = SHORE_BASE_RADIUS + noise_val * SHORE_NOISE_AMPLITUDE
	return 1 if world_dist <= shoreline else 0

func _paint_coast() -> void:
	for x in range(GROUND_MIN, GROUND_MAX + 1):
		for y in range(GROUND_MIN, GROUND_MAX + 1):
			var world_dist: float = Vector2(x, y).length() * 32.0
			if world_dist < FIELD_RADIUS - 32.0:
				continue # kara katmanıyla küçük bir örtüşme payı dışında burada değil
			var nw: int = _coast_terrain_at(x, y)
			var ne: int = _coast_terrain_at(x + 1, y)
			var sw: int = _coast_terrain_at(x, y + 1)
			var se: int = _coast_terrain_at(x + 1, y + 1)
			var key: String = "%d,%d,%d,%d" % [nw, ne, sw, se]
			var atlas_coords: Vector2i = CoastLookup.LOOKUP.get(key, Vector2i(2, 1))
			ground_coast.set_cell(Vector2i(x, y), 0, atlas_coords, 0)

# Kasaba: oyuncu doğduğunda çevresinde 4-5 ev + bir kuyu — hikayenin başlangıcı.
func _spawn_village() -> void:
	var building_count: int = 5
	for i in range(building_count):
		var angle: float = (TAU / building_count) * i + randf_range(-0.2, 0.2)
		var dist: float = randf_range(120.0, 190.0)
		var pos: Vector2 = Vector2(cos(angle), sin(angle)) * dist
		var house := HouseScene.instantiate()
		world.add_child(house)
		house.global_position = pos
		house.set_texture(HouseTextures[randi() % HouseTextures.size()])

	var well := WellScene.instantiate()
	world.add_child(well)
	well.global_position = Vector2(0, 90)
	well.set_texture(WellTexture)

func _spawn_trees() -> void:
	var placed := 0
	var attempts := 0
	while placed < TREE_COUNT and attempts < TREE_COUNT * 6:
		attempts += 1
		var pos := _random_field_position()
		var tree := TreeScene.instantiate()
		world.add_child(tree)
		tree.global_position = pos
		tree.set_texture(TreeTextures[randi() % TreeTextures.size()])
		placed += 1

func _spawn_decorations() -> void:
	for i in range(DECORATION_COUNT):
		var pos := _random_field_position()
		var deco := Sprite2D.new()
		deco.texture = DecorationTextures[randi() % DecorationTextures.size()]
		deco.scale = Vector2.ONE * randf_range(0.6, 1.15)
		ground_decor.add_child(deco)
		deco.global_position = pos

# Göl/kaya kümesi gibi büyük, seyrek peyzaj öğeleri — küçük dekorasyonların
# aksine gerçek engel (çarpışmalı) ve birbirinden belirgin şekilde ayrık.
func _spawn_landmarks() -> void:
	var placed_positions: Array[Vector2] = []

	for i in range(POND_COUNT):
		var pos = _find_landmark_position(placed_positions)
		if pos == null:
			continue
		var pond := PondScene.instantiate()
		world.add_child(pond)
		pond.global_position = pos
		pond.set_texture(PondTexture)
		placed_positions.append(pos)

	for i in range(ROCK_CLUSTER_COUNT):
		var pos = _find_landmark_position(placed_positions)
		if pos == null:
			continue
		var rock := RockClusterScene.instantiate()
		world.add_child(rock)
		rock.global_position = pos
		var big: bool = randf() < 0.5
		rock.set_texture(RockBigTexture if big else RockSmallTexture)
		if not big:
			rock.scale = Vector2.ONE * 0.75
		placed_positions.append(pos)

func _find_landmark_position(existing: Array[Vector2]):
	for attempt in range(20):
		var pos := _random_field_position()
		var ok := true
		for p in existing:
			if p.distance_to(pos) < LANDMARK_MIN_SPACING:
				ok = false
				break
		if ok:
			return pos
	return null

# Sadece "açık alan" halkasında (kasaba dışı, sahil öncesi) rastgele bir nokta.
func _random_field_position() -> Vector2:
	var angle: float = randf() * TAU
	var min_r: float = VILLAGE_CLEAR_RADIUS
	var max_r: float = FIELD_RADIUS - WILDERNESS_OUTER_MARGIN
	var dist: float = sqrt(randf_range(min_r * min_r, max_r * max_r))
	return Vector2(cos(angle), sin(angle)) * dist

# Kıyı çizgisinde görünmez bir engel halkası — dünyanın "adaya" sığması,
# oyuncu/düşmanların açık denize yüzememesi için (bkz. game.gd tepesindeki
# hikaye notu: kenarlar deniz ile çevrili). Her ışın _coast_terrain_at() ile
# gerçek kum->deniz geçişini bulur, böylece görünmez duvar görsel kıyı
# çizgisiyle tam örtüşür (rastgele bağımsız gürültü örneklemiyor).
func _spawn_world_boundary() -> void:
	var segment_count := 64
	for i in range(segment_count):
		var angle: float = (TAU / segment_count) * i
		var dir := Vector2(cos(angle), sin(angle))
		var shore_radius: float = _find_shoreline_radius(dir)
		var body := StaticBody2D.new()
		body.collision_layer = 1
		body.collision_mask = 0
		var shape := CollisionShape2D.new()
		var circle := CircleShape2D.new()
		circle.radius = 85.0
		shape.shape = circle
		body.add_child(shape)
		world.add_child(body)
		body.global_position = dir * (shore_radius + 15.0)

func _find_shoreline_radius(dir: Vector2) -> float:
	var r: float = FIELD_RADIUS
	while r < WORLD_HALF_EXTENT:
		var pos: Vector2 = dir * r
		var vx: int = int(roundi(pos.x / 32.0))
		var vy: int = int(roundi(pos.y / 32.0))
		if _coast_terrain_at(vx, vy) == 0: # deniz başladı
			return r
		r += 16.0
	return WORLD_HALF_EXTENT

func _process(delta: float) -> void:
	elapsed += delta
	hud.set_timer(elapsed)
	_update_difficulty()
	if is_instance_valid(boss_ref):
		hud.set_boss_health(boss_ref.health, boss_ref.max_health)

func _update_difficulty() -> void:
	var target_wait: float = max(0.35, 1.4 - elapsed / 90.0)
	if absf(spawn_timer.wait_time - target_wait) > 0.01:
		spawn_timer.wait_time = target_wait
	if elapsed > 20.0 and not enemy_pool.has("kabus"):
		enemy_pool.append("kabus")
	if elapsed > 60.0 and not enemy_pool.has("brute"):
		enemy_pool.append("brute")
	if elapsed > 900.0 and not enemy_pool.has("gulyabani"):
		enemy_pool.append("gulyabani")
	if player.level >= BOSS_SPAWN_LEVEL and not boss_spawned:
		boss_spawned = true
		_spawn_boss()

func _spawn_enemy() -> void:
	var type_id: String = enemy_pool[randi() % enemy_pool.size()]
	var enemy := EnemyScene.instantiate()
	world.add_child(enemy)
	enemy.add_to_group("enemies")
	var difficulty_mult: float = 1.0 + elapsed / 60.0
	enemy.setup(type_id, difficulty_mult)
	enemy.global_position = _random_spawn_position()
	enemy.died.connect(_on_enemy_died)

func _spawn_boss() -> void:
	var boss := EnemyScene.instantiate()
	world.add_child(boss)
	boss.add_to_group("enemies")
	boss.setup("kan_lordu", 1.0)
	boss.global_position = _random_spawn_position()
	boss.died.connect(_on_boss_died)
	boss_ref = boss
	hud.show_boss_bar(Upgrades.ENEMIES["kan_lordu"]["name"])
	hud.set_boss_health(boss.health, boss.max_health)

func _on_boss_died(pos: Vector2, xp_value: int) -> void:
	boss_ref = null
	hud.hide_boss_bar()
	_hit_stop(0.12)
	_on_enemy_died(pos, xp_value)
	var choices: Array = Upgrades.guaranteed_weapon_choices(player.owned_weapons, player.level_up_choice_count())
	_levelup_queue.append({"level": player.level, "choices": choices, "is_boss_reward": true})
	_show_next_levelup()

func _hit_stop(duration: float = 0.06, slowdown: float = 0.05) -> void:
	if _hitstop_active:
		return
	_hitstop_active = true
	Engine.time_scale = slowdown
	await get_tree().create_timer(duration, true, false, true).timeout
	Engine.time_scale = 1.0
	_hitstop_active = false

# Düşman spawn noktası oyuncu etrafında ama daima kara (tarla) sınırları içinde
# kalır — sahile/denize taşmasın diye orijine göre de kırpılır.
func _random_spawn_position() -> Vector2:
	var angle: float = randf() * TAU
	var dist: float = 520.0
	var pos: Vector2 = player.global_position + Vector2(cos(angle), sin(angle)) * dist
	var max_r: float = FIELD_RADIUS - WILDERNESS_OUTER_MARGIN
	if pos.length() > max_r:
		pos = pos.normalized() * max_r
	return pos

func _on_enemy_died(pos: Vector2, xp_value: int) -> void:
	player.register_kill()
	hud.set_kills(player.kills)
	var orb := XPOrbScene.instantiate()
	world.add_child(orb)
	orb.global_position = pos
	orb.setup(xp_value)

func _on_leveled_up(new_level: int, choices: Array) -> void:
	# Bir XP topu birden fazla seviye atlatabilir; her seviye sırayla gösterilir.
	_levelup_queue.append({"level": new_level, "choices": choices})
	_show_next_levelup()

func _show_next_levelup() -> void:
	if _levelup_active or _levelup_queue.is_empty():
		return
	_levelup_active = true
	var item: Dictionary = _levelup_queue.pop_front()
	hud.set_level(item["level"])
	Audio.play("levelup")
	Effects.spawn_burst(world, player.global_position, Color(1.0, 0.9, 0.4), 22, 190.0)
	get_tree().paused = true
	if item.get("is_boss_reward", false):
		level_up_menu.open(item["level"], item["choices"], "Boss Ödülü — Bir Silah Seç!")
	else:
		level_up_menu.open(item["level"], item["choices"])

func _on_weapon_evolved(_weapon_id: String, evolved_name: String) -> void:
	hud.show_evolution(evolved_name)
	Effects.spawn_burst(world, player.global_position, Color(1.0, 0.85, 0.3), 30, 240.0)

func _on_choice_selected(choice: Dictionary) -> void:
	player.apply_choice(choice)
	level_up_menu.close()
	_levelup_active = false
	if _levelup_queue.is_empty():
		get_tree().paused = false
	else:
		_show_next_levelup()

func _on_player_died() -> void:
	Audio.play("game_over")
	_hit_stop(0.15, 0.03)
	get_tree().paused = true
	var result := {
		"kills": player.kills,
		"level": player.level,
		"survival_seconds": elapsed,
		"score": player.kills * 10 + int(elapsed) + player.level * 25,
	}
	GameManager.last_run_result = result
	game_over_screen.open(result)
	BackendBridge.run_submitted.connect(_on_run_submitted, CONNECT_ONE_SHOT)
	BackendBridge.submit_run(result)

func _on_run_submitted(success: bool, data: Dictionary, message: String) -> void:
	if success:
		var essence: int = int(data.get("essenceEarned", 0))
		GameManager.blood_essence += essence
		game_over_screen.show_reward(int(data.get("goldEarned", 0)), message, essence)
	else:
		game_over_screen.show_reward(0, message)

func _on_play_again() -> void:
	get_tree().paused = false
	get_tree().reload_current_scene()

func _on_back_to_menu() -> void:
	get_tree().paused = false
	get_tree().change_scene_to_file("res://scenes/MainMenu.tscn")
