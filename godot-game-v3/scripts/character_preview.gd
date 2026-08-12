extends AnimatedSprite2D

# Karakter Seç ekranındaki "dönen" önizleme: güney→doğu→kuzey→batı arasında
# periyodik olarak yön değiştirip karakterin kendi etrafında döndüğü izlenimi
# verir. Batı için ayrı bir animasyon üretilmedi — doğu, directional_sprite.gd'deki
# desenle aynı şekilde flip_h ile yatay olarak aynalanıyor.

const FACINGS := ["south", "east", "north", "east"]
const FLIP := [false, false, false, true]
const INTERVAL := 0.9

var _index: int = 0

func _ready() -> void:
	var timer := Timer.new()
	timer.wait_time = INTERVAL
	timer.autostart = true
	timer.timeout.connect(_advance)
	add_child(timer)
	_show_current()

func _advance() -> void:
	_index = (_index + 1) % FACINGS.size()
	_show_current()

func _show_current() -> void:
	flip_h = FLIP[_index]
	var anim := "idle_%s" % FACINGS[_index]
	if sprite_frames and sprite_frames.has_animation(anim):
		play(anim)
