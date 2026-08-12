extends StaticBody2D

# Sabit çevre engeli — gövde etrafında çarpışma, gövde tabanı node origin'inde
# (Y-sort'un doğru çalışması için World'ün y_sort_enabled=true olması gerekir).
# Doku çalışma zamanında set_texture() ile atanır (birden fazla ağaç türü için).

@onready var visual: Sprite2D = $Visual

func set_texture(tex: Texture2D) -> void:
	visual.texture = tex
