extends CharacterBody2D

signal died
signal health_changed(current: float, max_h: float)
signal xp_changed(current: float, needed: float)
signal leveled_up(new_level: int, choices: Array)

const ProjectileScene := preload("res://scenes/Projectile.tscn")
const PoisonCloudScene := preload("res://scenes/PoisonCloud.tscn")
const OrbitBladeTexture := preload("res://assets/icons/orbit_blade.png")
const NovaRingTexture := preload("res://assets/icons/nova_ring.png")

@export var base_speed: float = 220.0
@export var base_max_health: float = 100.0

var health: float
var max_health: float
var move_speed_mult: float = 1.0
var damage_mult: float = 1.0
var attack_speed_mult: float = 1.0
var area_mult: float = 1.0
var xp_mult: float = 1.0
var pickup_radius: float = 90.0

var xp: float = 0.0
var xp_needed: float = 12.0
var level: int = 1
var kills: int = 0
var alive: bool = true

var owned_weapons: Dictionary = {}
var _weapon_timers: Dictionary = {}
var _orbit_blades: Array = []
var _orbit_angle: float = 0.0

func _ready() -> void:
	add_to_group("player")
	_apply_permanent_upgrades()
	max_health = base_max_health
	health = max_health
	health_changed.emit(health, max_health)
	xp_changed.emit(xp, xp_needed)
	add_weapon("magic_bolt")
	if GameManager.permanent_upgrades.get("lucky_start", 0) > 0:
		add_weapon("orbit_blade")

func _apply_permanent_upgrades() -> void:
	var upgrades: Dictionary = GameManager.permanent_upgrades
	base_max_health += 10.0 * int(upgrades.get("max_health", 0))
	move_speed_mult += 0.05 * int(upgrades.get("move_speed", 0))
	pickup_radius *= pow(1.15, int(upgrades.get("pickup_radius", 0)))

func level_up_choice_count() -> int:
	return 4 if GameManager.permanent_upgrades.get("extra_choice", 0) > 0 else 3

func _physics_process(delta: float) -> void:
	if not alive:
		return
	var dir := _get_input_vector()
	velocity = dir * base_speed * move_speed_mult
	move_and_slide()
	_update_orbit_blades(delta)
	$Visual.update_facing(dir, dir.length() > 0.05)

func _get_input_vector() -> Vector2:
	var v := Vector2.ZERO
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		v.x -= 1
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		v.x += 1
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		v.y -= 1
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		v.y += 1
	if v.length() > 1.0:
		v = v.normalized()
	if GameManager.touch_vector.length() > 0.1:
		v = GameManager.touch_vector
	return v

func take_damage(amount: float) -> void:
	if not alive:
		return
	health = max(0.0, health - amount)
	health_changed.emit(health, max_health)
	camera_shake(clampf(amount * 0.15, 2.0, 10.0))
	Audio.play("player_hurt", -4.0, randf_range(0.9, 1.05))
	if health <= 0.0:
		alive = false
		camera_shake(16.0, 3.0)
		died.emit()

func camera_shake(amount: float, decay: float = 5.0) -> void:
	$Camera2D.shake(amount, decay)

func gain_xp(amount: float) -> void:
	if not alive:
		return
	xp += amount * xp_mult
	while xp >= xp_needed:
		xp -= xp_needed
		level += 1
		xp_needed = _xp_for_level(level)
		var choices: Array = Upgrades.random_weapon_or_upgrade_choices(owned_weapons, level_up_choice_count())
		leveled_up.emit(level, choices)
	xp_changed.emit(xp, xp_needed)

func register_kill() -> void:
	kills += 1

func _xp_for_level(lvl: int) -> float:
	return 12.0 + lvl * 8.0 + pow(lvl, 1.6)

func apply_choice(choice: Dictionary) -> void:
	if choice["type"] == "weapon":
		add_weapon(choice["id"])
	else:
		_apply_stat_upgrade(choice["id"])

func _apply_stat_upgrade(id: String) -> void:
	match id:
		"max_health":
			max_health += 20.0
			health = min(max_health, health + 20.0)
			health_changed.emit(health, max_health)
		"move_speed":
			move_speed_mult += 0.10
		"damage":
			damage_mult += 0.12
		"attack_speed":
			attack_speed_mult += 0.10
			for wid in owned_weapons.keys():
				_update_weapon_timer(wid)
		"area":
			area_mult += 0.10
		"xp_gain":
			xp_mult += 0.10
		"pickup_radius":
			pickup_radius *= 1.20

func add_weapon(weapon_id: String) -> void:
	var max_lvl: int = Upgrades.WEAPONS[weapon_id]["max_level"]
	if owned_weapons.has(weapon_id):
		owned_weapons[weapon_id] = min(owned_weapons[weapon_id] + 1, max_lvl)
	else:
		owned_weapons[weapon_id] = 1

	if weapon_id == "orbit_blade":
		_rebuild_orbit_blades()
	elif Upgrades.WEAPONS[weapon_id]["base_cooldown"] > 0.0:
		if not _weapon_timers.has(weapon_id):
			var timer := Timer.new()
			timer.one_shot = false
			add_child(timer)
			timer.timeout.connect(_fire_weapon.bind(weapon_id))
			_weapon_timers[weapon_id] = timer
		_update_weapon_timer(weapon_id)
		_weapon_timers[weapon_id].start()

func _update_weapon_timer(weapon_id: String) -> void:
	if not _weapon_timers.has(weapon_id):
		return
	var data: Dictionary = Upgrades.WEAPONS[weapon_id]
	var cooldown: float = data["base_cooldown"] * pow(0.9, owned_weapons[weapon_id] - 1) / attack_speed_mult
	_weapon_timers[weapon_id].wait_time = max(0.15, cooldown)

func _fire_weapon(weapon_id: String) -> void:
	if not alive:
		return
	match weapon_id:
		"magic_bolt":
			_fire_magic_bolt()
		"nova_pulse":
			_fire_nova_pulse()
		"poison_cloud":
			_fire_poison_cloud()
		"chain_lightning":
			_fire_chain_lightning()

func _fire_magic_bolt() -> void:
	var target := _find_nearest_enemy()
	if target == null:
		return
	var data: Dictionary = Upgrades.WEAPONS["magic_bolt"]
	var lvl: int = owned_weapons["magic_bolt"]
	var proj := ProjectileScene.instantiate()
	get_parent().add_child(proj)
	proj.global_position = global_position
	var dir: Vector2 = (target.global_position - global_position).normalized()
	var dmg: float = data["base_damage"] * (1.0 + 0.25 * (lvl - 1)) * damage_mult
	proj.setup(dir, data["projectile_speed"], dmg)

func _fire_nova_pulse() -> void:
	var data: Dictionary = Upgrades.WEAPONS["nova_pulse"]
	var lvl: int = owned_weapons["nova_pulse"]
	var radius: float = 110.0 * area_mult * (1.0 + 0.08 * (lvl - 1))
	var dmg: float = data["base_damage"] * (1.0 + 0.2 * (lvl - 1)) * damage_mult
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if is_instance_valid(enemy) and global_position.distance_to(enemy.global_position) <= radius:
			enemy.take_damage(dmg)
	camera_shake(5.0)
	_spawn_nova_visual(radius)

func _fire_poison_cloud() -> void:
	var data: Dictionary = Upgrades.WEAPONS["poison_cloud"]
	var lvl: int = owned_weapons["poison_cloud"]
	var radius: float = data["radius"] * area_mult * (1.0 + 0.06 * (lvl - 1))
	var dmg: float = data["base_damage"] * (1.0 + 0.2 * (lvl - 1)) * damage_mult
	var cloud := PoisonCloudScene.instantiate()
	get_parent().add_child(cloud)
	cloud.global_position = global_position
	cloud.setup(radius, dmg, data["duration"], data["tick_interval"])

func _fire_chain_lightning() -> void:
	var first := _find_nearest_enemy()
	if first == null:
		return
	var data: Dictionary = Upgrades.WEAPONS["chain_lightning"]
	var lvl: int = owned_weapons["chain_lightning"]
	var dmg: float = data["base_damage"] * (1.0 + 0.2 * (lvl - 1)) * damage_mult
	var chain_count: int = int(data["chain_count"]) + int(lvl / 2.0)
	var chain_range: float = data["chain_range"] * area_mult

	var hit: Array = [first]
	var points: Array = [global_position, first.global_position]
	first.take_damage(dmg)
	var current: Node2D = first
	for i in range(chain_count - 1):
		var next_target := _find_nearest_unhit_enemy(current.global_position, chain_range, hit)
		if next_target == null:
			break
		next_target.take_damage(dmg)
		hit.append(next_target)
		points.append(next_target.global_position)
		current = next_target

	_spawn_lightning_visual(points)

func _find_nearest_unhit_enemy(from_pos: Vector2, max_range: float, exclude: Array) -> Node2D:
	var nearest: Node2D = null
	var best_dist: float = max_range
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if not is_instance_valid(enemy) or enemy in exclude:
			continue
		var d: float = from_pos.distance_to(enemy.global_position)
		if d <= best_dist:
			best_dist = d
			nearest = enemy
	return nearest

func _spawn_lightning_visual(points: Array) -> void:
	var line := Line2D.new()
	line.width = 3.0
	line.default_color = Color(0.6, 0.85, 1.0, 0.9)
	get_parent().add_child(line)
	for p in points:
		line.add_point(p)
	var tween := line.create_tween()
	tween.tween_property(line, "modulate:a", 0.0, 0.25)
	tween.tween_callback(line.queue_free)

func _spawn_nova_visual(radius: float) -> void:
	var ring := Sprite2D.new()
	ring.texture = NovaRingTexture
	get_parent().add_child(ring)
	ring.global_position = global_position
	ring.modulate = Color(1, 1, 1, 0.8)
	ring.scale = Vector2.ONE * 0.2
	var target_scale: float = (radius * 2.0) / ring.texture.get_width()
	var tween := ring.create_tween()
	tween.set_parallel(true)
	tween.tween_property(ring, "scale", Vector2.ONE * target_scale, 0.35)
	tween.tween_property(ring, "modulate:a", 0.0, 0.35)
	tween.chain().tween_callback(ring.queue_free)

func _rebuild_orbit_blades() -> void:
	for b in _orbit_blades:
		if is_instance_valid(b):
			b.queue_free()
	_orbit_blades.clear()
	var count: int = owned_weapons.get("orbit_blade", 0)
	for i in range(count):
		var blade := Sprite2D.new()
		blade.texture = OrbitBladeTexture
		get_parent().add_child.call_deferred(blade)
		_orbit_blades.append(blade)

func _update_orbit_blades(delta: float) -> void:
	if _orbit_blades.is_empty():
		return
	_orbit_angle += delta * 2.2
	var radius: float = 55.0 * area_mult
	var count: int = _orbit_blades.size()
	var data: Dictionary = Upgrades.WEAPONS["orbit_blade"]
	var lvl: int = owned_weapons["orbit_blade"]
	var dmg: float = data["base_damage"] * (1.0 + 0.2 * (lvl - 1)) * damage_mult
	for i in range(count):
		var angle: float = _orbit_angle + i * TAU / count
		var pos: Vector2 = global_position + Vector2(cos(angle), sin(angle)) * radius
		_orbit_blades[i].global_position = pos
		_orbit_blades[i].rotation += delta * 12.0
		for enemy in get_tree().get_nodes_in_group("enemies"):
			if not is_instance_valid(enemy):
				continue
			if pos.distance_to(enemy.global_position) <= (9.0 + enemy.radius):
				enemy.try_take_contact_damage(dmg, "orbit_%d" % i, 0.5)

func _find_nearest_enemy() -> Node2D:
	var nearest: Node2D = null
	var best_dist := INF
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if not is_instance_valid(enemy):
			continue
		var d: float = global_position.distance_to(enemy.global_position)
		if d < best_dist:
			best_dist = d
			nearest = enemy
	return nearest
