extends Control

@onready var best_label: Label = $Center/VBox/BestScore
@onready var play_button: Button = $Center/VBox/PlayButton
@onready var shop_button: Button = $Center/VBox/ShopButton
@onready var character_button: Button = $Center/VBox/CharacterButton
@onready var login_box: VBoxContainer = $Center/VBox/LoginBox
@onready var username_field: LineEdit = $Center/VBox/LoginBox/UsernameField
@onready var password_field: LineEdit = $Center/VBox/LoginBox/PasswordField
@onready var login_button: Button = $Center/VBox/LoginBox/LoginButton
@onready var status_label: Label = $Center/VBox/StatusLabel
@onready var character_row: HBoxContainer = $Center/VBox/SelectedCharacterRow
@onready var character_portrait: TextureRect = $Center/VBox/SelectedCharacterRow/Portrait
@onready var character_label: Label = $Center/VBox/SelectedCharacterRow/CharacterLabel
@onready var shop_screen: CanvasLayer = $ShopScreen
@onready var character_select: CanvasLayer = $CharacterSelect
@onready var online_button: Button = $Center/VBox/OnlineButton
@onready var online_hub: CanvasLayer = $OnlineHub

func _ready() -> void:
	best_label.text = "En iyi skor: %d" % GameManager.best_score
	play_button.pressed.connect(_on_play_pressed)
	shop_button.pressed.connect(_on_shop_pressed)
	character_button.pressed.connect(_on_character_pressed)
	online_button.pressed.connect(_on_online_pressed)
	login_button.pressed.connect(_on_login_pressed)
	BackendBridge.login_result.connect(_on_login_result)
	BackendBridge.progress_result.connect(_on_progress_result)
	BackendBridge.character_select_result.connect(_on_character_changed)
	BackendBridge.character_purchase_result.connect(_on_character_changed)
	_refresh_auth_state()

func _refresh_auth_state() -> void:
	if GameManager.jwt_token != "":
		login_box.visible = false
		play_button.visible = true
		shop_button.visible = true
		character_button.visible = true
		online_button.visible = true
		character_row.visible = true
		status_label.text = ""
		BackendBridge.get_progress()
	else:
		login_box.visible = true
		play_button.visible = false
		shop_button.visible = false
		character_button.visible = false
		online_button.visible = false
		character_row.visible = false
		status_label.text = "Oynamak için Island Empire hesabınla giriş yap."
	_refresh_character_display()

func _refresh_character_display() -> void:
	var char_id: String = GameManager.selected_character if Upgrades.CHARACTERS.has(GameManager.selected_character) else "koylu"
	var char_data: Dictionary = Upgrades.CHARACTERS[char_id]
	character_label.text = "Karakter: %s" % char_data["name"]
	var sprite_path: String = char_data.get("sprite_path", "")
	if sprite_path != "" and ResourceLoader.exists(sprite_path):
		var sf: SpriteFrames = load(sprite_path)
		if sf and sf.has_animation("idle_south"):
			character_portrait.texture = sf.get_frame_texture("idle_south", 0)

func _on_progress_result(success: bool, data: Dictionary, _message: String) -> void:
	if success:
		GameManager.apply_progress(data)
		_refresh_character_display()

func _on_character_changed(success: bool, data: Dictionary, _message: String) -> void:
	if success:
		GameManager.apply_progress(data)
		_refresh_character_display()

func _on_play_pressed() -> void:
	Audio.play("ui_click")
	get_tree().change_scene_to_file("res://scenes/Game.tscn")

func _on_shop_pressed() -> void:
	Audio.play("ui_click")
	shop_screen.open()

func _on_character_pressed() -> void:
	Audio.play("ui_click")
	character_select.open()

func _on_online_pressed() -> void:
	Audio.play("ui_click")
	online_hub.open()

func _on_login_pressed() -> void:
	Audio.play("ui_click")
	status_label.text = "Giriş yapılıyor..."
	BackendBridge.login(username_field.text, password_field.text)

func _on_login_result(success: bool, message: String) -> void:
	status_label.text = message
	if success:
		_refresh_auth_state()
