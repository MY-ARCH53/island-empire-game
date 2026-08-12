extends CanvasLayer

signal play_again_pressed
signal main_menu_pressed

@onready var stats_label: Label = $Panel/VBox/StatsLabel
@onready var reward_label: Label = $Panel/VBox/RewardLabel
@onready var play_again_btn: Button = $Panel/VBox/PlayAgainButton
@onready var menu_btn: Button = $Panel/VBox/MenuButton

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	play_again_btn.pressed.connect(func(): Audio.play("ui_click"); play_again_pressed.emit())
	menu_btn.pressed.connect(func(): Audio.play("ui_click"); main_menu_pressed.emit())

func open(result: Dictionary) -> void:
	var total: int = int(result["survival_seconds"])
	var minutes: int = floori(total / 60.0)
	var seconds: int = total % 60
	stats_label.text = "Süre: %02d:%02d\nÖldürme: %d\nSeviye: %d\nSkor: %d" % [
		minutes, seconds, result["kills"], result["level"], result["score"]
	]
	reward_label.text = "Ödül gönderiliyor..."
	visible = true
	GameManager.register_best_score(int(result["score"]))

func show_reward(gold: int, message: String, essence: int = 0) -> void:
	var lines: Array = []
	if gold > 0:
		lines.append("+%d altın kazandın!" % gold)
	if essence > 0:
		lines.append("+%d 🩸 Kan Özü" % essence)
	if lines.is_empty():
		lines.append(message if message != "" else "Ödül kaydedilemedi.")
	reward_label.text = "\n".join(lines)
