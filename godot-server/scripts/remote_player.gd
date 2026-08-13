extends Node2D

# Faz 0 prototipi: gerçek oyun karakteri değil, sadece ağ senkronizasyonunu
# kanıtlamak için hareket eden renkli bir kare. Sadece kendi yetkisine
# (multiplayer authority) sahip olan eş, girişe göre hareket ettirir —
# diğer eşlerde bu node'un pozisyonu MultiplayerSynchronizer ile otomatik
# senkronize olur.

const SPEED := 220.0
const ATTACK_SEARCH_RADIUS := 300.0

# Faz B — sunucu her değişiklikte main.gd → health_update RPC'siyle
# yazıyor (bkz. pvp_player.gd'deki birebir aynı desen).
var health: float = 120.0
var max_health: float = 120.0

func _ready() -> void:
	var visual: ColorRect = $Visual
	if is_multiplayer_authority():
		visual.color = Color(0.25, 0.85, 0.35, 1.0)
	else:
		visual.color = Color(0.85, 0.25, 0.25, 1.0)
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
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	match event.keycode:
		KEY_SPACE:
			_try_attack()
		KEY_P:
			_try_invite()
		KEY_O:
			get_parent().rpc_id(1, "accept_party_invite")
		KEY_L:
			get_parent().rpc_id(1, "leave_party")

# En yakın düşmanı bulup sunucudan saldırı doğrulaması ister — hasarı
# BURADA hesaplamıyoruz, sadece "şuna saldırmak istiyorum" diyoruz
# (bkz. main.gd → request_attack, menzil/bekleme süresi sunucuda kontrol edilir).
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

# Faz 5 — en yakın DİĞER oyuncuyu (düşman değil) partiye davet eder.
func _try_invite() -> void:
	var main := get_parent()
	var nearest: Node2D = null
	var nearest_dist := INF
	for child in main.get_children():
		if child != self and child.name.is_valid_int():
			var d: float = position.distance_to(child.position)
			if d < nearest_dist and d <= ATTACK_SEARCH_RADIUS:
				nearest_dist = d
				nearest = child
	if nearest:
		main.rpc_id(1, "request_party_invite", nearest.name)
