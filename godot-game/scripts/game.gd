extends Node2D

const EnemyScene := preload("res://scenes/Enemy.tscn")
const XPOrbScene := preload("res://scenes/XPOrb.tscn")
const TreeScene := preload("res://scenes/Tree.tscn")
const PondScene := preload("res://scenes/Pond.tscn")
const RockClusterScene := preload("res://scenes/RockCluster.tscn")
const TerrainLookup := preload("res://assets/tileset/meadow_terrain_lookup.gd")

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

@onready var world: Node2D = $World
@onready var ground_decor: Node2D = $GroundDecor
@onready var player = $World/Player
@onready var hud = $HUD
@onready var level_up_menu = $LevelUpMenu
@onready var game_over_screen = $GameOverScreen
@onready var spawn_timer: Timer = $SpawnTimer
@onready var ground: TileMapLayer = $Ground

const BOSS_SPAWN_TIME := 300.0
const TREE_COUNT := 55
const TREE_CLEAR_RADIUS := 220.0
const DECORATION_COUNT := 180
const DECORATION_CLEAR_RADIUS := 100.0
const WORLD_HALF_EXTENT := 1200.0
const POND_COUNT := 4
const ROCK_CLUSTER_COUNT := 12
const LANDMARK_MIN_SPACING := 260.0

var elapsed: float = 0.0
var enemy_pool: Array = ["bat", "bat", "skeleton", "ghost"]
var _levelup_queue: Array = []
var _levelup_active: bool = false
var boss_spawned: bool = false
var boss_ref: Node2D = null
var _hitstop_active: bool = false

func _ready() -> void:
	_paint_ground()
	_spawn_trees()
	_spawn_decorations()
	_spawn_landmarks()
	player.died.connect(_on_player_died)
	player.health_changed.connect(hud.set_health)
	player.xp_changed.connect(hud.set_xp)
	player.leveled_up.connect(_on_leveled_up)
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

const GROUND_MIN := -40
const GROUND_MAX := 40

# NOT: TileMapLayer.set_cells_terrain_connect() elle yazılmış (PixelLab'dan
# dönüştürülmüş) bu TileSet kaynağıyla sessizce hiçbir hücre boyamıyor
# (doğrulandı: manuel set_cell() çalışıyor, connect() 0 hücre üretiyor).
# Bunun yerine köşe (Wang) eşleştirmesini kendimiz yapıp set_cell() ile
# yerleştiriyoruz — bkz. tools/generate_tileset.js çıktısı olan *_lookup.gd.
func _paint_ground() -> void:
	# vertex(x,y) = cell(x,y)'nin sol-üst köşesi. 0=alt terrain (toprak), 1=üst (çim).
	# Yamalar tek düzgün dikdörtgen yerine üst üste binen birkaç "blob"tan
	# oluşuyor — doğal, düzensiz çim kümeleri için (bkz. araştırma notları).
	var vertices: Dictionary = {}

	for i in range(16):
		var center_x: int = randi_range(-33, 33)
		var center_y: int = randi_range(-33, 33)
		var blob_count: int = randi_range(3, 5)
		for b in range(blob_count):
			var bx: int = center_x + randi_range(-4, 4)
			var by: int = center_y + randi_range(-4, 4)
			var w: int = randi_range(3, 7)
			var h: int = randi_range(3, 7)
			for vx in range(bx, bx + w + 1):
				for vy in range(by, by + h + 1):
					vertices[Vector2i(vx, vy)] = 1

	for x in range(GROUND_MIN, GROUND_MAX + 1):
		for y in range(GROUND_MIN, GROUND_MAX + 1):
			var nw: int = vertices.get(Vector2i(x, y), 0)
			var ne: int = vertices.get(Vector2i(x + 1, y), 0)
			var sw: int = vertices.get(Vector2i(x, y + 1), 0)
			var se: int = vertices.get(Vector2i(x + 1, y + 1), 0)
			var key: String = "%d,%d,%d,%d" % [nw, ne, sw, se]
			var atlas_coords: Vector2i = TerrainLookup.LOOKUP.get(key, Vector2i(2, 1))
			ground.set_cell(Vector2i(x, y), 0, atlas_coords, 0)

func _spawn_trees() -> void:
	var placed := 0
	var attempts := 0
	while placed < TREE_COUNT and attempts < TREE_COUNT * 6:
		attempts += 1
		var pos := Vector2(
			randf_range(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT),
			randf_range(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT)
		)
		if pos.length() < TREE_CLEAR_RADIUS:
			continue
		var tree := TreeScene.instantiate()
		world.add_child(tree)
		tree.global_position = pos
		tree.set_texture(TreeTextures[randi() % TreeTextures.size()])
		placed += 1

func _spawn_decorations() -> void:
	for i in range(DECORATION_COUNT):
		var pos := Vector2(
			randf_range(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT),
			randf_range(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT)
		)
		if pos.length() < DECORATION_CLEAR_RADIUS:
			continue
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
		var pos := Vector2(
			randf_range(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT),
			randf_range(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT)
		)
		if pos.length() < TREE_CLEAR_RADIUS:
			continue
		var ok := true
		for p in existing:
			if p.distance_to(pos) < LANDMARK_MIN_SPACING:
				ok = false
				break
		if ok:
			return pos
	return null

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
	if elapsed > 100.0 and not enemy_pool.has("gulyabani"):
		enemy_pool.append("gulyabani")
	if elapsed >= BOSS_SPAWN_TIME and not boss_spawned:
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

func _random_spawn_position() -> Vector2:
	var angle: float = randf() * TAU
	var dist: float = 520.0
	return player.global_position + Vector2(cos(angle), sin(angle)) * dist

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
