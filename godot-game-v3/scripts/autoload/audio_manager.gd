extends Node

# Basit polifonik SFX oynatıcı havuzu. Sesler tools/generate_audio.js ile
# prosedürel üretildi — kullanıcı isterse aynı isimlerle gerçek ses dosyalarıyla
# değiştirebilir (res://audio/*.wav).

const SOUNDS := {
	"hit": preload("res://audio/sfx_hit.wav"),
	"enemy_death": preload("res://audio/sfx_enemy_death.wav"),
	"pickup": preload("res://audio/sfx_pickup.wav"),
	"levelup": preload("res://audio/sfx_levelup.wav"),
	"player_hurt": preload("res://audio/sfx_player_hurt.wav"),
	"game_over": preload("res://audio/sfx_game_over.wav"),
	"boss_slam": preload("res://audio/sfx_boss_slam.wav"),
	"ui_click": preload("res://audio/sfx_ui_click.wav"),
}

const POOL_SIZE := 10

var _players: Array[AudioStreamPlayer] = []
var _next: int = 0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in range(POOL_SIZE):
		var p := AudioStreamPlayer.new()
		add_child(p)
		_players.append(p)

func play(sound_name: String, volume_db: float = 0.0, pitch: float = 1.0) -> void:
	if not SOUNDS.has(sound_name):
		return
	var p: AudioStreamPlayer = _players[_next]
	_next = (_next + 1) % POOL_SIZE
	p.stream = SOUNDS[sound_name]
	p.volume_db = volume_db
	p.pitch_scale = pitch
	p.play()
