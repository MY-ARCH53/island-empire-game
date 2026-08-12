extends Node

# Island Empire backend'i ile HTTP köprüsü: giriş (mobil/masaüstü build için)
# ve mini oyun ödül gönderimi (submit-run).

signal run_submitted(success: bool, data: Dictionary, message: String)
signal login_result(success: bool, message: String)
signal progress_result(success: bool, data: Dictionary, message: String)
signal purchase_result(success: bool, data: Dictionary, message: String)
signal character_purchase_result(success: bool, data: Dictionary, message: String)
signal character_select_result(success: bool, data: Dictionary, message: String)

# "Kan Adası: Online" (bkz. plans/humble-chasing-galaxy.md) — kalıcı karakter
# + envanter/ekipman. data == null (Dictionary boş değil, gerçekten null)
# demek "henüz online karakter oluşturulmamış" demektir.
signal online_character_result(success: bool, data: Variant, message: String)
signal online_character_created(success: bool, data: Dictionary, message: String)
signal online_inventory_result(success: bool, data: Dictionary, message: String)
signal online_equip_result(success: bool, message: String)
signal online_unequip_result(success: bool, message: String)
# Faz 4 — item güçlendirme (KO tarzı riskli enchant). data.outcome:
# "success" | "failed" | "destroyed".
signal online_upgrade_result(success: bool, data: Dictionary, message: String)

const API_BASE_PROD := "https://api.islandsempire.com/api"
const API_BASE_LOCAL := "http://localhost:3000/api"

func _api_base() -> String:
	if OS.has_feature("web"):
		var origin = JavaScriptBridge.eval("window.location.origin", true)
		if typeof(origin) == TYPE_STRING and (origin.begins_with("http://localhost") or origin.begins_with("http://127.0.0.1")):
			return API_BASE_LOCAL
		return API_BASE_PROD
	# Web export değilse (editörde F5 / masaüstü debug build): yerel backend'e bağlan.
	# Böylece editörden test ederken yanlışlıkla prod hesaplarına altın/XP yazılmaz.
	if OS.has_feature("editor") or OS.is_debug_build():
		return API_BASE_LOCAL
	return API_BASE_PROD

func login(username: String, password: String) -> void:
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_login_completed.bind(http))
	var body := JSON.stringify({"username": username, "password": password})
	var headers := ["Content-Type: application/json"]
	var err := http.request(_api_base() + "/auth/login", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		login_result.emit(false, "Bağlantı hatası")
		http.queue_free()

func _on_login_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		login_result.emit(false, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 200 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		GameManager.set_token(str(data.get("token", "")))
		login_result.emit(true, "Giriş başarılı")
	else:
		var msg := "Giriş başarısız"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		login_result.emit(false, msg)

func submit_run(result: Dictionary) -> void:
	if GameManager.jwt_token == "":
		run_submitted.emit(false, {}, "Oturum yok, ödül kaydedilemedi.")
		return
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_submit_run_completed.bind(http))
	var body := JSON.stringify({
		"kills": result.get("kills", 0),
		"level": result.get("level", 1),
		"survivalSeconds": result.get("survival_seconds", 0),
		"score": result.get("score", 0),
	})
	var headers := [
		"Content-Type: application/json",
		"Authorization: Bearer " + GameManager.jwt_token,
	]
	var err := http.request(_api_base() + "/minigame/submit-run", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		run_submitted.emit(false, {}, "Bağlantı hatası")
		http.queue_free()

func _on_submit_run_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		run_submitted.emit(false, {}, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 200 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		var payload: Dictionary = data.get("data", {})
		var message: String = str(data.get("message", ""))
		run_submitted.emit(true, payload, message)
		_notify_parent_page(payload, message)
	else:
		var msg := "Ödül gönderilemedi"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		run_submitted.emit(false, {}, msg)

func get_progress() -> void:
	if GameManager.jwt_token == "":
		progress_result.emit(false, {}, "Oturum yok.")
		return
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_progress_completed.bind(http))
	var headers := ["Authorization: Bearer " + GameManager.jwt_token]
	var err := http.request(_api_base() + "/minigame/progress", headers, HTTPClient.METHOD_GET)
	if err != OK:
		progress_result.emit(false, {}, "Bağlantı hatası")
		http.queue_free()

func _on_progress_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		progress_result.emit(false, {}, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 200 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		progress_result.emit(true, data.get("data", {}), "")
	else:
		var msg := "Yüklenemedi"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		progress_result.emit(false, {}, msg)

func purchase_upgrade(upgrade_id: String) -> void:
	if GameManager.jwt_token == "":
		purchase_result.emit(false, {}, "Oturum yok.")
		return
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_purchase_completed.bind(http))
	var body := JSON.stringify({"upgradeId": upgrade_id})
	var headers := [
		"Content-Type: application/json",
		"Authorization: Bearer " + GameManager.jwt_token,
	]
	var err := http.request(_api_base() + "/minigame/purchase-upgrade", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		purchase_result.emit(false, {}, "Bağlantı hatası")
		http.queue_free()

func _on_purchase_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		purchase_result.emit(false, {}, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 200 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		purchase_result.emit(true, data.get("data", {}), str(data.get("message", "")))
	else:
		var msg := "Satın alma başarısız"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		purchase_result.emit(false, {}, msg)

func purchase_character(character_id: String) -> void:
	if GameManager.jwt_token == "":
		character_purchase_result.emit(false, {}, "Oturum yok.")
		return
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_purchase_character_completed.bind(http))
	var body := JSON.stringify({"characterId": character_id})
	var headers := [
		"Content-Type: application/json",
		"Authorization: Bearer " + GameManager.jwt_token,
	]
	var err := http.request(_api_base() + "/minigame/purchase-character", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		character_purchase_result.emit(false, {}, "Bağlantı hatası")
		http.queue_free()

func _on_purchase_character_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		character_purchase_result.emit(false, {}, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 200 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		character_purchase_result.emit(true, data.get("data", {}), str(data.get("message", "")))
	else:
		var msg := "Satın alma başarısız"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		character_purchase_result.emit(false, {}, msg)

func select_character(character_id: String) -> void:
	if GameManager.jwt_token == "":
		character_select_result.emit(false, {}, "Oturum yok.")
		return
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_select_character_completed.bind(http))
	var body := JSON.stringify({"characterId": character_id})
	var headers := [
		"Content-Type: application/json",
		"Authorization: Bearer " + GameManager.jwt_token,
	]
	var err := http.request(_api_base() + "/minigame/select-character", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		character_select_result.emit(false, {}, "Bağlantı hatası")
		http.queue_free()

func _on_select_character_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		character_select_result.emit(false, {}, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 200 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		character_select_result.emit(true, data.get("data", {}), str(data.get("message", "")))
	else:
		var msg := "Karakter seçilemedi"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		character_select_result.emit(false, {}, msg)

func get_online_character() -> void:
	if GameManager.jwt_token == "":
		online_character_result.emit(false, null, "Oturum yok.")
		return
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_online_character_completed.bind(http))
	var headers := ["Authorization: Bearer " + GameManager.jwt_token]
	var err := http.request(_api_base() + "/online/character", headers, HTTPClient.METHOD_GET)
	if err != OK:
		online_character_result.emit(false, null, "Bağlantı hatası")
		http.queue_free()

func _on_online_character_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		online_character_result.emit(false, null, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 200 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		online_character_result.emit(true, data.get("data"), "")
	else:
		var msg := "Yüklenemedi"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		online_character_result.emit(false, null, msg)

func create_online_character(class_id: String) -> void:
	if GameManager.jwt_token == "":
		online_character_created.emit(false, {}, "Oturum yok.")
		return
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_create_online_character_completed.bind(http))
	var body := JSON.stringify({"classId": class_id})
	var headers := [
		"Content-Type: application/json",
		"Authorization: Bearer " + GameManager.jwt_token,
	]
	var err := http.request(_api_base() + "/online/character", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		online_character_created.emit(false, {}, "Bağlantı hatası")
		http.queue_free()

func _on_create_online_character_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		online_character_created.emit(false, {}, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 201 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		online_character_created.emit(true, data.get("data", {}), str(data.get("message", "")))
	else:
		var msg := "Karakter oluşturulamadı"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		online_character_created.emit(false, {}, msg)

func get_online_inventory() -> void:
	if GameManager.jwt_token == "":
		online_inventory_result.emit(false, {}, "Oturum yok.")
		return
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_online_inventory_completed.bind(http))
	var headers := ["Authorization: Bearer " + GameManager.jwt_token]
	var err := http.request(_api_base() + "/online/inventory", headers, HTTPClient.METHOD_GET)
	if err != OK:
		online_inventory_result.emit(false, {}, "Bağlantı hatası")
		http.queue_free()

func _on_online_inventory_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		online_inventory_result.emit(false, {}, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 200 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		online_inventory_result.emit(true, data.get("data", {}), "")
	else:
		var msg := "Yüklenemedi"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		online_inventory_result.emit(false, {}, msg)

func equip_online_item(inventory_item_id: int) -> void:
	if GameManager.jwt_token == "":
		online_equip_result.emit(false, "Oturum yok.")
		return
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_equip_completed.bind(http))
	var body := JSON.stringify({"inventoryItemId": inventory_item_id})
	var headers := [
		"Content-Type: application/json",
		"Authorization: Bearer " + GameManager.jwt_token,
	]
	var err := http.request(_api_base() + "/online/equip", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		online_equip_result.emit(false, "Bağlantı hatası")
		http.queue_free()

func _on_equip_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		online_equip_result.emit(false, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 200 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		online_equip_result.emit(true, str(data.get("message", "")))
	else:
		var msg := "Kuşanılamadı"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		online_equip_result.emit(false, msg)

func unequip_online_item(slot: String) -> void:
	if GameManager.jwt_token == "":
		online_unequip_result.emit(false, "Oturum yok.")
		return
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_unequip_completed.bind(http))
	var body := JSON.stringify({"slot": slot})
	var headers := [
		"Content-Type: application/json",
		"Authorization: Bearer " + GameManager.jwt_token,
	]
	var err := http.request(_api_base() + "/online/unequip", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		online_unequip_result.emit(false, "Bağlantı hatası")
		http.queue_free()

func _on_unequip_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		online_unequip_result.emit(false, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 200 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		online_unequip_result.emit(true, str(data.get("message", "")))
	else:
		var msg := "Çıkarılamadı"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		online_unequip_result.emit(false, msg)

func upgrade_online_item(inventory_item_id: int) -> void:
	if GameManager.jwt_token == "":
		online_upgrade_result.emit(false, {}, "Oturum yok.")
		return
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(_on_upgrade_completed.bind(http))
	var body := JSON.stringify({"inventoryItemId": inventory_item_id})
	var headers := [
		"Content-Type: application/json",
		"Authorization: Bearer " + GameManager.jwt_token,
	]
	var err := http.request(_api_base() + "/online/upgrade-item", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		online_upgrade_result.emit(false, {}, "Bağlantı hatası")
		http.queue_free()

func _on_upgrade_completed(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray, http: HTTPRequest) -> void:
	http.queue_free()
	var json := JSON.new()
	if json.parse(body.get_string_from_utf8()) != OK:
		online_upgrade_result.emit(false, {}, "Sunucu yanıtı okunamadı")
		return
	var data = json.get_data()
	if code == 200 and typeof(data) == TYPE_DICTIONARY and data.get("success", false):
		online_upgrade_result.emit(true, data.get("data", {}), "")
	else:
		var msg := "Güçlendirilemedi"
		if typeof(data) == TYPE_DICTIONARY:
			msg = str(data.get("message", msg))
		online_upgrade_result.emit(false, {}, msg)

# Web build'de, React sayfasına postMessage ile sonucu bildir (toast göstermesi için).
func _notify_parent_page(payload: Dictionary, message: String) -> void:
	if not OS.has_feature("web"):
		return
	var gold: int = int(payload.get("goldEarned", 0))
	var js := "window.parent.postMessage({type:'minigame_result', goldEarned:%d, message:%s}, '*')" % [
		gold, JSON.stringify(message)
	]
	JavaScriptBridge.eval(js, true)
