extends Control

# Ekranın sol-alt köşesinde basit sürükle-bırak joystick (mobil/dokunmatik için).
# Masaüstünde fare ile de çalışır (bonus).

@export var radius: float = 70.0

var _dragging: bool = false
var _center: Vector2
var _knob_pos: Vector2

func _ready() -> void:
	_center = size / 2.0
	_knob_pos = _center

func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch or event is InputEventMouseButton:
		if event.pressed:
			_dragging = true
			_center = event.position
			_knob_pos = event.position
		else:
			_dragging = false
			_knob_pos = _center
			GameManager.touch_vector = Vector2.ZERO
		queue_redraw()
	elif (event is InputEventScreenDrag or event is InputEventMouseMotion) and _dragging:
		var offset: Vector2 = event.position - _center
		if offset.length() > radius:
			offset = offset.normalized() * radius
		_knob_pos = _center + offset
		GameManager.touch_vector = offset / radius
		queue_redraw()

func _draw() -> void:
	if _dragging:
		draw_circle(_center, radius, Color(1, 1, 1, 0.12))
		draw_circle(_knob_pos, radius * 0.4, Color(1, 1, 1, 0.35))
