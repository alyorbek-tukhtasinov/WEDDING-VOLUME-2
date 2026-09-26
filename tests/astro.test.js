// Osmon shabloni: astronomik hisob-kitoblar ma'lum qiymatlar bilan solishtiriladi
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  julianDay, gmst, eqToHorizontal, sunPosition, moonPosition, nightMoment, sunAltitude, galacticToEq, skySnapshot,
} from '../templates/osmon/sky/astro.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≈ ${b} (±${tol})`);
const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

test('Julian kun va yulduz vaqti (Meeus 12.a)', () => {
  const jd = julianDay(new Date(Date.UTC(1987, 3, 10, 0, 0, 0)));
  near(jd, 2446895.5, 1e-6, 'JD');
  near(gmst(jd), 197.693195, 0.001, 'GMST');
});

test('Qutb yulduzi balandligi ≈ kenglik (Toshkent)', () => {
  const h = eqToHorizontal(37.95, 89.26, 123.4, 41.31);
  near(h.alt, 41.31, 0.8, 'Polaris alt');
  assert.ok(angDiff(h.az, 0) < 1.5, `az ${h.az}`);
});

test('Bahorgi tengkunlik: Quyosh RA≈0, Dec≈0 (2024-03-20 03:06 UTC)', () => {
  const s = sunPosition(julianDay(new Date(Date.UTC(2024, 2, 20, 3, 6))));
  assert.ok(angDiff(s.ra, 0) < 0.1, `ra ${s.ra}`);
  near(s.dec, 0, 0.1, 'dec');
});

test('Oy: Meeus 47.a va fazalar (tutilish — yangi oy, to‘lin oy)', () => {
  const m = moonPosition(2448724.5);
  assert.ok(angDiff(m.lambda, 133.162655) < 0.4, `λ ${m.lambda}`);
  near(m.beta, -3.229126, 0.3, 'β');
  const eclipse = moonPosition(julianDay(new Date(Date.UTC(2024, 3, 8, 18, 18))));
  assert.ok(eclipse.illumination < 0.01, `new moon ${eclipse.illumination}`);
  const full = moonPosition(julianDay(new Date(Date.UTC(2024, 3, 23, 23, 49))));
  assert.ok(full.illumination > 0.99, `full moon ${full.illumination}`);
  const firstQ = moonPosition(julianDay(new Date(Date.UTC(2024, 3, 15, 19, 13))));
  near(firstQ.illumination, 0.5, 0.05, 'first quarter');
  assert.equal(firstQ.waxing, true);
});

test('PyEphem bilan solishtirish: yulduzlar, sayyoralar, Oy (Toshkent)', () => {
  const sep = (a1, z1, a2, z2) => {
    const r = Math.PI / 180;
    return Math.acos(Math.min(1, Math.sin(a1 * r) * Math.sin(a2 * r) + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.cos((z1 - z2) * r))) / r;
  };
  // Mos yozuvlar PyEphem 4.2.1 (VSOP87/ELP) bilan olingan
  const cases = [
    ['2026-10-10T14:30:00Z', { Sirius: [-57.697, 47.767], Vega: [69.623, 271.74], Polaris: [41.187, 0.816] }, { jupiter: [-31.31, 339.734], venus: [-16.347, 255.956] }, [-24.046, 277.129, 0.0012]],
    ['2027-06-21T17:00:00Z', { Sirius: [-42.45, 286.487], Vega: [55.465, 78.773], Polaris: [40.691, 0.104] }, { jupiter: [11.18, 279.631], venus: [-23.578, 338.773] }, [0.366, 120.278, 0.9359]],
  ];
  const catalog = { Sirius: [101.2872, -16.7161], Vega: [279.2347, 38.7837], Polaris: [37.9546, 89.2641] };
  for (const [iso, stars, planets, moon] of cases) {
    const snap = skySnapshot(new Date(iso), 41.3111, 69.2797);
    for (const [name, [alt, az]] of Object.entries(stars)) {
      const h = snap.toHorizontal(...catalog[name]);
      assert.ok(sep(h.alt, h.az, alt, az) < 0.3, `${iso} ${name}: ${h.alt},${h.az}`);
    }
    for (const [id, [alt, az]] of Object.entries(planets)) {
      const p = snap.planets.find((x) => x.id === id);
      assert.ok(sep(p.alt, p.az, alt, az) < 0.2, `${iso} ${id}: ${p.alt},${p.az}`);
    }
    assert.ok(sep(snap.moon.alt, snap.moon.az, moon[0], moon[1]) < 0.5, `${iso} moon ${snap.moon.alt},${snap.moon.az}`);
    near(snap.moon.illumination, moon[2], 0.01, `${iso} moon phase`);
  }
});

test('Kunduzgi to‘y: osmon qorong‘i bo‘ladigan vaqtga suriladi', () => {
  // Toshkent, 2026-10-10 16:00 (+05) — kunduz
  const day = new Date('2026-10-10T16:00:00+05:00');
  assert.ok(sunAltitude(day, 41.31, 69.28) > 0);
  const n = nightMoment(day, 41.31, 69.28);
  assert.equal(n.shifted, true);
  assert.ok(sunAltitude(n.date, 41.31, 69.28) <= -15);
  const hour = Number(n.date.toLocaleString('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', hour12: false }));
  assert.ok(hour >= 19 && hour <= 20, `soat ${hour}`);
  // Kechki to'y — o'zgarmaydi
  const eve = new Date('2026-10-10T21:30:00+05:00');
  assert.equal(nightMoment(eve, 41.31, 69.28).shifted, false);
});

test('Galaktika markazi Qavs (Sagittarius) yulduz turkumida', () => {
  const c = galacticToEq(0, 0);
  assert.ok(angDiff(c.ra, 266.4) < 0.5 && Math.abs(c.dec + 28.94) < 0.5, JSON.stringify(c));
});
