extends CanvasLayer

@onready var essence_label: Label = $Center/Panel/VBox/EssenceLabel
@onready var status_label: Label = $Center/Panel/VBox/StatusLabel
@onready var items_container: VBoxContainer = $Center/Panel/VBox/ScrollContainer/Items
@onready var close_button: Button = $Center/Panel/VBox/CloseButton

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	close_button.pressed.connect(func(): Audio.play("ui_click"); close())
	BackendBridge.progress_result.connect(_on_progress_result)
	BackendBridge.character_purchase_result.connect(_on_purchase_result)
	BackendBridge.character_select_result.connect(_on_select_result)

func open() -> void:
	visible = true
	status_label.text = "Yükleniyor..."
	_refresh()
	BackendBridge.get_progress()

func close() -> void:
	visible = false

func _refresh() -> void:
	essence_label.text = "🩸 Kan Özü: %d" % GameManager.blood_essence
	for child in items_container.get_children():
		child.queue_free()
	for char_id in Upgrades.CHARACTERS.keys():
		_add_row(char_id)

const CharacterPreviewScript := preload("res://scripts/character_preview.gd")

func _add_row(char_id: String) -> void:
	var char_data: Dictionary = Upgrades.CHARACTERS[char_id]
	var unlocked: bool = GameManager.unlocked_characters.has(char_id)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)

	var preview_box := Control.new()
	preview_box.custom_minimum_size = Vector2(72, 72)
	preview_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sprite_path: String = char_data.get("sprite_path", "")
	if sprite_path != "" and ResourceLoader.exists(sprite_path):
		var preview := AnimatedSprite2D.new()
		preview.set_script(CharacterPreviewScript)
		preview.sprite_frames = load(sprite_path)
		preview.position = Vector2(36, 40)
		preview.scale = Vector2.ONE * 1.4
		if not unlocked:
			# Kilitli karakter: koyu silüet + kilit ikonu (gri tonlama yerine
			# modulate ile karartma — shader gerektirmeden anında "kilitli" hissi verir).
			preview.modulate = Color(0.10, 0.10, 0.10, 1.0)
		preview_box.add_child(preview)
	if not unlocked:
		var lock_label := Label.new()
		lock_label.text = "🔒"
		lock_label.add_theme_font_size_override("font_size", 26)
		lock_label.set_anchors_preset(Control.PRESET_FULL_RECT)
		lock_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lock_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		lock_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		preview_box.add_child(lock_label)
	row.add_child(preview_box)

	var label := Label.new()
	var weapon_name: String = Upgrades.WEAPONS[char_data["starting_weapon"]]["name"]
	label.text = "%s (%s)\n%s" % [char_data["name"], weapon_name, char_data["desc"]]
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.autowrap_mode = TextServer.AUTOWRAP_WORD
	row.add_child(label)

	var action_btn := Button.new()
	action_btn.custom_minimum_size = Vector2(170, 56)
	if char_id == GameManager.selected_character:
		action_btn.text = "Seçili"
		action_btn.disabled = true
	elif unlocked:
		action_btn.text = "Seç"
		action_btn.pressed.connect(_on_select_pressed.bind(char_id))
	else:
		var cost: int = int(char_data.get("unlock_cost", 0))
		action_btn.text = "Satın Al (%d)" % cost
		action_btn.disabled = GameManager.blood_essence < cost
		action_btn.pressed.connect(_on_buy_pressed.bind(char_id))
	row.add_child(action_btn)

	items_container.add_child(row)

func _on_buy_pressed(character_id: String) -> void:
	Audio.play("ui_click")
	status_label.text = "İşleniyor..."
	BackendBridge.purchase_character(character_id)

func _on_select_pressed(character_id: String) -> void:
	Audio.play("ui_click")
	status_label.text = "İşleniyor..."
	BackendBridge.select_character(character_id)

func _on_progress_result(success: bool, data: Dictionary, message: String) -> void:
	if success:
		GameManager.apply_progress(data)
		status_label.text = ""
		if visible:
			_refresh()
	elif visible:
		status_label.text = message

func _on_purchase_result(success: bool, data: Dictionary, message: String) -> void:
	if success:
		Audio.play("levelup", -6.0)
		status_label.text = message
		GameManager.apply_progress(data)
		_refresh()
	else:
		status_label.text = message

func _on_select_result(success: bool, data: Dictionary, message: String) -> void:
	if success:
		Audio.play("ui_click")
		status_label.text = message if message != "" else "Karakter seçildi."
		GameManager.apply_progress(data)
		_refresh()
	else:
		status_label.text = message
