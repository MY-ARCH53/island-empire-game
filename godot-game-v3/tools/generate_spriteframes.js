// PixelLab indirme paketlerini (assets/characters/<isim>/extracted/...) sade bir
// res:// klasör yapısına (assets/sprites/<isim>/...) kopyalar ve her karakter için
// bir Godot SpriteFrames .tres dosyası üretir (idle_south/east/north + walk_south/east/north,
// west yönü Godot tarafında flip_h ile east'ten türetilir — bkz. scripts/directional_sprite.gd).
//
// Kullanım: node tools/generate_spriteframes.js

const fs = require('fs');
const path = require('path');

const ROOT = __dirname + '/..';
const CHAR_SRC = path.join(ROOT, 'assets/characters');
const SPRITE_DST = path.join(ROOT, 'assets/sprites');

// name: klasör adı (assets/characters/<name>), out: çıktı adı (assets/sprites/<out>)
const CHARACTERS = [
  { name: 'protagonist', out: 'protagonist' },
  { name: 'yarasa', out: 'yarasa' },
  { name: 'iskelet', out: 'iskelet' },
  { name: 'hayalet', out: 'hayalet' },
  { name: 'vahsi', out: 'vahsi' },
  { name: 'kan_lordu', out: 'kan_lordu' },
  { name: 'kabus', out: 'kabus' },
  { name: 'gulyabani', out: 'gulyabani' },
  { name: 'yaban_kurdu', out: 'yaban_kurdu' },
  // Oynanabilir karakterler (bkz. scripts/autoload/upgrades.gd → CHARACTERS) —
  // "koylu" ayrı bir sprite değil, protagonist'i yeniden kullanır.
  { name: 'buyucu', out: 'char_buyucu' },
  { name: 'kilic_ustasi', out: 'char_kilic_ustasi' },
  { name: 'firtina_rahibesi', out: 'char_firtina_rahibesi' },
  { name: 'vebali', out: 'char_vebali' },
  { name: 'firtina_avcisi', out: 'char_firtina_avcisi' },
];

const DIRS = ['south', 'east', 'north'];

function findAnimDir(charDir) {
  const animsRoot = path.join(charDir, 'extracted/Idle/animations');
  if (!fs.existsSync(animsRoot)) return null;
  const entries = fs.readdirSync(animsRoot);
  return entries.length ? path.join(animsRoot, entries[0]) : null;
}

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function generateForCharacter({ name, out }) {
  const charDir = path.join(CHAR_SRC, name);
  const rotDir = path.join(charDir, 'extracted/Idle/rotations');
  const dstDir = path.join(SPRITE_DST, out);

  if (!fs.existsSync(rotDir)) {
    console.log(`[atla] ${name}: rotations klasörü yok`);
    return null;
  }

  const idleAnims = [];
  for (const dir of DIRS) {
    const src = path.join(rotDir, `${dir}.png`);
    if (!fs.existsSync(src)) continue;
    const dstFile = `idle_${dir}.png`;
    copyFile(src, path.join(dstDir, dstFile));
    idleAnims.push({ name: `idle_${dir}`, frames: [dstFile], loop: true, speed: 5 });
  }

  const walkAnims = [];
  const animDir = findAnimDir(charDir);
  if (animDir) {
    for (const dir of DIRS) {
      const frameDir = path.join(animDir, dir);
      if (!fs.existsSync(frameDir)) continue;
      const frames = fs.readdirSync(frameDir).filter(f => f.endsWith('.png')).sort();
      const dstFrames = [];
      frames.forEach((f, i) => {
        const dstFile = `walk_${dir}_${String(i).padStart(2, '0')}.png`;
        copyFile(path.join(frameDir, f), path.join(dstDir, dstFile));
        dstFrames.push(dstFile);
      });
      if (dstFrames.length) {
        walkAnims.push({ name: `walk_${dir}`, frames: dstFrames, loop: true, speed: 8 });
      }
    }
  }

  const allAnims = [...idleAnims, ...walkAnims];
  if (!allAnims.length) {
    console.log(`[atla] ${name}: hiç animasyon/rotasyon bulunamadı`);
    return null;
  }

  writeSpriteFrames(out, allAnims);
  console.log(`[ok] ${name}: ${idleAnims.length} idle + ${walkAnims.length} walk animasyonu -> ${out}.tres`);
  return { idleCount: idleAnims.length, walkCount: walkAnims.length };
}

function writeSpriteFrames(out, anims) {
  // Her frame ayrı bir ext_resource; SpriteFrames.animations dizisi frame listelerini referans alır.
  let id = 1;
  const extResources = [];
  const fileToId = new Map();

  function resId(file) {
    if (fileToId.has(file)) return fileToId.get(file);
    const rid = `${id++}`;
    fileToId.set(file, rid);
    extResources.push(
      `[ext_resource type="Texture2D" path="res://assets/sprites/${out}/${file}" id="${rid}"]`
    );
    return rid;
  }

  const animBlocks = anims.map(a => {
    const frameLines = a.frames
      .map(f => `{\n"duration": 1.0,\n"texture": ExtResource("${resId(f)}")\n}`)
      .join(', ');
    return `{\n"frames": [${frameLines}],\n"loop": ${a.loop},\n"name": &"${a.name}",\n"speed": ${a.speed}.0\n}`;
  });

  const tres = `[gd_resource type="SpriteFrames" load_steps=${extResources.length + 1} format=3]

${extResources.join('\n')}

[resource]
animations = [${animBlocks.join(', ')}]
`;

  fs.writeFileSync(path.join(SPRITE_DST, `${out}.tres`), tres);
}

for (const c of CHARACTERS) {
  generateForCharacter(c);
}
