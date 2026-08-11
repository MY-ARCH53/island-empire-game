extends Node
# Otomatik üretildi — tools/generate_tileset.js. Elle düzenleme!
# Anahtar: "NW,NE,SW,SE" (0=alt terrain, 1=üst terrain) -> atlas koordinatı (col,row)
const LOOKUP := {
	"1,1,0,1": Vector2i(0, 0),
	"1,0,1,0": Vector2i(1, 0),
	"0,1,0,0": Vector2i(2, 0),
	"1,1,0,0": Vector2i(3, 0),
	"0,1,1,0": Vector2i(0, 1),
	"1,0,0,0": Vector2i(1, 1),
	"0,0,0,0": Vector2i(2, 1),
	"0,0,0,1": Vector2i(3, 1),
	"1,0,1,1": Vector2i(0, 2),
	"0,0,1,1": Vector2i(1, 2),
	"0,0,1,0": Vector2i(2, 2),
	"0,1,0,1": Vector2i(3, 2),
	"1,1,1,1": Vector2i(0, 3),
	"1,1,1,0": Vector2i(1, 3),
	"1,0,0,1": Vector2i(2, 3),
	"0,1,1,1": Vector2i(3, 3),
}
