extends Node2D

# Faz 0 prototipi: gerçek oyun karakteri değil, sadece ağ senkronizasyonunu
# kanıtlamak için hareket eden renkli bir kare. Sadece kendi yetkisine
# (multiplayer authority) sahip olan eş, girişe göre hareket ettirir —
# diğer eşlerde bu node'un pozisyonu MultiplayerSynchronizer ile otomatik
# senkronize olur.

const SPEED := 220.0

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
