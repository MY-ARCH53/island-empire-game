extends Node2D

# "Kan Adası: Online" farm haritası — diğer oyuncuların temsili (bkz.
# godot-server/scripts/remote_player.gd, birebir aynı mantık). Sadece
# kendi yetkisine (multiplayer authority) sahip olan eş girişe göre
# hareket ettirir — diğer eşlerde pozisyon MultiplayerSynchronizer ile
# otomatik senkronize olur.

const SPEED := 220.0
const ATTACK_SEARCH_RADIUS := 300.0

# Sunucu, spawn anında _spawn_player'da bu değeri set ediyor (bkz.
# online_farm_client.gd) — _ready() çalışmadan ÖNCE atanmış oluyor.
var class_id: String = "koylu"

# Faz B — sunucu her değişiklikte online_farm_client.gd → health_update
# RPC'siyle yazıyor (PvP'deki aynı desen, bkz. online_pvp_player.gd).
var health: float = 120.0
var max_health: float = 120.0

var _last_position: Vector2 = Vector2.ZERO

func _ready() -> void:
	var sprite_path: String = Upgrades.CHARACTERS.get(class_id, {}).get("sprite_path", "")
	if sprite_path != "" and ResourceLoader.exists(sprite_path):
		$Visual.sprite_frames = load(sprite_path)
	_update_label()
	_last_position = position

func _update_label() -> void:
	$Label.text = "%s (%d/%d)" % [name, int(health), int(max_health)]
	$HealthBar.max_value = max_health
	$HealthBar.value = health

# Sunucu-otoriter hasar anında online_farm_client.gd → health_update()
# tarafından çağrılıyor (bkz. online_pvp_player.gd → flash_hit(), aynı desen).
func flash_hit() -> void:
	$Visual.modulate = Color(1.8, 1.4, 1.4, 1.0)
	var tween := create_tween()
	tween.tween_property($Visual, "modulate", Color(1, 1, 1), 0.15)

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
	$Visual.update_facing(dir, dir.length() > 0.05)

# Yetkisi olmayan (uzak) oyuncular için: pozisyon MultiplayerSynchronizer ile
# geliyor, girişimiz yok — bir önceki kareyle kıyaslayıp yön/hareket tahmin
# ediyoruz (yaygın bir "uzak varlık animasyonu" tekniği).
func _process(_delta: float) -> void:
	_update_label()
	if is_multiplayer_authority():
		return
	var movement := position - _last_position
	_last_position = position
	$Visual.update_facing(movement, movement.length() > 0.5)

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
		KEY_H:
			get_parent().rpc_id(1, "request_use_potion")
		KEY_R:
			get_parent().rpc_id(1, "request_use_ability", 0)
		KEY_T:
			get_parent().rpc_id(1, "request_use_ability", 1)
		KEY_Y:
			get_parent().rpc_id(1, "request_use_ability", 2)
		KEY_U:
			get_parent().rpc_id(1, "request_use_ability", 3)

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
