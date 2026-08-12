const fs = require('fs');
const { PNG } = require('pngjs');

// Kullanım: node crop_sheet.js input.png x y w h output.png
const [, , inFile, xArg, yArg, wArg, hArg, outFile] = process.argv;
const x = parseInt(xArg, 10);
const y = parseInt(yArg, 10);
const w = parseInt(wArg, 10);
const h = parseInt(hArg, 10);

const src = PNG.sync.read(fs.readFileSync(inFile));
const dst = new PNG({ width: w, height: h });

for (let dy = 0; dy < h; dy++) {
  for (let dx = 0; dx < w; dx++) {
    const sx = x + dx;
    const sy = y + dy;
    const srcIdx = (src.width * sy + sx) << 2;
    const dstIdx = (w * dy + dx) << 2;
    dst.data[dstIdx] = src.data[srcIdx];
    dst.data[dstIdx + 1] = src.data[srcIdx + 1];
    dst.data[dstIdx + 2] = src.data[srcIdx + 2];
    dst.data[dstIdx + 3] = src.data[srcIdx + 3];
  }
}

fs.writeFileSync(outFile, PNG.sync.write(dst));
console.log(`Yazildi: ${outFile} (${w}x${h}, kaynak: ${inFile} @ ${x},${y})`);
