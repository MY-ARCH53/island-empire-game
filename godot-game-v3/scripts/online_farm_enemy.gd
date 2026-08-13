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
@export var is_elite: bool = false

var health: float
var _last_synced_health: float = -1.0
var _elite_tint: Color = Color(1, 1, 1, 1)

func _ready() -> void:
	health = max_health
	var sprite_path: String = Upgrades.ENEMIES.get(enemy_type, {}).get("sprite", "")
	if sprite_path != "" and ResourceLoader.exists(sprite_path):
		$Visual.sprite_frames = load(sprite_path)
		$Visual.play("idle_south")
	if is_elite:
		# Bölgeli zorluk sistemi (Tier4) — yeni sanat üretmeden mevcut
		# sprite'a kırmızımsı bir "elit" tonu (bkz. plans/humble-chasing-galaxy.md).
		_elite_tint = Color(1.6, 0.35, 0.35, 1.0)
		$Visual.modulate = _elite_tint

func take_damage(amount: float, attacker_peer_id: int) -> void:
	health -= amount
	if health <= 0.0:
		died.emit(attacker_peer_id)

# `health` sunucudan MultiplayerSynchronizer ile replike ediliyor (bkz.
# yukarıdaki not — take_damage istemcide hiç çağrılmıyor). Vuruş/ölüm
# geri bildirimini (ses+parçacık+uçan hasar sayısı) burada, replike
# edilen değerdeki DÜŞÜŞÜ izleyerek üretiyoruz.
func _process(_delta: float) -> void:
	var display_name: String = Upgrades.ENEMIES.get(enemy_type, {}).get("name", enemy_type)
	$Label.text = display_name + (" [ELİT]" if is_elite else "")
	$HealthBar.max_value = max_health
	$HealthBar.value = health
	if _last_synced_health < 0.0:
		_last_synced_health = health
		return
	if health < _last_synced_health:
		var dmg: float = _last_synced_health - health
		_last_synced_health = health
		_flash_hit()
		Audio.play("hit", -12.0, randf_range(0.85, 1.15))
		Effects.spawn_floating_text(get_parent(), global_position, "-%d" % int(round(dmg)), Color(1.0, 0.9, 0.3))

func _flash_hit() -> void:
	var visual: Node = $Visual
	visual.modulate = Color(1.6, 1.6, 1.6)
	var tween := create_tween()
	tween.tween_property(visual, "modulate", _elite_tint, 0.12)

# Bu düğüm SADECE gerçek bir ölümde (can<=0, sunucu queue_free çağırıp
# MultiplayerSpawner'ın despawn'ıyla) ağaçtan çıkıyor — haritadan
# ayrılırken TÜM düşmanlar da ağaçtan çıkar ama o durumda can hâlâ
# pozitiftir, bu yüzden `health <= 0.0` güvenilir bir "gerçekten öldü"
# ayracı (sahte "her düşman aynı anda öldü" sesi patlamasını önlüyor).
func _exit_tree() -> void:
	if health <= 0.0:
		Audio.play("enemy_death", -6.0, randf_range(0.9, 1.1))
		var p := get_parent()
		if p:
			var color: Color = Upgrades.ENEMIES.get(enemy_type, {}).get("color", Color(1, 1, 1))
			Effects.spawn_burst(p, global_position, color, 14 if not is_elite else 26, 160.0 if not is_elite else 240.0)
