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
	# add_child ertelenmiş çağrılıyor: online moddaki düşman/oyuncu ölüm anı
	# tam olarak MultiplayerSpawner'ın o düğümü ağaçtan çıkardığı karede
	# geliyor, o an ebeveyn "çocuk kurulumuyla meşgul" oluyor ve doğrudan
	# add_child() sessizce başarısız oluyordu (gerçek istemci testiyle
	# yakalandı) — call_deferred bu çakışmayı bütünüyle ortadan kaldırıyor.
	_finish_burst.call_deferred(parent, p, pos)

func _finish_burst(parent: Node, p: CPUParticles2D, pos: Vector2) -> void:
	if not is_instance_valid(parent) or not parent.is_inside_tree():
		return
	parent.add_child(p)
	p.global_position = pos
	p.emitting = true
	var timer := parent.get_tree().create_timer(p.lifetime + 0.15, true, false, true)
	timer.timeout.connect(p.queue_free)

# Yükselip solan hasar/ödül sayısı — sanat varlığı gerektirmeyen basit bir
# Label + Tween (online modda can barının yanında "ne kadar" hissi için).
func spawn_floating_text(parent: Node, pos: Vector2, text: String, color: Color = Color(1, 1, 1)) -> void:
	var label := Label.new()
	label.text = text
	label.z_index = 10
	label.process_mode = Node.PROCESS_MODE_ALWAYS
	label.add_theme_font_size_override("font_size", 18)
	label.add_theme_color_override("font_color", color)
	label.add_theme_constant_override("outline_size", 4)
	label.add_theme_color_override("font_outline_color", Color(0, 0, 0))
	_finish_floating_text.call_deferred(parent, label, pos)

func _finish_floating_text(parent: Node, label: Label, pos: Vector2) -> void:
	if not is_instance_valid(parent) or not parent.is_inside_tree():
		return
	parent.add_child(label)
	label.global_position = pos + Vector2(randf_range(-12.0, 12.0), -20.0)
	var start_y: float = label.global_position.y
	var tween := label.create_tween()
	tween.set_parallel(true)
	tween.tween_property(label, "global_position:y", start_y - 42.0, 0.7)
	tween.tween_property(label, "modulate:a", 0.0, 0.5).set_delay(0.25)
	tween.chain().tween_callback(label.queue_free)
