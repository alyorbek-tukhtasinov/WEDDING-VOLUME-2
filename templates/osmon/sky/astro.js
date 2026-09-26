// Astronomik hisob-kitoblar: to'y kechasi osmonida yulduzlar, Oy va sayyoralar qayerda bo'lishi.
// Aniqlik taklifnoma uchun yetarli (yulduzlar ~0.01°, Oy ~0.3°, sayyoralar ~0.5°).
// Manbalar: J. Meeus "Astronomical Algorithms"; JPL "Approximate Positions of the Planets".

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const norm360 = (x) => ((x % 360) + 360) % 360;
const sin = (d) => Math.sin(d * RAD);
const cos = (d) => Math.cos(d * RAD);

/** Julian kun (UTC Date → JD). */
export const julianDay = (date) => date.getTime() / 86400000 + 2440587.5;

/** Grinvich yulduz vaqti, gradusda. */
export function gmst(jd) {
  const T = (jd - 2451545) / 36525;
  return norm360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - (T * T * T) / 38710000);
}

/** Ekliptika og'ishi, gradusda. */
const obliquity = (jd) => 23.439291 - 0.0130042 * ((jd - 2451545) / 36525);

/** Ekliptik (λ, β) → ekvatorial (RA, Dec), gradusda. */
export function eclToEq(lambda, beta, jd) {
  const e = obliquity(jd);
  const ra = Math.atan2(sin(lambda) * cos(e) - Math.tan(beta * RAD) * sin(e), cos(lambda)) * DEG;
  const dec = Math.asin(sin(beta) * cos(e) + cos(beta) * sin(e) * sin(lambda)) * DEG;
  return { ra: norm360(ra), dec };
}

/**
 * Precessiya: J2000 koordinatalari (katalog, sayyoralar) → berilgan sana ekvinoksiyasi.
 * Yer o'qi ~26 000 yilda bir aylanadi — 25 yilda farq ~0.35°. (Meeus 21.2–21.4)
 */
export function precessFromJ2000(ra, dec, jd) {
  const T = (jd - 2451545) / 36525;
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) / 3600;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) / 3600;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) / 3600;
  const A = cos(dec) * sin(ra + zeta);
  const B = cos(theta) * cos(dec) * cos(ra + zeta) - sin(theta) * sin(dec);
  const C = sin(theta) * cos(dec) * cos(ra + zeta) + cos(theta) * sin(dec);
  return { ra: norm360(Math.atan2(A, B) * DEG + z), dec: Math.asin(Math.max(-1, Math.min(1, C))) * DEG };
}

/**
 * Ekvatorial → gorizontal. lst — mahalliy yulduz vaqti (gradus), lat — kenglik.
 * Natija: alt (balandlik), az (azimut, shimoldan soat yo'nalishida), gradusda.
 */
export function eqToHorizontal(ra, dec, lst, lat) {
  const H = lst - ra;
  const alt = Math.asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(H)) * DEG;
  const az = Math.atan2(-sin(H) * cos(dec), sin(dec) * cos(lat) - cos(dec) * sin(lat) * cos(H)) * DEG;
  return { alt, az: norm360(az) };
}

/** Gorizontal koordinata → birlik vektor (x — sharq, y — shimol, z — tepaga). */
export function horizontalToVec(alt, az) {
  return [cos(alt) * sin(az), cos(alt) * cos(az), sin(alt)];
}

/* ------------------------------------------------------------------ */
/*  Quyosh va Oy                                                        */
/* ------------------------------------------------------------------ */
export function sunPosition(jd) {
  const n = jd - 2451545;
  const L = norm360(280.46 + 0.9856474 * n);
  const g = norm360(357.528 + 0.9856003 * n);
  const lambda = L + 1.915 * sin(g) + 0.02 * sin(2 * g);
  return { lambda: norm360(lambda), ...eclToEq(lambda, 0, jd) };
}

export function moonPosition(jd) {
  const T = (jd - 2451545) / 36525;
  const lambda =
    218.32 + 481267.881 * T +
    6.29 * sin(135.0 + 477198.87 * T) - 1.27 * sin(259.3 - 413335.36 * T) +
    0.66 * sin(235.7 + 890534.22 * T) + 0.21 * sin(269.9 + 954397.74 * T) -
    0.19 * sin(357.5 + 35999.05 * T) - 0.11 * sin(186.5 + 966404.03 * T);
  const beta =
    5.13 * sin(93.3 + 483202.02 * T) + 0.28 * sin(228.2 + 960400.89 * T) -
    0.28 * sin(318.3 + 6003.15 * T) - 0.17 * sin(217.6 - 407332.21 * T);
  const sun = sunPosition(jd);
  const lam = norm360(lambda);
  // Elongatsiya → yoritilgan qism; (λOy − λQuyosh) 0..180 — o'suvchi Oy
  const elong = Math.acos(cos(beta) * cos(lam - sun.lambda)) * DEG;
  const illumination = (1 - cos(elong)) / 2;
  const waxing = norm360(lam - sun.lambda) < 180;
  // Yoritilgan tomonning burchagi (ekranda Quyosh tomon) — keyin gorizontalda hisoblanadi
  return { lambda: lam, beta, ...eclToEq(lam, beta, jd), illumination, waxing, elongation: elong };
}

export function moonPhaseName(illumination, waxing) {
  if (illumination < 0.03) return 'Yangi oy';
  if (illumination > 0.97) return 'To‘lin oy';
  if (Math.abs(illumination - 0.5) < 0.07) return waxing ? 'Birinchi chorak' : 'Oxirgi chorak';
  if (illumination < 0.5) return waxing ? 'O‘suvchi hilol' : 'Kamayuvchi hilol';
  return waxing ? 'To‘lib borayotgan Oy' : 'Kamayib borayotgan Oy';
}

/* ------------------------------------------------------------------ */
/*  Sayyoralar (JPL taxminiy elementlari, 1800–2050)                    */
/* ------------------------------------------------------------------ */
// a, e, I, L, ϖ (long.peri), Ω (long.node) va ularning asrdagi o'zgarishi
const ELEMENTS = {
  mercury: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  venus: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255, 0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  mars: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  jupiter: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
};

function heliocentric(name, T) {
  const el = ELEMENTS[name];
  const a = el[0] + el[6] * T;
  const e = el[1] + el[7] * T;
  const I = el[2] + el[8] * T;
  const L = el[3] + el[9] * T;
  const peri = el[4] + el[10] * T;
  const node = el[5] + el[11] * T;
  const w = peri - node;
  const M = norm360(L - peri);
  // Kepler tenglamasi
  let E = M + (e * DEG) * sin(M);
  for (let i = 0; i < 8; i++) {
    const dM = M - (E - (e * DEG) * sin(E));
    E += dM / (1 - e * cos(E));
  }
  const xp = a * (cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * sin(E);
  // Ekliptik koordinatalar (J2000)
  const x = (cos(w) * cos(node) - sin(w) * sin(node) * cos(I)) * xp + (-sin(w) * cos(node) - cos(w) * sin(node) * cos(I)) * yp;
  const y = (cos(w) * sin(node) + sin(w) * cos(node) * cos(I)) * xp + (-sin(w) * sin(node) + cos(w) * cos(node) * cos(I)) * yp;
  const z = sin(w) * sin(I) * xp + cos(w) * sin(I) * yp;
  return [x, y, z];
}

export const PLANETS = [
  { id: 'venus', name: 'Venera', mag: -4.2, color: [1, 0.97, 0.9] },
  { id: 'jupiter', name: 'Yupiter', mag: -2.3, color: [1, 0.94, 0.85] },
  { id: 'mars', name: 'Mars', mag: 0.5, color: [1, 0.6, 0.42] },
  { id: 'saturn', name: 'Saturn', mag: 0.6, color: [1, 0.92, 0.75] },
  { id: 'mercury', name: 'Merkuriy', mag: 0, color: [0.95, 0.9, 0.85] },
];

export function planetPosition(id, jd) {
  const T = (jd - 2451545) / 36525;
  const [px, py, pz] = heliocentric(id, T);
  const [ex, ey, ez] = heliocentric('earth', T);
  const x = px - ex;
  const y = py - ey;
  const z = pz - ez;
  const lambda = norm360(Math.atan2(y, x) * DEG);
  const beta = Math.atan2(z, Math.hypot(x, y)) * DEG;
  // JPL elementlari J2000 ekliptikasida — avval J2000 ekvatoriga, keyin sana ekvinoksiyasiga
  const eq = eclToEq(lambda, beta, 2451545);
  return precessFromJ2000(eq.ra, eq.dec, jd);
}

/* ------------------------------------------------------------------ */
/*  Kecha: ko'rsatiladigan vaqt                                         */
/* ------------------------------------------------------------------ */
export function sunAltitude(date, lat, lng) {
  const jd = julianDay(date);
  const s = sunPosition(jd);
  return eqToHorizontal(s.ra, s.dec, gmst(jd) + lng, lat).alt;
}

/**
 * To'y vaqtida osmon hali yorug' bo'lsa (Quyosh ufqdan 6° dan kam pastda — kunduz yoki shafaq), o'sha kuni yulduzlar to'liq
 * ko'rinadigan payt (Quyosh ufqdan 15° pastda) qaytariladi. Aks holda — to'y vaqtining o'zi.
 */
export function nightMoment(start, lat, lng) {
  if (sunAltitude(start, lat, lng) <= -6) return { date: start, shifted: false };
  let t = start.getTime();
  const end = t + 20 * 3600e3;
  for (; t < end; t += 5 * 60e3) {
    if (sunAltitude(new Date(t), lat, lng) <= -15) return { date: new Date(t), shifted: true };
  }
  return { date: start, shifted: false };
}

/** Osmonning to'liq tasviri: hamma narsa gorizontal koordinatalarda (alt/az). */
export function skySnapshot(date, lat, lng) {
  const jd = julianDay(date);
  const lst = gmst(jd) + lng;
  const moon = moonPosition(jd);
  const moonGeo = eqToHorizontal(moon.ra, moon.dec, lst, lat);
  // Topotsentrik tuzatish: Oy yaqin — kuzatuvchidan u ~0.95° pastroq ko'rinadi (gorizontal paralaks)
  const moonH = { alt: moonGeo.alt - 0.95 * Math.cos(moonGeo.alt * RAD), az: moonGeo.az };
  const sun = sunPosition(jd);
  const sunH = eqToHorizontal(sun.ra, sun.dec, lst, lat);
  const planets = PLANETS.map((p) => {
    const eq = planetPosition(p.id, jd);
    return { ...p, ...eq, ...eqToHorizontal(eq.ra, eq.dec, lst, lat) };
  });
  return {
    jd,
    lst,
    lat,
    lng,
    moon: { ...moon, ...moonH, phase: moonPhaseName(moon.illumination, moon.waxing) },
    sun: { ...sun, ...sunH },
    planets,
    // Katalog (J2000) koordinatalari uchun: precessiya + gorizontalga o'tkazish
    toHorizontal: (ra, dec) => {
      const p = precessFromJ2000(ra, dec, jd);
      return eqToHorizontal(p.ra, p.dec, lst, lat);
    },
  };
}

/** Azimutni odamga tushunarli yo'nalishga aylantirish. */
export function directionName(az) {
  const names = ['shimol', 'shimoli-sharq', 'sharq', 'janubi-sharq', 'janub', 'janubi-g‘arb', 'g‘arb', 'shimoli-g‘arb'];
  return names[Math.round(norm360(az) / 45) % 8];
}

/** Galaktik koordinata (l, b) → ekvatorial (J2000). */
export function galacticToEq(l, b) {
  const ra0 = 192.85948;
  const dec0 = 27.12825;
  const l0 = 122.93192;
  const dec = Math.asin(sin(b) * sin(dec0) + cos(b) * cos(dec0) * cos(l0 - l)) * DEG;
  const ra = ra0 + Math.atan2(cos(b) * sin(l0 - l), sin(b) * cos(dec0) - cos(b) * sin(dec0) * cos(l0 - l)) * DEG;
  return { ra: norm360(ra), dec };
}
