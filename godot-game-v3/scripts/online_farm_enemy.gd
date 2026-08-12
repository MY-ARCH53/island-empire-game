extends Node2D

# "Kan Adası: Online" farm haritası — düşman görselinin istemci tarafı
# (bkz. godot-server/scripts/farm_enemy.gd, birebir aynı). Can/ölüm
# SADECE sunucuda hesaplanır; bu script sadece SENKRONİZE EDİLEN pozisyon/
# can değerlerini gösterir, take_damage istemci tarafında hiç çağrılmaz.

signal died(killer_peer_id: int)

@export var max_health: float = 30.0
@export var xp_reward: int = 8
@export var silver_reward: int = 5
@export var enemy_type: String = "bat"

var health: float

func _ready() -> void:
	health = max_health
	var visual: ColorRect = $Visual
	visual.color = Color(0.75, 0.25, 0.2, 1.0)

func take_damage(amount: float, attacker_peer_id: int) -> void:
	health -= amount
	if health <= 0.0:
		died.emit(attacker_peer_id)
