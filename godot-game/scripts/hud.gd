extends CanvasLayer

@onready var health_bar: ProgressBar = $TopLeft/HealthBar
@onready var xp_bar: ProgressBar = $TopLeft/XPBar
@onready var timer_label: Label = $TopLeft/InfoRow/TimerLabel
@onready var kills_label: Label = $TopLeft/KillsLabel
@onready var level_label: Label = $TopLeft/InfoRow/LevelLabel
@onready var boss_bar_container: VBoxContainer = $BossPanel
@onready var boss_bar: ProgressBar = $BossPanel/BossHealthBar
@onready var boss_name_label: Label = $BossPanel/BossNameLabel

func set_health(current: float, max_h: float) -> void:
	health_bar.max_value = max_h
	health_bar.value = current

func set_xp(current: float, needed: float) -> void:
	xp_bar.max_value = needed
	xp_bar.value = current

func set_timer(seconds: float) -> void:
	var total: int = int(seconds)
	var m: int = floori(total / 60.0)
	var s: int = total % 60
	timer_label.text = "%02d:%02d" % [m, s]

func set_kills(count: int) -> void:
	kills_label.text = "Öldürme: %d" % count

func set_level(lvl: int) -> void:
	level_label.text = "Lv %d" % lvl

func show_boss_bar(boss_name: String) -> void:
	boss_name_label.text = boss_name
	boss_bar_container.visible = true

func hide_boss_bar() -> void:
	boss_bar_container.visible = false

func set_boss_health(current: float, max_h: float) -> void:
	boss_bar.max_value = max_h
	boss_bar.value = current
