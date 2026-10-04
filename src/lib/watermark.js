// "NAMUNA" belgisi (config.watermark: true) — to'lov qilinmagan saytlar uchun.
// Saytning butun yuzasi bo'ylab qiya "NAMUNA" yozuvlari va pastda izoh chiqadi.
// Barcha shablonlarda bir xil: build vaqtida HTML'ga qo'shiladi (vite.config.js),
// panelning jonli ko'rinishida esa setWatermark() orqali.
// Bu fayl ham brauzerda, ham build vaqtida (Node) ishlatiladi — import paytida DOM ishlatmang.

export const WATERMARK_ID = 'taklifnoma-namuna';
export const WATERMARK_NOTE = 'Ushbu belgi to‘lov amalga oshirilgach avtomatik olib tashlanadi!';

// Oq yozuv + to'q chegara: och va to'q fonlarda ham ko'rinadi.
// Pastdagi izoh ikki chetdan joy qoldiradi — burchaklardagi musiqa va boshqa tugmalar ko'rinib tursin.
const TILE =
  "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='190'>" +
  "<text x='120' y='106' transform='rotate(-30 120 95)' text-anchor='middle' font-family='Arial,Helvetica,sans-serif' " +
  "font-size='34' font-weight='700' letter-spacing='6' fill='rgba(255,255,255,.24)' stroke='rgba(0,0,0,.24)' stroke-width='1'>NAMUNA</text></svg>";

const CSS = `#${WATERMARK_ID}{position:fixed;inset:0;z-index:2147483000;pointer-events:none;user-select:none;-webkit-user-select:none}
#${WATERMARK_ID} .nm-tiles{position:absolute;inset:0;background-image:url("data:image/svg+xml,${encodeURIComponent(TILE)}");background-repeat:repeat}
#${WATERMARK_ID} .nm-note{position:absolute;left:50%;bottom:calc(12px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:max-content;max-width:calc(100% - 152px);box-sizing:border-box;padding:8px 14px;border-radius:12px;background:rgba(20,16,12,.84);color:#fff;text-align:center;font:500 12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.25)}
#${WATERMARK_ID} .nm-note b{display:block;margin-bottom:2px;color:#e8c27a;font-size:13px;font-weight:700;letter-spacing:.32em}`;

const INNER = `<style>${CSS}</style><div class="nm-tiles"></div><div class="nm-note"><b>NAMUNA</b>${WATERMARK_NOTE}</div>`;

// Build: </body> oldiga qo'shiladigan tayyor HTML
export function watermarkHtml() {
  return `<div id="${WATERMARK_ID}" aria-hidden="true">${INNER}</div>`;
}

// Jonli ko'rinish (brauzer): belgini qo'yish yoki olib tashlash
export function setWatermark(on) {
  const el = document.getElementById(WATERMARK_ID);
  if (!on) return el?.remove();
  if (el) return;
  const box = document.createElement('div');
  box.id = WATERMARK_ID;
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = INNER;
  document.body.appendChild(box);
}
