extends Node2D

# Faz 3 — PvP oyuncusu. RemotePlayer'dan (farm) kasıtlı olarak ayrı bir
# script: farm haritasında oyuncuların birbirine hasar verebilmesi hiç
# istenmiyor, bu yüzden "can" kavramı sadece burada var. Hareket aynı
# desen (sadece yetki sahibi eş uygular, diğerlerinde senkronize gelir).

const SPEED := 220.0
const ATTACK_SEARCH_RADIUS := 300.0

var health: float = 100.0
var max_health: float = 100.0

func _ready() -> void:
	var visual: ColorRect = $Visual
	if is_multiplayer_authority():
		visual.color = Color(0.25, 0.55, 0.95, 1.0)
	else:
		visual.color = Color(0.95, 0.55, 0.15, 1.0)
	_update_label()

func _update_label() -> void:
	$Label.text = "%s (%d/%d)" % [name, int(health), int(max_health)]

func _process(_delta: float) -> void:
	_update_label()

func _physics_process(delta: float) -> void:
	if not is_multiplayer_authority():
		return
	var dir := Vector2.ZERO
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		dir.x -= 1
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		dir.x += 1
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		dir.y -= 1
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		dir.y += 1
	if dir.length() > 0.0:
		dir = dir.normalized()
	position += dir * SPEED * delta

func _unhandled_input(event: InputEvent) -> void:
	if not is_multiplayer_authority():
		return
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_SPACE:
		_try_attack()

# En yakın DİĞER oyuncuyu bulup sunucudan PvP saldırı doğrulaması ister —
# hasarı burada hesaplamıyoruz (bkz. pvp_main.gd → request_pvp_attack).
func _try_attack() -> void:
	var main := get_parent()
	var nearest: Node2D = null
	var nearest_dist := INF
	for child in main.get_children():
		if child is Node2D and child != self and child.has_method("_update_label"):
			var d: float = position.distance_to(child.position)
			if d < nearest_dist and d <= ATTACK_SEARCH_RADIUS:
				nearest_dist = d
				nearest = child
	if nearest:
		main.rpc_id(1, "request_pvp_attack", nearest.name)
