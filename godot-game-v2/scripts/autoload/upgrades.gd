extends Node

# Karakterler — her biri bir başlangıç silahı + kademeli (seviyeye bağlı büyüyen)
# bir imza pasif bonusuyla gelir (Vampire Survivors'taki Antonio/Imelda/Pasqualina
# deseni: sabit tek seferlik bonus değil, seviye eşiklerinde kümülatif büyüyen
# bonus). passive_tiers: [[seviye_eşiği, o ana kadar kümülatif bonus], ...] —
# player.gd _check_character_passive() her seviye atlayışta bir sonraki eşiğe
# ulaşılıp ulaşılmadığını kontrol edip farkı (delta) ilgili çarpana ekler.
# NOT: Bu pasif bonus, aynı istatistiğin silah evrimi sayacına (stat_levels)
# KATKI YAPMAZ — evrim için oyuncu yine level-up menüsünden bilinçli olarak
# 5 kez seçim yapmalı. Karakter sadece o build'i güçlendirir/teşvik eder.
const CHARACTERS := {
	"koylu": {
		"name": "Köylü",
		"desc": "Dengeli bir başlangıç karakteri. +30 azami can, +%5 hareket hızı.",
		"starting_weapon": "magic_bolt",
		"flat_bonuses": {"max_health": 30.0, "move_speed": 0.05},
		"passive_stat": "",
		"passive_tiers": [],
		"unlock_cost": 0,
	},
	"buyucu": {
		"name": "Büyücü",
		"desc": "Büyü Cismi ile başlar. Seviye arttıkça hasarı katlanarak büyür (Lv25'te +%40 tavan).",
		"starting_weapon": "magic_bolt",
		"flat_bonuses": {},
		"passive_stat": "damage",
		"passive_tiers": [[5, 0.08], [10, 0.16], [15, 0.24], [20, 0.32], [25, 0.40]],
		"unlock_cost": 80,
	},
	"kilic_ustasi": {
		"name": "Kılıç Ustası",
		"desc": "Dönen Kılıçlar ile başlar. Seviye arttıkça etki alanı büyür (Lv25'te +%40 tavan).",
		"starting_weapon": "orbit_blade",
		"flat_bonuses": {},
		"passive_stat": "area",
		"passive_tiers": [[5, 0.08], [10, 0.16], [15, 0.24], [20, 0.32], [25, 0.40]],
		"unlock_cost": 80,
	},
	"firtina_rahibesi": {
		"name": "Fırtına Rahibesi",
		"desc": "Nova Patlaması ile başlar. Seviye arttıkça saldırı hızı artar (Lv25'te +%30 tavan).",
		"starting_weapon": "nova_pulse",
		"flat_bonuses": {},
		"passive_stat": "attack_speed",
		"passive_tiers": [[5, 0.06], [10, 0.12], [15, 0.18], [20, 0.24], [25, 0.30]],
		"unlock_cost": 100,
	},
	"vebali": {
		"name": "Vebalı",
		"desc": "Zehir Bulutu ile başlar. Seviye arttıkça kazandığı tecrübe artar (Lv15'te +%30 tavan).",
		"starting_weapon": "poison_cloud",
		"flat_bonuses": {},
		"passive_stat": "xp_gain",
		"passive_tiers": [[5, 0.10], [10, 0.20], [15, 0.30]],
		"unlock_cost": 100,
	},
	"firtina_avcisi": {
		"name": "Fırtına Avcısı",
		"desc": "Zincir Şimşek ile başlar. Baştan itibaren toplama menzili geniş, seviyeyle daha da artar (Lv15'te +%40 tavan).",
		"starting_weapon": "chain_lightning",
		"flat_bonuses": {},
		"passive_stat": "pickup_radius",
		"passive_tiers": [[1, 0.10], [5, 0.20], [10, 0.30], [15, 0.40]],
		"unlock_cost": 120,
	},
}

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
