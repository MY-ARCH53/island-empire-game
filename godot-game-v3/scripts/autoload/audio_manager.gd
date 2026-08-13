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

# Kan Adası: Online (farm/PvP) arka plan müziği — tools/generate_music.js
# ile prosedürel üretildi (matematiksel olarak kusursuz döngü, crossfade
# gerekmiyor). Tek oyunculu oyunda şu an hiç müzik yok, kapsam sadece
# online mod.
const MUSIC := {
	"farm": preload("res://audio/music_farm.wav"),
	"pvp": preload("res://audio/music_pvp.wav"),
}
const MUSIC_VOLUME_DB := -16.0

const POOL_SIZE := 10

var _players: Array[AudioStreamPlayer] = []
var _next: int = 0
var _music_player: AudioStreamPlayer
var _current_music: String = ""

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in range(POOL_SIZE):
		var p := AudioStreamPlayer.new()
		add_child(p)
		_players.append(p)
	for key in MUSIC.keys():
		var stream: AudioStreamWAV = MUSIC[key]
		stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		stream.loop_begin = 0
		stream.loop_end = int(stream.data.size() / 2.0)
	_music_player = AudioStreamPlayer.new()
	_music_player.process_mode = Node.PROCESS_MODE_ALWAYS
	_music_player.volume_db = MUSIC_VOLUME_DB
	add_child(_music_player)

func play(sound_name: String, volume_db: float = 0.0, pitch: float = 1.0) -> void:
	if not SOUNDS.has(sound_name):
		return
	var p: AudioStreamPlayer = _players[_next]
	_next = (_next + 1) % POOL_SIZE
	p.stream = SOUNDS[sound_name]
	p.volume_db = volume_db
	p.pitch_scale = pitch
	p.play()

# Döngülü arka plan müziği — aynı parça zaten çalıyorsa hiçbir şey yapmaz
# (haritaya her girişte yeniden tetiklenip baştan sarmasın diye).
func play_music(music_name: String) -> void:
	if not MUSIC.has(music_name):
		return
	if _current_music == music_name and _music_player.playing:
		return
	_current_music = music_name
	_music_player.stream = MUSIC[music_name]
	_music_player.volume_db = MUSIC_VOLUME_DB
	_music_player.play()

func stop_music(fade_sec: float = 1.0) -> void:
	if not _music_player.playing:
		_current_music = ""
		return
	_current_music = ""
	var tween := create_tween()
	tween.tween_property(_music_player, "volume_db", -40.0, fade_sec)
	tween.tween_callback(func() -> void:
		_music_player.stop()
		_music_player.volume_db = MUSIC_VOLUME_DB
	)
