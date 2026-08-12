extends AnimatedSprite2D
class_name DirectionalSprite

# PixelLab'dan gelen south/east/north yönleri + west için east'in yatay
# aynası kullanılır (west sprite üretmeye gerek kalmadan 4 yön kaplanır).

var _facing: String = "south"

func update_facing(move_vec: Vector2, moving: bool) -> void:
	if move_vec.length() > 0.05:
		if abs(move_vec.x) >= abs(move_vec.y):
			_facing = "east"
			flip_h = move_vec.x < 0
		else:
			_facing = "north" if move_vec.y < 0 else "south"
			flip_h = false

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
