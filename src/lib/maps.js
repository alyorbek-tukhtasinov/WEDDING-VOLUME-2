// Mijoz yuborgan xarita ma'lumotini tushunish: Google/Yandex havolasi, <iframe> kodi
// yoki shunchaki "40.1461, 65.1949" koordinatasi. Natijada Google va Yandex uchun
// ishonchli havolalar va (bo'lsa) xaritani sahifaga joylash manzili (embed) qaytadi.
// Brauzerda ham, Node'da ham ishlaydi.

const num = (s) => Number(String(s).replace(',', '.'));
const okLat = (v) => Number.isFinite(v) && Math.abs(v) <= 90;
const okLng = (v) => Number.isFinite(v) && Math.abs(v) <= 180;
const round = (v) => Math.round(v * 1e6) / 1e6;

export const googleLink = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`;
export const yandexLink = (lat, lng) => `https://yandex.uz/maps/?pt=${lng},${lat}&z=17&l=map`;
export const yandexEmbed = (lat, lng) => `https://yandex.uz/map-widget/v1/?pt=${lng},${lat}&z=16&l=map`;

function decode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** <iframe src="..."> ichidan manzilni, oddiy matndan birinchi havolani ajratadi. */
function extractUrl(input) {
  const iframe = /<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i.exec(input);
  if (iframe) return { url: iframe[1].replace(/&amp;/g, '&'), iframe: true };
  const m = /https?:\/\/[^\s"'<>]+/i.exec(input);
  return m ? { url: m[0], iframe: false } : null;
}

function coordsFromUrl(url) {
  const u = decode(url);
  let m;
  // Google joy havolasi: !3d<lat>!4d<lng> (eng aniq)
  if ((m = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(u))) return { lat: num(m[1]), lng: num(m[2]) };
  // Google embed: !2d<lng>!3d<lat> (xarita markazi)
  if ((m = /!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/.exec(u))) return { lat: num(m[2]), lng: num(m[1]) };
  // Google: @lat,lng,zoom
  if ((m = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(u))) return { lat: num(m[1]), lng: num(m[2]) };
  // Google: ?q=lat,lng / query=lat,lng / ll=lat,lng (Google'da tartib lat,lng)
  if (/google\./i.test(u) && (m = /[?&](?:q|query|ll|center|destination)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/.exec(u))) {
    return { lat: num(m[1]), lng: num(m[2]) };
  }
  // Yandex: pt= / ll= / whatshere[point]= — tartib lng,lat
  if (/yandex\./i.test(u)) {
    if ((m = /[?&](?:pt|whatshere\[point\])=(-?\d+\.\d+),(-?\d+\.\d+)/.exec(u))) return { lat: num(m[2]), lng: num(m[1]) };
    if ((m = /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/.exec(u))) return { lat: num(m[2]), lng: num(m[1]) };
  }
  return null;
}

/** Google joy nomi (!2s<nom>) — to'yxona nomini taklif qilish uchun. */
function placeNameFromUrl(url) {
  const m = /!2s([^!]+)/.exec(url);
  if (!m) return '';
  const name = decode(m[1].replace(/\+/g, ' ')).trim();
  return /^0x[0-9a-f]+:0x[0-9a-f]+$/i.test(name) ? '' : name;
}

/**
 * @returns {{ ok: boolean, lat?: number, lng?: number, googleMaps: string, yandexMaps: string,
 *            embedUrl: string, placeName: string, note: string }}
 */
export function parseMapInput(input) {
  const text = String(input || '').trim();
  const empty = { ok: false, googleMaps: '', yandexMaps: '', embedUrl: '', placeName: '', note: '' };
  if (!text) return empty;

  // Faqat koordinata: "40.146117, 65.194907"
  let m = /^(-?\d{1,2}[.,]\d+)\s*[,;\s]\s*(-?\d{1,3}[.,]\d+)$/.exec(text);
  if (m) {
    const lat = round(num(m[1]));
    const lng = round(num(m[2]));
    if (okLat(lat) && okLng(lng)) {
      return { ...empty, ok: true, lat, lng, googleMaps: googleLink(lat, lng), yandexMaps: yandexLink(lat, lng), embedUrl: yandexEmbed(lat, lng) };
    }
  }

  const found = extractUrl(text);
  if (!found) return { ...empty, note: 'Havola yoki koordinata topilmadi' };
  const { url, iframe } = found;
  const isGoogle = /google\.|goo\.gl/i.test(url);
  const isYandex = /yandex\./i.test(url);
  const c = coordsFromUrl(url);
  const embedUrl = iframe || /map-widget|\/maps\/embed/i.test(url) ? url : '';

  if (c && okLat(c.lat) && okLng(c.lng)) {
    const lat = round(c.lat);
    const lng = round(c.lng);
    return {
      ...empty,
      ok: true,
      lat,
      lng,
      // Mijozning o'z havolasi (iframe bo'lmasa) aniqroq — o'sha tomon uchun uni saqlaymiz
      googleMaps: isGoogle && !iframe ? url : googleLink(lat, lng),
      yandexMaps: isYandex && !iframe ? url : yandexLink(lat, lng),
      embedUrl: embedUrl || yandexEmbed(lat, lng),
      placeName: placeNameFromUrl(url),
    };
  }

  // Qisqa havola (maps.app.goo.gl, yandex.uz/maps/-/...) yoki tashkilot sahifasi — koordinatasiz
  return {
    ...empty,
    ok: isGoogle || isYandex,
    googleMaps: isGoogle && !iframe ? url : '',
    yandexMaps: isYandex && !iframe ? url : '',
    embedUrl,
    placeName: placeNameFromUrl(url),
    note: isGoogle || isYandex
      ? 'Havola saqlandi, lekin koordinata aniqlanmadi — ikkinchi xarita tugmasi uchun koordinatali havola yoki iframe kodini ham qo‘shing'
      : 'Bu Google yoki Yandex xarita havolasi emas',
  };
}
