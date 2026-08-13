// Prosedürel arka plan müziği üreticisi (Kan Adası: Online — farm + PvP
// haritaları için). Mevcut sfx_*.wav dosyalarıyla aynı format: 22050Hz,
// mono, 16-bit PCM WAV. Harici npm bağımlılığı yok, ham PCM örnekleri
// elle yazılıyor (audio/sfx_*.wav'ı üreten orijinal script bu repoda
// artık yok, aynı ruhla yeniden yazıldı).
//
// Loop, matematiksel olarak KUSURSUZ döngü için tasarlandı: her sinüs
// osilatörünün frekansı `snapFreq()` ile döngü süresinin tam katı bir
// periyoda sahip olacak şekilde yuvarlanıyor (f*T tam sayı olunca
// sin(2π f (t+T)) === sin(2π f t) — döngü noktasında faz/genlik hiç
// atlamıyor, crossfade gerekmiyor).

const fs = require('fs');
const path = require('path');

const SR = 22050;

function snapFreq(freq, loopDur) {
  return Math.max(1, Math.round(freq * loopDur)) / loopDur;
}

function trapezoid(tLocal, segLen, fade) {
  if (tLocal < 0 || tLocal > segLen) return 0.0;
  if (tLocal < fade) return tLocal / fade;
  if (tLocal > segLen - fade) return (segLen - tLocal) / fade;
  return 1.0;
}

function writeWav(filename, samplesFloat) {
  const n = samplesFloat.length;
  const dataSize = n * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, samplesFloat[i]));
    // birkaç ms declick fade (döngü matematiksel olarak sürekli olsa da
    // float yuvarlama artığına karşı ucuz bir güvence)
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filename, buf);
}

function normalize(samples, targetPeak) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  if (peak < 1e-6) return samples;
  const g = targetPeak / peak;
  return samples.map((s) => s * g);
}

// --- Farm: sakin, mistik, "keşif" hissi. La minör (Am-Dm-Em-Am). ---
function generateFarmMusic() {
  const T = 24.0;
  const n = Math.floor(T * SR);
  const out = new Float32Array(n);

  const chords = [
    [110.0, 130.81, 164.81], // Am: A2 C3 E3
    [146.83, 174.61, 220.0], // Dm: D3 F3 A3
    [164.81, 196.0, 246.94], // Em: E3 G3 B3
    [110.0, 130.81, 164.81], // Am
  ];
  const segLen = T / chords.length; // 6s
  const fade = 1.5;

  const chordFreqs = chords.map((c) => c.map((f) => snapFreq(f, T)));
  const subBassFreq = snapFreq(55.0, T); // A1, sürekli alçak uğultu
  const sparkleFreq = snapFreq(659.25, T); // E5
  const lfoFreq = snapFreq(0.1, T);
  const sparkleTimes = [3.0, 11.0, 19.0];

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0.0;

    // sürekli sub-bass uğultu
    s += 0.12 * Math.sin(2 * Math.PI * subBassFreq * t);

    // akor katmanı (trapezoid zarf, blok sınırlarında sessizliğe dokunur)
    const segIndex = Math.min(chords.length - 1, Math.floor(t / segLen));
    const tLocal = t - segIndex * segLen;
    const amp = trapezoid(tLocal, segLen, fade);
    if (amp > 0) {
      const freqs = chordFreqs[segIndex];
      const lfo = 1.0 + 0.15 * Math.sin(2 * Math.PI * lfoFreq * t);
      for (const f of freqs) {
        // hafif detune ile ikinci osilatör = doğal "chorus" ısınması
        s += amp * lfo * 0.09 * Math.sin(2 * Math.PI * f * t);
        s += amp * lfo * 0.06 * Math.sin(2 * Math.PI * f * 1.003 * t);
      }
    }

    // mistik parıltı: sabit zamanlarda kısa, sönümlü tiz "ping"
    for (const st of sparkleTimes) {
      const dt = t - st;
      if (dt >= 0 && dt < 1.2) {
        const env = Math.exp(-dt * 4.5);
        s += 0.16 * env * Math.sin(2 * Math.PI * sparkleFreq * dt);
      }
    }

    out[i] = s;
  }

  return normalize(out, 0.55);
}

// --- PvP: gergin, ritmik. Mi minör (Em-C-D-Em) + alçak savaş vuruşu. ---
function generatePvpMusic() {
  const T = 16.0;
  const n = Math.floor(T * SR);
  const out = new Float32Array(n);

  const chords = [
    [164.81, 196.0, 246.94], // Em: E3 G3 B3
    [130.81, 164.81, 196.0], // C:  C3 E3 G3
    [146.83, 185.0, 220.0],  // D:  D3 F#3 A3
    [164.81, 196.0, 246.94], // Em
  ];
  const segLen = T / chords.length; // 4s
  const fade = 0.9;

  const chordFreqs = chords.map((c) => c.map((f) => snapFreq(f, T)));
  const subBassFreq = snapFreq(41.2, T); // E1, gergin alçak uğultu
  const lfoFreq = snapFreq(0.3125, T);
  const drumInterval = 2.0; // 16s'e tam bölünür → 8 vuruş
  const drumFreq = snapFreq(70.0, T);

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0.0;

    s += 0.11 * Math.sin(2 * Math.PI * subBassFreq * t);

    const segIndex = Math.min(chords.length - 1, Math.floor(t / segLen));
    const tLocal = t - segIndex * segLen;
    const amp = trapezoid(tLocal, segLen, fade);
    if (amp > 0) {
      const freqs = chordFreqs[segIndex];
      const lfo = 1.0 + 0.2 * Math.sin(2 * Math.PI * lfoFreq * t);
      for (const f of freqs) {
        s += amp * lfo * 0.08 * Math.sin(2 * Math.PI * f * t);
        s += amp * lfo * 0.05 * Math.sin(2 * Math.PI * f * 1.004 * t);
      }
    }

    // uzak savaş davulu: her 2sn'de alçak, hızlı sönümlü çift vuruş
    const tMod = t % drumInterval;
    for (const onset of [0.0, 0.14]) {
      const dt = tMod - onset;
      if (dt >= 0 && dt < 0.35) {
        const env = Math.exp(-dt * 22.0);
        s += 0.28 * env * Math.sin(2 * Math.PI * drumFreq * dt);
      }
    }

    out[i] = s;
  }

  return normalize(out, 0.6);
}

const outDir = path.join(__dirname, '..', 'audio');
writeWav(path.join(outDir, 'music_farm.wav'), generateFarmMusic());
writeWav(path.join(outDir, 'music_pvp.wav'), generatePvpMusic());
console.log('OK: music_farm.wav + music_pvp.wav written to', outDir);
