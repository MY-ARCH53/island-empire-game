extends Node2D

var velocity: Vector2 = Vector2.ZERO
var damage: float = 10.0
var life_time: float = 2.5
var hit_radius: float = 8.0
var _hit_enemies: Dictionary = {}

func setup(direction: Vector2, speed: float, dmg: float) -> void:
	velocity = direction * speed
	damage = dmg
	rotation = direction.angle()

func _process(delta: float) -> void:
	global_position += velocity * delta
	life_time -= delta
	if life_time <= 0.0:
		queue_free()
		return

	for enemy in get_tree().get_nodes_in_group("enemies"):
		if not is_instance_valid(enemy) or _hit_enemies.has(enemy):
			continue
		if global_position.distance_to(enemy.global_position) <= (hit_radius + enemy.radius):
			enemy.take_damage(damage)
			_hit_enemies[enemy] = true
			queue_free()
			return
