extends Node

# Sanat varlığı gerektirmeyen basit parçacık patlamaları (düşman ölümü,
# seviye atlama vb.) — CPUParticles2D + çalışma zamanında üretilen 4x4 beyaz
# doku. Renk parametresiyle her çağrıda farklı görünür.

var _dot_texture: ImageTexture

func _ready() -> void:
	var img := Image.create(4, 4, false, Image.FORMAT_RGBA8)
	img.fill(Color(1, 1, 1, 1))
	_dot_texture = ImageTexture.create_from_image(img)

func spawn_burst(parent: Node, pos: Vector2, color: Color, amount: int = 14, speed: float = 140.0) -> void:
	var p := CPUParticles2D.new()
	p.texture = _dot_texture
	p.amount = amount
	p.lifetime = 0.5
	p.one_shot = true
	p.explosiveness = 1.0
	p.direction = Vector2.UP
	p.spread = 180.0
	p.gravity = Vector2(0, 260)
	p.initial_velocity_min = speed * 0.5
	p.initial_velocity_max = speed
	p.scale_amount_min = 1.5
	p.scale_amount_max = 3.0
	p.color = color
	p.process_mode = Node.PROCESS_MODE_ALWAYS # duraklatma anında (seviye atlama) yarıda kesilmesin
	parent.add_child(p)
	p.global_position = pos
	p.emitting = true
	var timer := parent.get_tree().create_timer(p.lifetime + 0.15, true, false, true)
	timer.timeout.connect(p.queue_free)
