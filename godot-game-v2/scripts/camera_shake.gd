extends Camera2D

var _strength: float = 0.0
var _decay: float = 5.0

func _process(_delta: float) -> void:
	if _strength > 0.05:
		offset = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)) * _strength
		_strength = lerp(_strength, 0.0, _decay * get_process_delta_time())
	elif offset != Vector2.ZERO:
		offset = Vector2.ZERO

func shake(amount: float, decay: float = 5.0) -> void:
	_strength = max(_strength, amount)
	_decay = decay
