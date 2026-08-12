extends CharacterBody2D

signal died(pos: Vector2, xp_value: int)

const SlamRingTexture := preload("res://assets/icons/nova_ring.png")

var enemy_type: String = "bat"
var health: float
var max_health: float
var speed: float
var contact_damage: float
var xp_value: int
var radius: float = 10.0
var is_boss: bool = false

var _contact_cooldown: float = 0.0
var _hit_cooldowns: Dictionary = {}

# Gulyabani (teleport eden düşman) için
var _teleport_timer: float = 0.0
const TELEPORT_INTERVAL := 3.5
const TELEPORT_MIN_DIST := 260.0

# Kan Lordu (boss) telegraflı alan saldırısı için
var _slam_timer: float = 2.0
const SLAM_INTERVAL := 4.5
const SLAM_RADIUS := 130.0
const SLAM_DAMAGE := 32.0

func setup(type_id: String, difficulty_mult: float = 1.0) -> void:
	enemy_type = type_id
	var data: Dictionary = Upgrades.ENEMIES[type_id]
	max_health = data["health"] * difficulty_mult
	health = max_health
	speed = data["speed"]
	contact_damage = data["damage"]
	xp_value = data["xp"]
	radius = data["radius"]
	is_boss = data.get("is_boss", false)

	var visual: AnimatedSprite2D = $Visual
	if data.has("sprite"):
		visual.sprite_frames = load(data["sprite"])
		visual.play("idle_south")

	var shape: CircleShape2D = $CollisionShape2D.shape
	shape.radius = radius

func _physics_process(delta: float) -> void:
	var player := get_tree().get_first_node_in_group("player")
	if player == null:
		return

	var dir: Vector2 = player.global_position - global_position
	if dir.length() > 1.0:
		dir = dir.normalized()
	velocity = dir * speed
	move_and_slide()
	$Visual.update_facing(dir, true)

	if _contact_cooldown > 0.0:
		_contact_cooldown -= delta
	for key in _hit_cooldowns.keys():
		_hit_cooldowns[key] -= delta

	if global_position.distance_to(player.global_position) <= (radius + 14.0) and _contact_cooldown <= 0.0:
		player.take_damage(contact_damage)
		_contact_cooldown = 0.7

	if enemy_type == "gulyabani":
		_teleport_timer -= delta
		if _teleport_timer <= 0.0:
			_teleport_timer = TELEPORT_INTERVAL
			_teleport_near_player(player)

	if is_boss:
		_slam_timer -= delta
		if _slam_timer <= 0.0:
			_slam_timer = SLAM_INTERVAL
			_telegraph_slam(player)

func _teleport_near_player(player: Node2D) -> void:
	if global_position.distance_to(player.global_position) < TELEPORT_MIN_DIST:
		return
	var angle: float = randf() * TAU
	global_position = player.global_position + Vector2(cos(angle), sin(angle)) * 90.0
	modulate = Color(1, 1, 1, 0.0)
	var tween := create_tween()
	tween.tween_property(self, "modulate:a", 1.0, 0.25)

func _telegraph_slam(player: Node2D) -> void:
	var target_pos: Vector2 = player.global_position
	var ring := Sprite2D.new()
	ring.texture = SlamRingTexture
	ring.modulate = Color(1.0, 0.15, 0.15, 0.0)
	get_parent().add_child(ring)
	ring.global_position = target_pos
	ring.scale = Vector2.ONE * (SLAM_RADIUS * 2.0 / ring.texture.get_width())
	var tween := ring.create_tween()
	tween.tween_property(ring, "modulate:a", 0.85, 0.9)
	tween.tween_callback(func() -> void:
		if is_instance_valid(player) and player.global_position.distance_to(target_pos) <= SLAM_RADIUS:
			player.take_damage(SLAM_DAMAGE)
		Audio.play("boss_slam", 2.0)
		Effects.spawn_burst(get_parent(), target_pos, Color(1.0, 0.2, 0.2), 24, 220.0)
		var fade := ring.create_tween()
		fade.tween_property(ring, "modulate:a", 0.0, 0.2)
		fade.tween_callback(ring.queue_free)
	)

func take_damage(amount: float) -> void:
	health -= amount
	_flash_hit()
	Audio.play("hit", -10.0, randf_range(0.85, 1.15))
	if health <= 0.0:
		var data: Dictionary = Upgrades.ENEMIES[enemy_type]
		Audio.play("enemy_death", -6.0, randf_range(0.9, 1.1))
		Effects.spawn_burst(get_parent(), global_position, data["color"], 12 if not is_boss else 30, 150.0 if not is_boss else 260.0)
		died.emit(global_position, xp_value)
		queue_free()

func try_take_contact_damage(amount: float, source_key: String, cooldown: float) -> void:
	if _hit_cooldowns.get(source_key, 0.0) > 0.0:
		return
	_hit_cooldowns[source_key] = cooldown
	take_damage(amount)

func _flash_hit() -> void:
	var visual = get_node("Visual")
	visual.modulate = Color(1.6, 1.6, 1.6)
	var tween := create_tween()
	tween.tween_property(visual, "modulate", Color(1, 1, 1), 0.12)
