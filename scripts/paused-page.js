// To'xtatilgan sayt (config.paused: true) o'rniga chiqadigan sahifa.
// Ataylab hech qanday ism, sana, rasm yoki musiqa yo'q — taklifnoma mazmuni to'lovgacha yopiq.
import brand from '../brand.config.js';
import { htmlEscape } from './client.js';

export function pausedPage() {
  const link = brand.enabled && brand.url
    ? `<a class="brand" href="${htmlEscape(brand.url)}" target="_blank" rel="noopener">${htmlEscape(brand.name)}</a>`
    : '';
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Taklifnoma vaqtincha to‘xtatilgan</title>
<link rel="icon" href="/favicon.ico">
<style>
  :root { --bg: #f7f4ef; --card: #fff; --ink: #2b2622; --muted: #7a716a; --line: #e7e0d6; --accent: #b08a57; }
  @media (prefers-color-scheme: dark) { :root { --bg: #171513; --card: #211e1b; --ink: #f1ebe3; --muted: #a59b91; --line: #34302b; --accent: #d1ad7c; } }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; background: var(--bg); color: var(--ink);
    font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
  .card { width: 100%; max-width: 420px; background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 36px 26px; text-align: center; }
  .icon { width: 56px; height: 56px; margin: 0 auto 18px; border-radius: 50%; display: grid; place-items: center; border: 1.5px solid var(--accent); color: var(--accent); }
  h1 { font-size: 20px; line-height: 1.35; margin: 0 0 10px; font-weight: 600; }
  p { margin: 0; color: var(--muted); font-size: 15px; }
  .ru { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 14px; }
  .brand { display: inline-block; margin-top: 22px; color: var(--accent); text-decoration: none; font-size: 14px; }
</style>
</head>
<body>
<main class="card">
  <div class="icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div>
  <h1>Saytning ishlashi uchun to‘lov amalga oshirilishi kutilmoqda</h1>
  <p>To‘lov qilingach, taklifnoma darhol ochiladi.</p>
  <p class="ru">Сайт заработает после оплаты.</p>
  ${link}
</main>
</body>
</html>
`;
}
