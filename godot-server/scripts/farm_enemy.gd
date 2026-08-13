extends Node2D

# Faz 2 — sunucu-otoriter bir düşman. Faz B (bkz. plans/humble-chasing-galaxy.md
# "Farm Derinliği") ile artık hareket ediyor: yakındaki oyuncuyu kovalıyor,
# menzile girince temas hasarı veriyor, spawn noktasından çok uzaklaşırsa geri
# dönüyor (leash). Can ve ölüm SADECE sunucuda hesaplanır (take_damage sadece
# main.gd'nin sunucu tarafından çağrılır, istemciden asla doğrudan tetiklenmez).

signal died(killer_peer_id: int)
signal attacked_player(victim_peer_id: int, damage: float)

@export var max_health: float = 30.0
@export var xp_reward: int = 8
@export var silver_reward: int = 5
@export var enemy_type: String = "bat"
@export var is_elite: bool = false
@export var contact_damage: float = 5.0
@export var move_speed: float = 70.0

const AGGRO_RANGE := 220.0
const CONTACT_RANGE := 40.0
const CONTACT_COOLDOWN := 1.2
const LEASH_RANGE := 300.0

var health: float
var _spawn_position: Vector2
var _last_contact_time: float = -999.0

# Faz D — vebali'nin "Zehir Bulutu" yeteneği (bkz. main.gd → _ability_vebali).
var _poison_ticks_left: int = 0
var _poison_tick_damage: float = 0.0
var _poison_source_peer_id: int = -1
var _poison_timer: float = 0.0

func _ready() -> void:
	health = max_health
	_spawn_position = position
	var visual: ColorRect = $Visual
	visual.color = Color(0.75, 0.25, 0.2, 1.0)

func apply_poison(ticks: int, tick_damage: float, source_peer_id: int) -> void:
	_poison_ticks_left = ticks
	_poison_tick_damage = tick_damage
	_poison_source_peer_id = source_peer_id
	_poison_timer = 0.0

func _process(delta: float) -> void:
	$Label.text = enemy_type.capitalize() + (" [ELİT]" if is_elite else "")
	if not is_multiplayer_authority() or health <= 0.0 or _poison_ticks_left <= 0:
		return
	_poison_timer += delta
	if _poison_timer >= 1.0:
		_poison_timer = 0.0
		_poison_ticks_left -= 1
		take_damage(_poison_tick_damage, _poison_source_peer_id)

# Düşmanlar spawner.spawn()/add_child() ile eklenirken hiç
# set_multiplayer_authority() çağrılmıyor, o yüzden varsayılan otorite peer 1
# (sunucu) — is_multiplayer_authority() SADECE gerçek sunucu sürecinde true
# olur (istemci tarafında bu script hiç kullanılmıyor zaten, ayrı bir
# online_farm_enemy.gd var — bkz. plan notu).
func _physics_process(delta: float) -> void:
	if not is_multiplayer_authority() or health <= 0.0:
		return
	if position.distance_to(_spawn_position) > LEASH_RANGE:
		position = position.move_toward(_spawn_position, move_speed * delta)
		return
	var target := _find_nearest_player()
	if target == null:
		return
	var dist := position.distance_to(target.position)
	if dist <= CONTACT_RANGE:
		var now := Time.get_ticks_msec() / 1000.0
		if now - _last_contact_time >= CONTACT_COOLDOWN:
			_last_contact_time = now
			attacked_player.emit(int(str(target.name)), contact_damage)
	elif dist <= AGGRO_RANGE:
		position = position.move_toward(target.position, move_speed * delta)

func _find_nearest_player() -> Node2D:
	var nearest: Node2D = null
	var nearest_dist := INF
	for child in get_parent().get_children():
		if child.name.is_valid_int():
			var d := position.distance_to(child.position)
			if d < nearest_dist:
				nearest_dist = d
				nearest = child
	return nearest

# Sadece sunucuda çağrılır (main.gd'deki saldırı çözümlemesinden).
func take_damage(amount: float, attacker_peer_id: int) -> void:
	health -= amount
	if health <= 0.0:
		died.emit(attacker_peer_id)
