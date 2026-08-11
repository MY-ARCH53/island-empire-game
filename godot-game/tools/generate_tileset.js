// PixelLab topdown Wang tileset (metadata JSON + PNG atlas) -> Godot 4 TileSet .tres.
// Godot CLI olmadığı için resmi pixellab_tileset_converter.gd'nin mantığını burada
// Node.js ile uyguluyoruz: yeni bir atlas paketlemeye gerek yok, indirilen PNG zaten
// bir Wang grid (4x4, her tile 32x32) — sadece her tile'ın bounding_box'undan
// atlas hücre koordinatını (col:row) çıkarıp terrain peering bit'lerini yazıyoruz.
//
// Kullanım: node tools/generate_tileset.js <metadata.json> <image_res_path> <out.tres>
// Argümansız çağrılırsa graveyard tileset'i (varsayılan) üretir.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname + '/..';
const [, , metaArg, imgArg, outArg, lowerColorArg, upperColorArg] = process.argv;
const METADATA = metaArg
  ? path.resolve(metaArg)
  : path.join(ROOT, 'assets/tileset/graveyard_tileset_metadata.json');
const IMAGE_RES_PATH = imgArg || 'res://assets/tileset/graveyard_tileset_image.png';
const OUT = outArg
  ? path.resolve(outArg)
  : path.join(ROOT, 'assets/tileset/graveyard_terrain.tres');

const data = JSON.parse(fs.readFileSync(METADATA, 'utf8'));
const tileSize = data.tileset_data.tile_size; // {width, height}
const tiles = data.tileset_data.tiles;
const prompts = data.metadata.terrain_prompts;

const terrainName = { 0: prompts.lower, 1: prompts.upper };

const tileDefs = [];
for (const tile of tiles) {
  const col = tile.bounding_box.x / tileSize.width;
  const row = tile.bounding_box.y / tileSize.height;
  const c = tile.corners;
  const val = (corner) => (corner === 'upper' ? 1 : 0);

  tileDefs.push(`${col}:${row}/0 = 0`);
  tileDefs.push(`${col}:${row}/0/terrain_set = 0`);
  tileDefs.push(`${col}:${row}/0/terrains_peering_bit/top_left_corner = ${val(c.NW)}`);
  tileDefs.push(`${col}:${row}/0/terrains_peering_bit/top_right_corner = ${val(c.NE)}`);
  tileDefs.push(`${col}:${row}/0/terrains_peering_bit/bottom_left_corner = ${val(c.SW)}`);
  tileDefs.push(`${col}:${row}/0/terrains_peering_bit/bottom_right_corner = ${val(c.SE)}`);
}

const tres = `[gd_resource type="TileSet" load_steps=3 format=3]

[ext_resource type="Texture2D" path="${IMAGE_RES_PATH}" id="1"]

[sub_resource type="TileSetAtlasSource" id="TileSetAtlasSource_1"]
texture = ExtResource("1")
texture_region_size = Vector2i(${tileSize.width}, ${tileSize.height})
${tileDefs.join('\n')}

[resource]
tile_size = Vector2i(${tileSize.width}, ${tileSize.height})
terrain_set_0/mode = 1
terrain_set_0/terrain_0/name = "${terrainName[0]}"
terrain_set_0/terrain_0/color = Color(${lowerColorArg || '0.32, 0.28, 0.24'}, 1)
terrain_set_0/terrain_1/name = "${terrainName[1]}"
terrain_set_0/terrain_1/color = Color(${upperColorArg || '0.35, 0.42, 0.22'}, 1)
sources/0 = SubResource("TileSetAtlasSource_1")
`;

fs.writeFileSync(OUT, tres);
console.log(`Yazıldı: ${OUT} (${tiles.length} tile)`);

// Godot'un set_cells_terrain_connect() otomatik döşemesi elle yazılmış bu
// kaynakla sessizce hiç tile yerleştirmiyor (doğrulandı: manuel set_cell()
// çalışıyor, connect() 0 hücre boyuyor) — bu yüzden köşe eşleştirmesini
// kendimiz yapıp doğrudan set_cell() ile yerleştiriyoruz. Bu lookup, her
// (NW,NE,SW,SE) köşe kombinasyonunu doğru atlas koordinatına eşler.
const lookupEntries = tiles.map((tile) => {
  const c = tile.corners;
  const val = (corner) => (corner === 'upper' ? 1 : 0);
  const key = `${val(c.NW)},${val(c.NE)},${val(c.SW)},${val(c.SE)}`;
  const col = tile.bounding_box.x / tileSize.width;
  const row = tile.bounding_box.y / tileSize.height;
  return `\t"${key}": Vector2i(${col}, ${row}),`;
});

const lookupOut = OUT.replace(/\.tres$/, '_lookup.gd');
const lookupGd = `extends Node
# Otomatik üretildi — tools/generate_tileset.js. Elle düzenleme!
# Anahtar: "NW,NE,SW,SE" (0=alt terrain, 1=üst terrain) -> atlas koordinatı (col,row)
const LOOKUP := {
${lookupEntries.join('\n')}
}
`;
fs.writeFileSync(lookupOut, lookupGd);
console.log(`Yazıldı: ${lookupOut} (${lookupEntries.length} kombinasyon)`);
