extends CanvasLayer

@onready var essence_label: Label = $Panel/VBox/EssenceLabel
@onready var status_label: Label = $Panel/VBox/StatusLabel
@onready var items_container: VBoxContainer = $Panel/VBox/ScrollContainer/Items
@onready var close_button: Button = $Panel/VBox/CloseButton

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	close_button.pressed.connect(func(): Audio.play("ui_click"); close())
	BackendBridge.progress_result.connect(_on_progress_result)
	BackendBridge.purchase_result.connect(_on_purchase_result)

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
	for item in GameManager.shop_items:
		_add_row(item)

func _add_row(item: Dictionary) -> void:
	var row := HBoxContainer.new()

	var label := Label.new()
	var level: int = item.get("level", 0)
	var max_level: int = item.get("maxLevel", 1)
	label.text = "%s (Lv %d/%d)\n%s" % [item["name"], level, max_level, item["desc"]]
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.autowrap_mode = TextServer.AUTOWRAP_WORD
	row.add_child(label)

	var buy_btn := Button.new()
	var next_cost = item.get("nextCost")
	if next_cost == null:
		buy_btn.text = "MAX"
		buy_btn.disabled = true
	else:
		buy_btn.text = "Satın Al (%d)" % int(next_cost)
		buy_btn.disabled = GameManager.blood_essence < int(next_cost)
		buy_btn.pressed.connect(_on_buy_pressed.bind(item["id"]))
	buy_btn.custom_minimum_size = Vector2(170, 56)
	row.add_child(buy_btn)

	items_container.add_child(row)

func _on_buy_pressed(upgrade_id: String) -> void:
	Audio.play("ui_click")
	status_label.text = "İşleniyor..."
	BackendBridge.purchase_upgrade(upgrade_id)

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
		BackendBridge.get_progress() # dükkan listesini (nextCost) tazele
	else:
		status_label.text = message
