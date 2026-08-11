extends Node2D

var xp_value: int = 3
var _speed: float = 0.0

func setup(value: int) -> void:
	xp_value = value

func _process(delta: float) -> void:
	var player := get_tree().get_first_node_in_group("player")
	if player == null:
		return
	var dist: float = global_position.distance_to(player.global_position)
	if dist <= player.pickup_radius:
		_speed = lerp(_speed, 900.0, 0.15)
		global_position = global_position.move_toward(player.global_position, _speed * delta)
		if dist < 14.0:
			player.gain_xp(xp_value)
			Audio.play("pickup", -12.0, randf_range(0.95, 1.15))
			queue_free()
	else:
		_speed = 0.0
