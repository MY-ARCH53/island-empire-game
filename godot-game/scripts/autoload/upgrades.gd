extends Node

# Silah tanımları — id: {name, desc, base_cooldown, base_damage, max_level, ...}
const WEAPONS := {
	"magic_bolt": {
		"name": "Büyü Cismi",
		"desc": "En yakın düşmana otomatik mermi fırlatır.",
		"base_cooldown": 0.9,
		"base_damage": 12.0,
		"projectile_speed": 420.0,
		"max_level": 8,
	},
	"orbit_blade": {
		"name": "Dönen Kılıçlar",
		"desc": "Etrafında dönen kılıçlar her temasta hasar verir.",
		"base_cooldown": 0.0,
		"base_damage": 8.0,
		"max_level": 8,
	},
	"nova_pulse": {
		"name": "Nova Patlaması",
		"desc": "Periyodik olarak çevresindeki tüm düşmanlara hasar verir.",
		"base_cooldown": 2.4,
		"base_damage": 18.0,
		"max_level": 8,
	},
	"poison_cloud": {
		"name": "Zehir Bulutu",
		"desc": "Bulunduğun yere zamanla hasar veren zehirli bir alan bırakır.",
		"base_cooldown": 3.2,
		"base_damage": 4.0,
		"radius": 70.0,
		"duration": 3.5,
		"tick_interval": 0.5,
		"max_level": 8,
	},
	"chain_lightning": {
		"name": "Zincir Şimşek",
		"desc": "En yakın düşmandan başlayıp yakındaki düşmanlara sıçrayan bir şimşek fırlatır.",
		"base_cooldown": 1.6,
		"base_damage": 10.0,
		"chain_count": 3,
		"chain_range": 180.0,
		"max_level": 8,
	},
}

# Silah evrimi: silah azami seviyeye ulaşıp, eşleşen istatistik
# EVOLUTION_STAT_LEVEL_REQUIRED kez seçildiğinde otomatik gerçekleşir
# (level_up_menu'de ayrı bir seçenek değil — player.gd _check_evolutions()).
const EVOLUTION_STAT_LEVEL_REQUIRED := 5

const EVOLUTIONS := {
	"magic_bolt": {
		"requires_stat": "damage",
		"name": "Arkan Yağmuru",
		"desc": "Aynı anda üç güçlü büyü cismi fırlatır.",
	},
	"orbit_blade": {
		"requires_stat": "area",
		"name": "Kan Girdabı",
		"desc": "Dev, kanlı bir kılıç girdabı — daha geniş ve daha yıkıcı.",
	},
	"nova_pulse": {
		"requires_stat": "attack_speed",
		"name": "Kıyamet Dalgası",
		"desc": "Çok daha sık patlayan, geniş alanlı bir yıkım dalgası.",
	},
	"poison_cloud": {
		"requires_stat": "xp_gain",
		"name": "Veba Bulutu",
		"desc": "Çok daha geniş, uzun süren ve güçlü bir veba alanı bırakır.",
	},
	"chain_lightning": {
		"requires_stat": "pickup_radius",
		"name": "Fırtına Zinciri",
		"desc": "Çok daha uzun menzilli, çok daha fazla düşmana sıçrar.",
	},
}

# İstatistik yükseltme bilgisi — id: {name, desc}
const STAT_UPGRADE_INFO := {
	"max_health":    {"name": "Azami Can +20",        "desc": "Maksimum canını artırır ve can doldurur."},
	"move_speed":    {"name": "Hız +10%",              "desc": "Hareket hızını artırır."},
	"damage":        {"name": "Hasar +12%",            "desc": "Tüm silahların hasarını artırır."},
	"attack_speed":  {"name": "Saldırı Hızı +10%",     "desc": "Silahların ateş hızını artırır."},
	"area":          {"name": "Alan +10%",              "desc": "Silah etki alanını büyütür."},
	"xp_gain":       {"name": "Tecrübe +10%",           "desc": "Kazanılan XP miktarını artırır."},
	"pickup_radius": {"name": "Toplama Menzili +20%",  "desc": "XP topu çekim menzilini artırır."},
}

# Düşman tipleri
const ENEMIES := {
	"bat":      {"name": "Yarasa",  "health": 14.0, "speed": 95.0,  "damage": 6.0,  "xp": 3,  "color": Color(0.55, 0.35, 0.75), "radius": 10.0, "sprite": "res://assets/sprites/yarasa.tres"},
	"skeleton": {"name": "İskelet", "health": 30.0, "speed": 65.0,  "damage": 10.0, "xp": 6,  "color": Color(0.8, 0.8, 0.75),   "radius": 13.0, "sprite": "res://assets/sprites/iskelet.tres"},
	"ghost":    {"name": "Hayalet", "health": 22.0, "speed": 110.0, "damage": 8.0,  "xp": 5,  "color": Color(0.6, 0.85, 0.95),  "radius": 12.0, "sprite": "res://assets/sprites/hayalet.tres"},
	"brute":    {"name": "Vahşi",   "health": 90.0, "speed": 50.0,  "damage": 18.0, "xp": 14, "color": Color(0.75, 0.25, 0.2),  "radius": 20.0, "sprite": "res://assets/sprites/vahsi.tres"},
	"kabus":     {"name": "Kabus",     "health": 9.0,   "speed": 145.0, "damage": 5.0,  "xp": 4,  "color": Color(0.25, 0.15, 0.35), "radius": 9.0,  "sprite": "res://assets/sprites/kabus.tres"},
	"gulyabani": {"name": "Gulyabani", "health": 40.0,  "speed": 55.0,  "damage": 12.0, "xp": 9,  "color": Color(0.4, 0.45, 0.3),   "radius": 14.0, "sprite": "res://assets/sprites/gulyabani.tres"},
	"kan_lordu": {"name": "Kan Lordu", "health": 1400.0, "speed": 55.0, "damage": 22.0, "xp": 150, "color": Color(0.5, 0.05, 0.1), "radius": 34.0, "sprite": "res://assets/sprites/kan_lordu.tres", "is_boss": true},
}

func random_weapon_or_upgrade_choices(owned_weapons: Dictionary, count: int = 3) -> Array:
	var pool: Array = []
	for wid in WEAPONS.keys():
		var lvl: int = owned_weapons.get(wid, 0)
		if lvl < WEAPONS[wid]["max_level"]:
			pool.append({"type": "weapon", "id": wid, "level": lvl})
	for sid in STAT_UPGRADE_INFO.keys():
		pool.append({"type": "stat", "id": sid})
	pool.shuffle()
	return pool.slice(0, min(count, pool.size()))

# Boss ödülü: elinden geldiğince silah seçeneği sun (hepsi maxlanmışsa normal havuza düş).
func guaranteed_weapon_choices(owned_weapons: Dictionary, count: int = 3) -> Array:
	var pool: Array = []
	for wid in WEAPONS.keys():
		var lvl: int = owned_weapons.get(wid, 0)
		if lvl < WEAPONS[wid]["max_level"]:
			pool.append({"type": "weapon", "id": wid, "level": lvl})
	if pool.is_empty():
		return random_weapon_or_upgrade_choices(owned_weapons, count)
	pool.shuffle()
	return pool.slice(0, min(count, pool.size()))
