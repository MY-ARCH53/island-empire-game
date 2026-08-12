extends CanvasLayer

# "Kan Adası: Online" hub — Faz 1: kalıcı karakter oluşturma (sınıf seçimi,
# mevcut 6 karakterin görsel/veri setini yeniden kullanır) + envanter/ekipman
# görüntüleme. Henüz multiplayer'a bağlanmıyor (bkz. plans/humble-chasing-galaxy.md).

const CharacterPreviewScript := preload("res://scripts/character_preview.gd")
const SLOT_NAMES := {"weapon": "Silah", "armor": "Zırh", "shield": "Kalkan"}
const RARITY_COLORS := {
	"common": Color(0.8, 0.8, 0.8, 1),
	"rare": Color(0.4, 0.65, 1.0, 1),
	"epic": Color(0.75, 0.4, 0.95, 1),
}

# Faz 4 — item güçlendirme. Sunucudaki gerçek kaynak:
# backend/src/controllers/online.controller.js (ENCHANT_SILVER_COST). Bu
# liste sadece maliyet ÖNİZLEMESİ için — gerçek sonuç her zaman sunucuda
# hesaplanır, istemci hiçbir zaman kendi başarı/yok olma zarını atmaz.
const MAX_ENCHANT_LEVEL := 10
const ENCHANT_SILVER_COST := [0, 200, 450, 800, 1250, 1800, 2450, 3200, 4050, 5000, 6050]

@onready var status_label: Label = $Center/Panel/VBox/StatusLabel
@onready var class_select_box: VBoxContainer = $Center/Panel/VBox/ClassSelectBox
@onready var class_items: VBoxContainer = $Center/Panel/VBox/ClassSelectBox/ScrollContainer/Items
@onready var character_box: VBoxContainer = $Center/Panel/VBox/CharacterBox
@onready var info_label: Label = $Center/Panel/VBox/CharacterBox/InfoLabel
@onready var equipped_label: Label = $Center/Panel/VBox/CharacterBox/EquippedLabel
@onready var enter_farm_button: Button = $Center/Panel/VBox/CharacterBox/MapButtonsRow/EnterFarmButton
@onready var enter_pvp_button: Button = $Center/Panel/VBox/CharacterBox/MapButtonsRow/EnterPvpButton
@onready var inventory_items: VBoxContainer = $Center/Panel/VBox/CharacterBox/ScrollContainer/Items
@onready var close_button: Button = $Center/Panel/VBox/CloseButton

var _character: Dictionary = {}
var _inventory: Array = []
var _equipped: Dictionary = {}

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	close_button.pressed.connect(func(): Audio.play("ui_click"); close())
	enter_farm_button.pressed.connect(_on_enter_farm_pressed)
	enter_pvp_button.pressed.connect(_on_enter_pvp_pressed)
	BackendBridge.online_character_result.connect(_on_character_result)
	BackendBridge.online_character_created.connect(_on_character_created)
	BackendBridge.online_inventory_result.connect(_on_inventory_result)
	BackendBridge.online_equip_result.connect(_on_equip_result)
	BackendBridge.online_unequip_result.connect(_on_unequip_result)
	BackendBridge.online_upgrade_result.connect(_on_upgrade_result)

func open() -> void:
	visible = true
	class_select_box.visible = false
	character_box.visible = false
	status_label.text = "Yükleniyor..."
	BackendBridge.get_online_character()

func close() -> void:
	visible = false

func _on_character_result(success: bool, data: Variant, message: String) -> void:
	if not success:
		status_label.text = message
		return
	if data == null:
		status_label.text = "Henüz bir online karakterin yok — bir sınıf seç."
		_show_class_select()
	else:
		_character = data
		status_label.text = ""
		_show_character(true)

func _show_class_select() -> void:
	class_select_box.visible = true
	character_box.visible = false
	for child in class_items.get_children():
		child.queue_free()
	for class_id in Upgrades.CHARACTERS.keys():
		_add_class_row(class_id)

func _add_class_row(class_id: String) -> void:
	var char_data: Dictionary = Upgrades.CHARACTERS[class_id]
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)

	var preview_box := Control.new()
	preview_box.custom_minimum_size = Vector2(64, 64)
	preview_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sprite_path: String = char_data.get("sprite_path", "")
	if sprite_path != "" and ResourceLoader.exists(sprite_path):
		var preview := AnimatedSprite2D.new()
		preview.set_script(CharacterPreviewScript)
		preview.sprite_frames = load(sprite_path)
		preview.position = Vector2(32, 36)
		preview.scale = Vector2.ONE * 1.2
		preview_box.add_child(preview)
	row.add_child(preview_box)

	var label := Label.new()
	label.text = "%s\n%s" % [char_data["name"], char_data["desc"]]
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.autowrap_mode = TextServer.AUTOWRAP_WORD
	row.add_child(label)

	var pick_btn := Button.new()
	pick_btn.text = "Bu sınıfı seç"
	pick_btn.custom_minimum_size = Vector2(150, 56)
	pick_btn.pressed.connect(_on_pick_class.bind(class_id))
	row.add_child(pick_btn)

	class_items.add_child(row)

func _on_pick_class(class_id: String) -> void:
	Audio.play("ui_click")
	status_label.text = "Karakter oluşturuluyor..."
	BackendBridge.create_online_character(class_id)

func _on_character_created(success: bool, data: Dictionary, message: String) -> void:
	status_label.text = message
	if success:
		Audio.play("levelup", -6.0)
		_character = data
		_show_character(true)

func _show_character(reload_inventory: bool) -> void:
	class_select_box.visible = false
	character_box.visible = true
	var class_id: String = _character.get("class_id", "koylu")
	var class_display_name: String = Upgrades.CHARACTERS.get(class_id, {}).get("name", class_id)
	var guild = _character.get("guild")
	var guild_line := "Klan: %s" % guild["guildName"] if guild != null else "Klan: —"
	info_label.text = "%s — Seviye %d\nTecrübe: %d   Gümüş: %d   NP: %d\n%s" % [
		class_display_name, int(_character.get("level", 1)), int(_character.get("xp", 0)),
		int(_character.get("silver", 0)), int(_character.get("np", 0)), guild_line,
	]
	if reload_inventory:
		BackendBridge.get_online_inventory()

func _on_inventory_result(success: bool, data: Dictionary, message: String) -> void:
	if not success:
		status_label.text = message
		return
	_inventory = data.get("items", [])
	_equipped = data.get("equipped", {})
	_refresh_equipped_summary()
	_refresh_inventory_list()

func _refresh_equipped_summary() -> void:
	var parts: Array = []
	for slot in ["weapon", "armor", "shield"]:
		var inv_id = _equipped.get(slot)
		var item_name := "—"
		if inv_id != null:
			for it in _inventory:
				if int(it["id"]) == int(inv_id):
					item_name = it["name"]
					break
		parts.append("%s: %s" % [SLOT_NAMES[slot], item_name])
	equipped_label.text = "Kuşanılı: " + "   ".join(parts)

func _refresh_inventory_list() -> void:
	for child in inventory_items.get_children():
		child.queue_free()
	if _inventory.is_empty():
		var empty_label := Label.new()
		empty_label.text = "Envanterin boş. (İtemler ileride avlanarak kazanılacak.)"
		inventory_items.add_child(empty_label)
		return
	for item in _inventory:
		_add_inventory_row(item)

func _add_inventory_row(item: Dictionary) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)

	var enchant_level: int = int(item.get("enchant_level", 0))
	var label := Label.new()
	var stats_parts: Array = []
	var effective_stats: Dictionary = item.get("effective_stats", item.get("base_stats", {}))
	for stat_key in effective_stats.keys():
		stats_parts.append("%s +%s" % [stat_key, str(effective_stats[stat_key])])
	var level_suffix := " +%d" % enchant_level if enchant_level > 0 else ""
	label.text = "%s%s (%s)\n%s" % [item["name"], level_suffix, SLOT_NAMES.get(item["slot"], item["slot"]), ", ".join(stats_parts)]
	label.add_theme_color_override("font_color", RARITY_COLORS.get(item.get("rarity", "common"), Color.WHITE))
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.autowrap_mode = TextServer.AUTOWRAP_WORD
	row.add_child(label)

	var action_btn := Button.new()
	action_btn.custom_minimum_size = Vector2(150, 56)
	var is_equipped: bool = int(_equipped.get(item["slot"], -1)) == int(item["id"])
	if is_equipped:
		action_btn.text = "Kuşanılı"
		action_btn.disabled = true
	else:
		action_btn.text = "Kuşan"
		action_btn.pressed.connect(_on_equip_pressed.bind(int(item["id"])))
	row.add_child(action_btn)

	var upgrade_btn := Button.new()
	upgrade_btn.custom_minimum_size = Vector2(170, 56)
	if enchant_level >= MAX_ENCHANT_LEVEL:
		upgrade_btn.text = "En yüksek (+10)"
		upgrade_btn.disabled = true
	else:
		var target := enchant_level + 1
		var cost: int = ENCHANT_SILVER_COST[target]
		upgrade_btn.text = "Güçlendir +%d (%d gümüş)" % [target, cost]
		if target >= 5:
			upgrade_btn.add_theme_color_override("font_color", Color(1.0, 0.4, 0.3, 1))
		upgrade_btn.pressed.connect(_on_upgrade_pressed.bind(int(item["id"])))
	row.add_child(upgrade_btn)

	inventory_items.add_child(row)

func _on_equip_pressed(inventory_item_id: int) -> void:
	Audio.play("ui_click")
	status_label.text = "İşleniyor..."
	BackendBridge.equip_online_item(inventory_item_id)

func _on_equip_result(success: bool, message: String) -> void:
	status_label.text = message
	if success:
		BackendBridge.get_online_inventory()

func _on_enter_farm_pressed() -> void:
	Audio.play("ui_click")
	get_tree().change_scene_to_file("res://scenes/OnlineFarmMap.tscn")

func _on_enter_pvp_pressed() -> void:
	Audio.play("ui_click")
	get_tree().change_scene_to_file("res://scenes/OnlinePvpMap.tscn")

func _on_unequip_result(success: bool, message: String) -> void:
	status_label.text = message
	if success:
		BackendBridge.get_online_inventory()

func _on_upgrade_pressed(inventory_item_id: int) -> void:
	Audio.play("ui_click")
	status_label.text = "Güçlendiriliyor..."
	BackendBridge.upgrade_online_item(inventory_item_id)

func _on_upgrade_result(success: bool, data: Dictionary, message: String) -> void:
	if not success:
		status_label.text = message
		return
	var outcome: String = data.get("outcome", "")
	var item_name: String = data.get("itemName", "eşya")
	match outcome:
		"success":
			status_label.text = "%s +%d oldu!" % [item_name, int(data.get("newLevel", 0))]
			Audio.play("levelup", -6.0)
		"destroyed":
			status_label.text = "%s güçlendirme sırasında YOK OLDU!" % item_name
			Audio.play("ui_click")
		_:
			status_label.text = "%s güçlendirme başarısız oldu." % item_name
			Audio.play("ui_click")
	# Gümüş değişti — get_online_character() çağırmıyoruz çünkü sonucu
	# status_label'ı hemen sıfırlıyor (_on_character_result); onun yerine
	# yerel karakter verisini yamalayıp sadece envanteri tazeliyoruz.
	if data.has("silver"):
		_character["silver"] = data["silver"]
		_show_character(false)
	BackendBridge.get_online_inventory()
