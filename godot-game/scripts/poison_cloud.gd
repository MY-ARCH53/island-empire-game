extends Node2D

var radius: float = 70.0
var damage_per_tick: float = 4.0
var duration: float = 3.5
var tick_interval: float = 0.5

func _ready() -> void:
	$TickTimer.timeout.connect(_on_tick_timeout)
	$LifeTimer.timeout.connect(_on_life_timeout)

func setup(r: float, dmg: float, dur: float, tick: float) -> void:
	radius = r
	damage_per_tick = dmg
	duration = dur
	tick_interval = tick

	var visual: Sprite2D = $Visual
	visual.scale = Vector2.ONE * (radius * 2.0 / visual.texture.get_width())

	$TickTimer.wait_time = tick_interval
	$TickTimer.start()
	$LifeTimer.wait_time = duration
	$LifeTimer.start()

func _on_tick_timeout() -> void:
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if is_instance_valid(enemy) and global_position.distance_to(enemy.global_position) <= radius:
			enemy.take_damage(damage_per_tick)

func _on_life_timeout() -> void:
	var tween := create_tween()
	tween.tween_property(self, "modulate:a", 0.0, 0.3)
	tween.tween_callback(queue_free)
