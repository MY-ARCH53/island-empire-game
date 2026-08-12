extends Node2D

# "Kan Adası: Online" farm haritası — diğer oyuncuların temsili (bkz.
# godot-server/scripts/remote_player.gd, birebir aynı mantık). Sadece
# kendi yetkisine (multiplayer authority) sahip olan eş girişe göre
# hareket ettirir — diğer eşlerde pozisyon MultiplayerSynchronizer ile
# otomatik senkronize olur.

const SPEED := 220.0
const ATTACK_SEARCH_RADIUS := 300.0

func _ready() -> void:
	var visual: ColorRect = $Visual
	if is_multiplayer_authority():
		visual.color = Color(0.25, 0.85, 0.35, 1.0)
	else:
		visual.color = Color(0.85, 0.25, 0.25, 1.0)
	$Label.text = name

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

# En yakın düşmanı bulup sunucudan saldırı doğrulaması ister — hasarı
# BURADA hesaplamıyoruz (bkz. online_farm_client.gd → request_attack).
func _try_attack() -> void:
	var main := get_parent()
	var nearest: Node2D = null
	var nearest_dist := INF
	for child in main.get_children():
		if child.name.begins_with("enemy_"):
			var d: float = position.distance_to(child.position)
			if d < nearest_dist and d <= ATTACK_SEARCH_RADIUS:
				nearest_dist = d
				nearest = child
	if nearest:
		main.rpc_id(1, "request_attack", nearest.name)
