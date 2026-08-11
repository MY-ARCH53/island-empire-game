extends Node

# Oturumlar arası kalıcı durum: JWT token, en iyi skor, dokunmatik joystick vektörü.

var jwt_token: String = ""
var touch_vector: Vector2 = Vector2.ZERO
var best_score: int = 0
var last_run_result: Dictionary = {}

# Kan Özü meta-ilerlemesi — MainMenu açılışında BackendBridge.get_progress() ile doldurulur,
# player.gd run başlarken buradan kalıcı bonusları okur.
var blood_essence: int = 0
var permanent_upgrades: Dictionary = {}
var shop_items: Array = []

func _ready() -> void:
	_load_local_data()
	_read_token_from_web()

func _load_local_data() -> void:
	var f := FileAccess.open("user://save.dat", FileAccess.READ)
	if f:
		var data = f.get_var()
		if typeof(data) == TYPE_DICTIONARY:
			best_score = data.get("best_score", 0)
			jwt_token = data.get("jwt_token", "")
		f.close()

func save_local_data() -> void:
	var f := FileAccess.open("user://save.dat", FileAccess.WRITE)
	if f:
		f.store_var({"best_score": best_score, "jwt_token": jwt_token})
		f.close()

# Web build'de token, sayfayı gömen React sayfasından URL query param olarak gelir
# (?token=...) — böylece Godot'un ürettiği HTML şablonuna dokunmaya gerek kalmaz.
func _read_token_from_web() -> void:
	if OS.has_feature("web"):
		var token = JavaScriptBridge.eval(
			"new URLSearchParams(window.location.search).get('token') || ''", true
		)
		if typeof(token) == TYPE_STRING and token != "":
			jwt_token = token

func set_token(token: String) -> void:
	jwt_token = token
	# Web'de token her seferinde parent sayfadan taze gelir, diskte tutmaya gerek yok.
	if not OS.has_feature("web"):
		save_local_data()

func register_best_score(score: int) -> void:
	if score > best_score:
		best_score = score
		save_local_data()

# BackendBridge.progress_result / purchase_result sonuçlarını burada saklar.
func apply_progress(data: Dictionary) -> void:
	blood_essence = int(data.get("bloodEssence", blood_essence))
	if data.has("upgrades"):
		permanent_upgrades = data.get("upgrades", {})
	if data.has("shop"):
		shop_items = data.get("shop", [])
