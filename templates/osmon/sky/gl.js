// Yulduzlar va Somon yo'lini WebGL'da chizish (minglab nuqta — telefonlarda ham 60 kadr/s).
// Proyeksiya shader ichida bajariladi: kamera har kadrda o'zgaradi, osmon esa bir marta yuklanadi.

const VERT = `
precision highp float;
attribute vec3 aPos;
attribute vec3 aColor;
attribute float aMag;
attribute float aPhase;
uniform vec3 uR;
uniform vec3 uU;
uniform vec3 uF;
uniform vec2 uClip;
uniform float uPx;
uniform float uTime;
uniform float uTwinkle;
uniform float uLimit;
uniform float uKind;
uniform float uCell;
uniform float uBright;
varying vec3 vColor;
varying float vAlpha;
varying float vSpike;
varying float vKind;
void main() {
  vKind = uKind;
  float z = dot(aPos, uF);
  if (z < -0.15 || aPos.z < -0.01) {
    gl_Position = vec4(3.0, 3.0, 3.0, 1.0);
    gl_PointSize = 0.0;
    vAlpha = 0.0;
    return;
  }
  float k = 2.0 / (1.0 + z);
  gl_Position = vec4(dot(aPos, uR) * k * uClip.x, dot(aPos, uU) * k * uClip.y, 0.0, 1.0);
  // Atmosfera: ufqqa yaqin yulduzlar xiraroq va ko'proq miltillaydi
  float ext = smoothstep(0.0, 0.2, aPos.z);
  vColor = aColor;
  if (uKind < 0.5) {
    float b = clamp(pow(10.0, -0.3 * (aMag - 1.4)), 0.14, 1.0);
    float vis = smoothstep(uLimit + 0.6, uLimit - 0.4, aMag);
    float tw = 1.0 + uTwinkle * (0.12 + 0.45 * (1.0 - ext)) * sin(uTime * (1.1 + fract(aPhase * 7.31) * 2.6) + aPhase * 6.2832);
    vAlpha = b * vis * mix(0.3, 1.0, ext) * tw * uBright;
    vSpike = smoothstep(1.4, -0.6, aMag);
    gl_PointSize = clamp(1.6 + (5.2 - aMag) * 0.95, 1.6, 9.0) * uPx * (1.0 + vSpike * 1.6);
  } else {
    vAlpha = aMag * mix(0.25, 1.0, ext) * uBright;
    vSpike = 0.0;
    gl_PointSize = uCell * k;
  }
}`;

const FRAG = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
varying float vSpike;
varying float vKind;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d2 = dot(p, p);
  if (d2 > 1.0) discard;
  float i;
  if (vKind < 0.5) {
    float sp = 1.0 + vSpike * 2.2;
    float core = exp(-d2 * 16.0 * sp);
    float halo = exp(-d2 * 5.0 * sp) * 0.32;
    float spikes = vSpike * (exp(-abs(p.x) * 30.0) * exp(-p.y * p.y * 2.2) + exp(-abs(p.y) * 30.0) * exp(-p.x * p.x * 2.2)) * 0.55;
    i = core + halo + spikes;
  } else {
    i = exp(-d2 * 2.6) * (1.0 - d2);
  }
  float a = clamp(i * vAlpha, 0.0, 1.0);
  gl_FragColor = vec4(vColor * a, a);
}`;

// B−V rang ko'rsatkichi → RGB (issiq ko'k-oq yulduzlardan sovuq to'q sariqqacha)
const BV = [
  [-0.4, [0.64, 0.74, 1.0]],
  [0.0, [0.8, 0.87, 1.0]],
  [0.4, [1.0, 0.98, 0.95]],
  [0.8, [1.0, 0.91, 0.78]],
  [1.2, [1.0, 0.82, 0.62]],
  [1.6, [1.0, 0.73, 0.5]],
  [2.2, [1.0, 0.64, 0.42]],
];
export function bvColor(bv) {
  if (bv <= BV[0][0]) return BV[0][1];
  for (let i = 1; i < BV.length; i++) {
    if (bv <= BV[i][0]) {
      const [b0, c0] = BV[i - 1];
      const [b1, c1] = BV[i];
      const t = (bv - b0) / (b1 - b0);
      // Nafislik uchun biroz oqqa yaqinlashtiriladi
      return c0.map((c, j) => 0.3 + 0.7 * (c + (c1[j] - c) * t));
    }
  }
  return BV[BV.length - 1][1];
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

export function createGL(canvas) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const prog = gl.createProgram();
  try {
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  } catch {
    return null;
  }
  gl.useProgram(prog);
  const loc = (n) => gl.getUniformLocation(prog, n);
  const U = Object.fromEntries(['uR', 'uU', 'uF', 'uClip', 'uPx', 'uTime', 'uTwinkle', 'uLimit', 'uKind', 'uCell', 'uBright'].map((n) => [n, loc(n)]));
  const A = { aPos: 0, aColor: 1, aMag: 2, aPhase: 3 };
  for (const [n, i] of Object.entries(A)) gl.bindAttribLocation(prog, i, n);
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const U2 = Object.fromEntries(Object.keys(U).map((n) => [n, loc(n)]));
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);

  const layers = {};
  // Har nuqta: pos(3) rang(3) kattalik/intensivlik(1) faza(1) = 8 float
  function setLayer(name, data) {
    const buf = layers[name]?.buf || gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    layers[name] = { buf, count: data.length / 8 };
  }

  function draw(name, kind) {
    const l = layers[name];
    if (!l || !l.count) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, l.buf);
    const stride = 32;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 24);
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 28);
    gl.uniform1f(U2.uKind, kind);
    gl.drawArrays(gl.POINTS, 0, l.count);
  }

  /**
   * opts: cam, dpr, time, twinkle (0..1), limit (ko'rinadigan eng xira kattalik),
   *       mw (Somon yo'li yorqinligi 0..1), cellDeg, bright (umumiy yorqinlik)
   */
  function render(o) {
    const { cam, dpr } = o;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3fv(U2.uR, cam.r);
    gl.uniform3fv(U2.uU, cam.u);
    gl.uniform3fv(U2.uF, cam.f);
    gl.uniform2f(U2.uClip, (cam.scale * 2) / cam.w, (cam.scale * 2) / cam.h);
    gl.uniform1f(U2.uPx, dpr);
    gl.uniform1f(U2.uTime, o.time);
    gl.uniform1f(U2.uTwinkle, o.twinkle);
    gl.uniform1f(U2.uLimit, o.limit);
    gl.uniform1f(U2.uCell, ((o.cellDeg * Math.PI) / 180) * cam.scale * dpr * 2.4);
    if (o.mw > 0.001) {
      gl.uniform1f(U2.uBright, o.mw);
      draw('mw', 1);
    }
    gl.uniform1f(U2.uBright, o.bright ?? 1);
    draw('faint', 0);
    draw('stars', 0);
  }

  return { gl, setLayer, render };
}
