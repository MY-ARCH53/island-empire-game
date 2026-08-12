const fs = require('fs');
const { PNG } = require('pngjs');

const file = process.argv[2];
const data = fs.readFileSync(file);
const png = PNG.sync.read(data);
const { width, height } = png;

// Her satır için opak piksel var mı (alpha > 10) kontrol et
const rowHasContent = [];
for (let y = 0; y < height; y++) {
  let has = false;
  for (let x = 0; x < width; x++) {
    const idx = (width * y + x) << 2;
    if (png.data[idx + 3] > 10) { has = true; break; }
  }
  rowHasContent.push(has);
}

// Satırları grupla: içerikli bloklar ve boşluklar
let blocks = [];
let start = null;
for (let y = 0; y < height; y++) {
  if (rowHasContent[y] && start === null) start = y;
  if (!rowHasContent[y] && start !== null) {
    blocks.push([start, y - 1]);
    start = null;
  }
}
if (start !== null) blocks.push([start, height - 1]);

console.log(`${file}: ${width}x${height}`);
console.log('Yatay bloklar (y_start, y_end):', blocks);

// İlk blok için sütun analizi de yapalım
if (blocks.length) {
  const [ys, ye] = blocks[0];
  const colHasContent = [];
  for (let x = 0; x < width; x++) {
    let has = false;
    for (let y = ys; y <= ye; y++) {
      const idx = (width * y + x) << 2;
      if (png.data[idx + 3] > 10) { has = true; break; }
    }
    colHasContent.push(has);
  }
  let cblocks = [];
  let cstart = null;
  for (let x = 0; x < width; x++) {
    if (colHasContent[x] && cstart === null) cstart = x;
    if (!colHasContent[x] && cstart !== null) {
      cblocks.push([cstart, x - 1]);
      cstart = null;
    }
  }
  if (cstart !== null) cblocks.push([cstart, width - 1]);
  console.log('İlk blok icin dikey (x) bloklar:', cblocks);
}
