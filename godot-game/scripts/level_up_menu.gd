extends CanvasLayer

signal choice_selected(choice: Dictionary)

@onready var title_label: Label = $Center/Panel/VBox/TitleLabel
@onready var button_container: VBoxContainer = $Center/Panel/VBox/Choices

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false

func open(new_level: int, choices: Array, title_override: String = "") -> void:
	title_label.text = title_override if title_override != "" else "Seviye %d! Bir yükseltme seç:" % new_level
	for child in button_container.get_children():
		child.queue_free()
	for choice in choices:
		var btn := Button.new()
		btn.text = _describe_choice(choice)
		btn.custom_minimum_size = Vector2(0, 64)
		btn.pressed.connect(_on_button_pressed.bind(choice))
		button_container.add_child(btn)
	visible = true

func close() -> void:
	visible = false

func _on_button_pressed(choice: Dictionary) -> void:
	Audio.play("ui_click")
	choice_selected.emit(choice)

func _describe_choice(choice: Dictionary) -> String:
	if choice["type"] == "weapon":
		var data: Dictionary = Upgrades.WEAPONS[choice["id"]]
		var lvl: int = choice["level"]
		if lvl == 0:
			return "YENİ: %s\n%s" % [data["name"], data["desc"]]
		return "%s (Lv %d → %d)\n%s" % [data["name"], lvl, lvl + 1, data["desc"]]
	else:
		var info: Dictionary = Upgrades.STAT_UPGRADE_INFO[choice["id"]]
		return "%s\n%s" % [info["name"], info["desc"]]
