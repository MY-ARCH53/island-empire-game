// Dış ses kaynağı kullanmadan, prosedürel olarak basit 16-bit PCM WAV efektleri üretir.
// Gerçek ses tasarımı yerine geçmez ama "sessiz oyun" hissini ortadan kaldıran,
// oyun hissini destekleyen yer tutucu efektlerdir. Kullanıcı isterse
// godot-game/audio/ altındaki dosyaları kendi ses dosyalarıyla değiştirebilir.
//
// Kullanım: node tools/generate_audio.js

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'audio');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SAMPLE_RATE = 22050;

function writeWav(filename, samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * 2;
  const blockAlign = 2;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }

  fs.writeFileSync(path.join(OUT_DIR, filename), buffer);
  console.log(`yazıldı: ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

function silence(seconds) {
  return new Array(Math.floor(seconds * SAMPLE_RATE)).fill(0);
}

// ADSR benzeri basit zarf: hızlı atak, üstel sönüm
function envelope(i, n, attack = 0.05) {
  const t = i / n;
  const a = Math.min(1, t / attack);
  const decay = Math.pow(1 - t, 1.6);
  return a * decay;
}

function tone(freqStart, freqEnd, duration, opts = {}) {
  const { volume = 0.5, wave = 'sine', attack = 0.03, noiseMix = 0.0 } = opts;
  const n = Math.floor(duration * SAMPLE_RATE);
  const out = new Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const freq = freqStart + (freqEnd - freqStart) * t;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    let s;
    if (wave === 'square') {
      s = Math.sign(Math.sin(phase));
    } else if (wave === 'triangle') {
      s = (2 / Math.PI) * Math.asin(Math.sin(phase));
    } else {
      s = Math.sin(phase);
    }
    const noise = (Math.random() * 2 - 1) * noiseMix;
    out[i] = (s * (1 - noiseMix) + noise) * envelope(i, n, attack) * volume;
  }
  return out;
}

function chord(freqs, duration, opts = {}) {
  const n = Math.floor(duration * SAMPLE_RATE);
  const out = new Array(n).fill(0);
  for (const f of freqs) {
    const layer = tone(f, f, duration, opts);
    for (let i = 0; i < n; i++) out[i] += layer[i] / freqs.length;
  }
  return out;
}

function arpeggio(freqs, noteDuration, opts = {}) {
  let out = [];
  for (const f of freqs) {
    out = out.concat(tone(f, f, noteDuration, opts));
  }
  return out;
}

function concat(...parts) {
  return [].concat(...parts);
}

// --- Efektler ---

// Vuruş: kısa, çıtırtılı tık (silah/temas hasarı)
writeWav('sfx_hit.wav', tone(280, 120, 0.07, { volume: 0.5, wave: 'square', attack: 0.02, noiseMix: 0.5 }));

// Düşman ölümü: alçalan kısa ıslık
writeWav('sfx_enemy_death.wav', tone(500, 140, 0.16, { volume: 0.45, wave: 'triangle', attack: 0.02, noiseMix: 0.15 }));

// XP toplama: yükselen ince blip
writeWav('sfx_pickup.wav', tone(650, 1000, 0.07, { volume: 0.35, wave: 'sine', attack: 0.01 }));

// Seviye atlama: yükselen üç nota arpej
writeWav('sfx_levelup.wav', arpeggio([523.25, 659.25, 783.99], 0.11, { volume: 0.4, wave: 'triangle', attack: 0.02 }));

// Oyuncu hasar alma: alçak gürültülü darbe
writeWav('sfx_player_hurt.wav', tone(180, 90, 0.12, { volume: 0.5, wave: 'square', attack: 0.01, noiseMix: 0.4 }));

// Oyun sonu: yavaş alçalan üzgün ton
writeWav('sfx_game_over.wav', tone(320, 70, 0.55, { volume: 0.45, wave: 'triangle', attack: 0.05 }));

// Boss yer sarsıntısı: çok alçak gümbürtü
writeWav('sfx_boss_slam.wav', tone(90, 40, 0.25, { volume: 0.6, wave: 'sine', attack: 0.01, noiseMix: 0.35 }));

// Giriş menüsü onay tıkı (buton vb.)
writeWav('sfx_ui_click.wav', tone(700, 500, 0.05, { volume: 0.3, wave: 'square', attack: 0.01 }));

console.log('Tüm ses efektleri üretildi.');
