// Kamera va stereografik proyeksiya (planetariylardagi kabi: shakllar buzilmaydi).
// Osmon nuqtalari gorizontal birlik vektorlarda: x — sharq, y — shimol, z — tepaga.

const RAD = Math.PI / 180;

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export function dirVec(alt, az) {
  const ca = Math.cos(alt * RAD);
  return [ca * Math.sin(az * RAD), ca * Math.cos(az * RAD), Math.sin(alt * RAD)];
}

/**
 * Kamera: qaysi tomonga (az) va qancha balandga (alt) qarayapti, vertikal ko'rish burchagi (fov).
 * w, h — ekran o'lchami (CSS piksel).
 */
export function makeCamera({ alt, az, fov }, w, h) {
  const f = dirVec(Math.min(89.5, Math.max(-35, alt)), az);
  const r = normalize(cross(f, [0, 0, 1]));
  const u = cross(r, f);
  const scale = h / 2 / (2 * Math.tan((fov * RAD) / 4));
  return { f, r, u, scale, w, h, cx: w / 2, cy: h / 2, alt, az, fov };
}

/** Osmon vektori → ekran nuqtasi. Kamera orqasidagi nuqtalar uchun null. */
export function project(cam, v) {
  const z = dot(v, cam.f);
  if (z < -0.2) return null;
  const k = 2 / (1 + z);
  return [cam.cx + dot(v, cam.r) * k * cam.scale, cam.cy - dot(v, cam.u) * k * cam.scale, z];
}

/** Ekran nuqtasi → osmon vektori (teskari stereografik). */
export function unproject(cam, sx, sy) {
  const X = (sx - cam.cx) / cam.scale;
  const Y = -(sy - cam.cy) / cam.scale;
  const rr = (X * X + Y * Y) / 4;
  const z = (1 - rr) / (1 + rr);
  const k = (1 + z) / 2;
  const x = X * k;
  const y = Y * k;
  return normalize([
    cam.r[0] * x + cam.u[0] * y + cam.f[0] * z,
    cam.r[1] * x + cam.u[1] * y + cam.f[1] * z,
    cam.r[2] * x + cam.u[2] * y + cam.f[2] * z,
  ]);
}

/** 1 gradus markaz atrofida necha piksel. */
export const pxPerDeg = (cam) => cam.scale * RAD;

/**
 * Osmondagi kichik obyekt (masalan, ismlar yulduz turkumi) uchun mahalliy tekislik:
 * anchor atrofida "o'ng" va "tepa" yo'nalishlar. Ekranda affin o'zgartirish sifatida ishlatiladi.
 */
export function localFrame(anchor) {
  // Kameradagidek: o'ng = oldinga × tepaga (janubga qaraganda o'ng tomon — g'arb), aks holda matn teskari chiqadi
  const right = normalize(cross(anchor, [0, 0, 1]));
  const up = normalize(cross(right, anchor));
  return { anchor, east: right, up };
}

/** Mahalliy tekislikdagi (du, dv gradus) nuqtani osmon vektoriga aylantirish. */
export function frameToVec(frame, du, dv) {
  const a = du * RAD;
  const b = dv * RAD;
  return normalize([
    frame.anchor[0] + frame.east[0] * a + frame.up[0] * b,
    frame.anchor[1] + frame.east[1] * a + frame.up[1] * b,
    frame.anchor[2] + frame.east[2] * a + frame.up[2] * b,
  ]);
}

/** Ekranda mahalliy tekislik uchun affin matritsa: [a, b, c, d, e, f] (1° → piksel). */
export function frameTransform(cam, frame) {
  const o = project(cam, frame.anchor);
  const px = project(cam, frameToVec(frame, 1, 0));
  const py = project(cam, frameToVec(frame, 0, 1));
  if (!o || !px || !py) return null;
  return [px[0] - o[0], px[1] - o[1], -(py[0] - o[0]), -(py[1] - o[1]), o[0], o[1]];
}

export { dot, cross, normalize };
