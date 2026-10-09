// Bot orqali to'langan saytlarni yig'ilgan versiyaga ulash (DATA_DIR/built/<nom> → <sites>/<nom> symlink).
//   node scripts/link-bot-sites.js <sites papkasi>
// deploy.sh yangi versiyaga o'tishdan oldin chaqiradi: yig'ish bir necha daqiqa davom etadi va shu payt
// tasdiqlangan sayt build-all ro'yxatiga tushmay qolishi mumkin edi (yangi versiyada 404).
import fs from 'node:fs';
import path from 'node:path';
import { listSites, builtDir, STATUS } from '../server/data.js';

const out = path.resolve(process.argv[2] || 'sites');
let n = 0;
for (const { slug, meta } of listSites()) {
  if (meta.status !== STATUS.paid || !fs.existsSync(path.join(builtDir(slug), 'index.html'))) continue;
  const link = path.join(out, slug);
  if (fs.existsSync(link)) continue; // repo'dagi sayt yoki allaqachon ulangan
  fs.symlinkSync(builtDir(slug), link);
  n++;
}
if (n) console.log(`  yig'ish paytida tasdiqlangan bot saytlari ulandi: ${n} ta`);
