// Musiqa yuklashda: MP3/M4A bo'lmagan audio (YouTube/Instagram yuklagichlaridan WebM, OGG/Opus, WAV, FLAC...)
// brauzerning o'zida MP3 ga o'giriladi — egasiga qo'lda "convert to mp3" qilish shart emas.
// Kodlovchi (lamejs, ~150 KB) faqat kerak bo'lganda yuklanadi.

const MAX_OUT = 14.5 * 1024 * 1024; // server chegarasi 15 MB

// server/panel.js dagi sniff/sniffAudio bilan bir xil mantiq: serverga to'g'ridan-to'g'ri yuborsa bo'ladigan fayl
function mp3Header(b, i) {
  if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return false;
  const version = (b[i + 1] >> 3) & 3;
  const layer = (b[i + 1] >> 1) & 3;
  const bitrate = b[i + 2] >> 4;
  const rate = (b[i + 2] >> 2) & 3;
  return version !== 1 && layer === 1 && bitrate !== 0 && bitrate !== 15 && rate !== 3;
}
export function isServerAudio(bytes) {
  const b = bytes;
  const ascii = (from, to) => String.fromCharCode(...b.subarray(from, to));
  if (ascii(0, 3) === 'ID3') return true;
  if (ascii(4, 8) === 'ftyp') return true;
  let i = 0;
  while (i < Math.min(b.length, 65536) && b[i] === 0) i++;
  return i < b.length - 4 && mp3Header(b, i);
}

const yieldUi = () => new Promise((r) => setTimeout(r, 0));

/**
 * File → { bytes: Uint8Array, converted: boolean }. MP3/M4A — o'zgarishsiz; boshqasi — MP3 (128–160 kbps).
 * onProgress(0..1) — o'girish jarayoni.
 */
export async function prepareAudio(file, onProgress = () => {}) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (isServerAudio(bytes)) return { bytes, converted: false };

  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('Bu brauzer audio faylni o‘gira olmaydi — Chrome’da oching yoki MP3 yuklang.');
  const ctx = new Ctx();
  let audio;
  try {
    audio = await new Promise((resolve, reject) => {
      const p = ctx.decodeAudioData(buf.slice(0), resolve, reject);
      p?.then?.(resolve, reject);
    });
  } catch {
    throw new Error('Bu audio faylni o‘qib bo‘lmadi (buzilgan yoki noma’lum format). MP3 ga o‘girib yuklang.');
  } finally {
    ctx.close?.();
  }

  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const channels = Math.min(2, audio.numberOfChannels);
  const rate = audio.sampleRate;
  // 15 MB ga sig'ishi uchun: uzun qo'shiqda bitreyt kamaytiriladi
  const fit = Math.floor((MAX_OUT * 8) / audio.duration / 1000);
  const kbps = [160, 128, 112, 96, 80, 64].find((k) => k <= fit) || 64;
  const enc = new Mp3Encoder(channels, rate, kbps);
  const toInt16 = (f32) => {
    const out = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  };
  const left = toInt16(audio.getChannelData(0));
  const right = channels > 1 ? toInt16(audio.getChannelData(1)) : null;
  const parts = [];
  const block = 1152 * 20;
  for (let i = 0; i < left.length; i += block) {
    const l = left.subarray(i, i + block);
    const out = right ? enc.encodeBuffer(l, right.subarray(i, i + block)) : enc.encodeBuffer(l);
    if (out.length) parts.push(new Uint8Array(out));
    if ((i / block) % 25 === 0) {
      onProgress(i / left.length);
      await yieldUi();
    }
  }
  const end = enc.flush();
  if (end.length) parts.push(new Uint8Array(end));
  onProgress(1);
  const size = parts.reduce((s, p) => s + p.length, 0);
  const mp3 = new Uint8Array(size);
  let o = 0;
  for (const p of parts) {
    mp3.set(p, o);
    o += p.length;
  }
  if (mp3.length > MAX_OUT) throw new Error('Qo‘shiq juda uzun — MP3 ga o‘girilgandan keyin ham 15 MB dan oshdi.');
  return { bytes: mp3, converted: true, kbps };
}

export function toBase64(bytes) {
  let s = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) s += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(s);
}
