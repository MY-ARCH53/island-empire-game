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
	var sprite_path: String = Upgrades.ENEMIES.get(enemy_type, {}).get("sprite", "")
	if sprite_path != "" and ResourceLoader.exists(sprite_path):
		$Visual.sprite_frames = load(sprite_path)
		$Visual.play("idle_south")

func take_damage(amount: float, attacker_peer_id: int) -> void:
	health -= amount
	if health <= 0.0:
		died.emit(attacker_peer_id)
