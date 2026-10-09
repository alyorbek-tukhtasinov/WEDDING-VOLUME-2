// Bot yuborgan havola (boshqaruv.<domen>/korinish.html?s=<nom>&k=<imzo>): mijoz o'z qoralamasini
// "NAMUNA" belgisi bilan ko'radi. Sayt yig'ilmaydi — shablonning jonli ko'rinish sahifasi (preview-*.html) ishlatiladi.
const PREVIEW = { volume5: 'volume5', volume3: 'volume3', volume4: 'volume3', osmon: 'osmon', volume2: 'v2', suzani: 'suzani', bulut: 'bulut', kitob: 'kitob', yz: 'yz' };

const msg = document.getElementById('msg');
const q = new URLSearchParams(location.search);

async function main() {
  let data;
  try {
    const r = await fetch(`/api/panel/app/draft?s=${encodeURIComponent(q.get('s') || '')}&k=${encodeURIComponent(q.get('k') || '')}`, { cache: 'no-store' });
    data = await r.json();
  } catch {
    msg.textContent = 'Internet aloqasini tekshirib, sahifani yangilang.';
    return;
  }
  if (!data?.ok) {
    msg.textContent = data?.message || 'Taklifnoma topilmadi.';
    return;
  }
  // To'langan bo'lsa — haqiqiy saytga
  if (data.paid && data.url) {
    location.replace(data.url);
    return;
  }
  const frame = document.createElement('iframe');
  frame.id = 'frame';
  frame.title = 'Taklifnoma';
  frame.src = `/preview-${PREVIEW[data.template] || 'v2'}.html`;
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data?.previewReady) return;
    frame.contentWindow.postMessage({ config: data.config, media: {}, mediaBase: '/media/' }, location.origin);
  });
  document.body.append(frame);
  msg.remove();
}
main();
