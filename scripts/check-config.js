// Foydalanish:
//   npm run check            — barcha mijozlarni tekshiradi
//   npm run check -- jasur   — faqat bitta mijozni tekshiradi
import { listClients, loadClient } from './client.js';

const targets = process.argv.slice(2).length ? process.argv.slice(2) : listClients();
let failed = 0;

for (const slug of targets) {
  try {
    const { derived, config } = await loadClient(slug);
    console.log(`✔ ${slug.padEnd(24)} ${derived.names} — ${derived.dateText}, soat ${config.event.time}`);
  } catch (err) {
    failed++;
    console.error(err.message.trim());
  }
}

if (failed) {
  console.error(`\n${failed} ta mijozda xato topildi.`);
  process.exit(1);
}
