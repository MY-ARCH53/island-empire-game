extends Node2D

# "Kan Adası: Online" PvP haritası — oyuncu görselinin istemci tarafı
# (bkz. godot-server/scripts/pvp_player.gd, birebir aynı). can, position'dan
# farklı olarak SUNUCU otoriter — bu düğümün kendi senkronizatöründe hiç
# replike edilmiyor, sunucu her değişiklikte health_update RPC'siyle
# açıkça yayın yapıyor (bkz. online_pvp_client.gd).

const SPEED := 220.0
const ATTACK_SEARCH_RADIUS := 300.0
# Gerçek karakter sprite'ı kullanıldığından renkle ayırt edemiyoruz artık —
# kendi karakterimizi hafif altın bir modulate ile, rakipleri hafif kırmızı
# bir tonla vurguluyoruz (PvP'de "bu kim" netliği hâlâ önemli).
const SELF_TINT := Color(1.15, 1.1, 0.85, 1.0)
const ENEMY_TINT := Color(1.1, 0.85, 0.85, 1.0)

# Sunucu, spawn anında _spawn_player'da bu değeri set ediyor.
var class_id: String = "koylu"
var health: float = 100.0
var max_health: float = 100.0

var _last_position: Vector2 = Vector2.ZERO

func _ready() -> void:
	var sprite_path: String = Upgrades.CHARACTERS.get(class_id, {}).get("sprite_path", "")
	if sprite_path != "" and ResourceLoader.exists(sprite_path):
		$Visual.sprite_frames = load(sprite_path)
	$Visual.modulate = SELF_TINT if is_multiplayer_authority() else ENEMY_TINT
	_update_label()
	_last_position = position

func _update_label() -> void:
	$Label.text = "%s (%d/%d)" % [name, int(health), int(max_health)]
	$HealthBar.max_value = max_health
	$HealthBar.value = health

# Sunucu-otoriter hasar anında online_pvp_client.gd → health_update()
# tarafından çağrılıyor (bkz. enemy.gd → _flash_hit(), aynı desen).
func flash_hit() -> void:
	var target: Color = SELF_TINT if is_multiplayer_authority() else ENEMY_TINT
	$Visual.modulate = Color(1.8, 1.4, 1.4, 1.0)
	var tween := create_tween()
	tween.tween_property($Visual, "modulate", target, 0.15)

func _process(_delta: float) -> void:
	_update_label()
	if not is_multiplayer_authority():
		var movement := position - _last_position
		_last_position = position
		$Visual.update_facing(movement, movement.length() > 0.5)

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

func _unhandled_input(event: InputEvent) -> void:
	if not is_multiplayer_authority():
		return
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_SPACE:
		_try_attack()

# En yakın DİĞER oyuncuyu bulup sunucudan PvP saldırı doğrulaması ister —
# hasarı burada hesaplamıyoruz (bkz. online_pvp_client.gd → request_pvp_attack).
func _try_attack() -> void:
	Audio.play("ui_click", -14.0, 1.35) # kılıç sallama hissi — vuruş onayı health_update'te
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
