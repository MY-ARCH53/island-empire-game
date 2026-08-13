extends Node2D

# Faz 2 — basit, sunucu-otoriter bir düşman. Hareket etmiyor (v1 için kasıtlı
# sadeleştirme — AI/dolaşma sonraki bir geçişte eklenebilir). Can ve ölüm
# SADECE sunucuda hesaplanır (take_damage sadece main.gd'nin sunucu tarafından
# çağrılır, istemciden asla doğrudan tetiklenmez).

signal died(killer_peer_id: int)

@export var max_health: float = 30.0
@export var xp_reward: int = 8
@export var silver_reward: int = 5
@export var enemy_type: String = "bat"
@export var is_elite: bool = false

var health: float

func _ready() -> void:
	health = max_health
	var visual: ColorRect = $Visual
	visual.color = Color(0.75, 0.25, 0.2, 1.0)

func _process(_delta: float) -> void:
	$Label.text = enemy_type.capitalize() + (" [ELİT]" if is_elite else "")

# Sadece sunucuda çağrılır (main.gd'deki saldırı çözümlemesinden).
func take_damage(amount: float, attacker_peer_id: int) -> void:
	health -= amount
	if health <= 0.0:
		died.emit(attacker_peer_id)
