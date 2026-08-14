// Faz G3-G8 — bir yetenek VFX'inin (assets/vfx_src/<isim>/frame_*.png)
// tek "cast" animasyonlu bir SpriteFrames .tres'ine (assets/vfx/<isim>.tres)
// dönüştürür. generate_spriteframes.js'deki writeSpriteFrames() ile aynı
// desen, sadece tek animasyon + tek kaynak klasör için sadeleştirildi.
//
// Kullanım: node tools/generate_vfx_spriteframes.js <isim> [speed]
// (assets/vfx_src/<isim>/frame_000.png ... bekleniyor)

const fs = require('fs');
const path = require('path');

const ROOT = __dirname + '/..';
const SRC_ROOT = path.join(ROOT, 'assets/vfx_src');
const DST_ROOT = path.join(ROOT, 'assets/vfx');

function generate(name, speed) {
  const srcDir = path.join(SRC_ROOT, name);
  if (!fs.existsSync(srcDir)) {
    console.log(`[atla] ${name}: assets/vfx_src/${name} yok`);
    return;
  }
  const frames = fs.readdirSync(srcDir).filter(f => f.endsWith('.png')).sort();
  if (!frames.length) {
    console.log(`[atla] ${name}: hiç frame yok`);
    return;
  }

  fs.mkdirSync(path.join(DST_ROOT, name), { recursive: true });
  let id = 1;
  const extResources = [];
  frames.forEach(f => {
    const dstFile = f;
    fs.copyFileSync(path.join(srcDir, f), path.join(DST_ROOT, name, dstFile));
    extResources.push(
      `[ext_resource type="Texture2D" path="res://assets/vfx/${name}/${dstFile}" id="${id++}"]`
    );
  });

  const frameLines = frames
    .map((_, i) => `{\n"duration": 1.0,\n"texture": ExtResource("${i + 1}")\n}`)
    .join(', ');
  const animBlock = `{\n"frames": [${frameLines}],\n"loop": false,\n"name": &"cast",\n"speed": ${speed}.0\n}`;

  const tres = `[gd_resource type="SpriteFrames" load_steps=${extResources.length + 1} format=3]

${extResources.join('\n')}

[resource]
animations = [${animBlock}]
`;

  fs.writeFileSync(path.join(DST_ROOT, `${name}.tres`), tres);
  console.log(`[ok] ${name}: ${frames.length} frame -> vfx/${name}.tres`);
}

const [, , nameArg, speedArg] = process.argv;
if (!nameArg) {
  console.log('Kullanım: node tools/generate_vfx_spriteframes.js <isim> [speed]');
  process.exit(1);
}
generate(nameArg, speedArg ? parseInt(speedArg, 10) : 12);
