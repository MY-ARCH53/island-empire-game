extends AnimatedSprite2D
class_name DirectionalSprite

# PixelLab'dan gelen south/east/north yönleri + west için east'in yatay
# aynası kullanılır (west sprite üretmeye gerek kalmadan 4 yön kaplanır).

var _facing: String = "south"
var _attacking: bool = false

func _ready() -> void:
	animation_finished.connect(_on_animation_finished)

func update_facing(move_vec: Vector2, moving: bool) -> void:
	if move_vec.length() > 0.05:
		if abs(move_vec.x) >= abs(move_vec.y):
			_facing = "east"
			flip_h = move_vec.x < 0
		else:
			_facing = "north" if move_vec.y < 0 else "south"
			flip_h = false

	# Vurma animasyonu tek seferlik ve öncelikli — sürerken walk/idle onu
	# ezmesin (bkz. play_attack/_on_animation_finished).
	if _attacking:
		return

	var state := "walk" if moving else "idle"
	var anim_name := "%s_%s" % [state, _facing]
	if sprite_frames == null:
		return
	if not sprite_frames.has_animation(anim_name):
		anim_name = "idle_%s" % _facing
		if not sprite_frames.has_animation(anim_name):
			return
	if animation != anim_name or not is_playing():
		play(anim_name)

# Şu anki yöne göre bir "attack_<yön>" animasyonu var mı diye bakıp
# varsa tek seferlik oynatır; yoksa sessizce hiçbir şey yapmaz (bu
# sprite için saldırı animasyonu henüz üretilmemiş olabilir).
func play_attack() -> void:
	if sprite_frames == null:
		return
	var anim_name := "attack_%s" % _facing
	if not sprite_frames.has_animation(anim_name):
		return
	_attacking = true
	play(anim_name)

func _on_animation_finished() -> void:
	if _attacking and animation == "attack_%s" % _facing:
		_attacking = false
