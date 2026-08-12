extends Node2D

# Sanat varlığı olmadan hızlı prototipleme için basit çokgen görsel.
# PixelLab ile gerçek sprite üretilince Visual node'u bir Sprite2D ile değiştirilebilir.

@export var radius: float = 16.0:
	set(value):
		radius = value
		queue_redraw()
@export var shape_color: Color = Color.WHITE:
	set(value):
		shape_color = value
		queue_redraw()
@export var sides: int = 10:
	set(value):
		sides = value
		queue_redraw()

func _draw() -> void:
	var points := PackedVector2Array()
	for i in range(sides):
		var angle: float = i * TAU / sides
		points.append(Vector2(cos(angle), sin(angle)) * radius)
	draw_colored_polygon(points, shape_color)
