// So'rov konteksti: o'z serverimizda (server/index.js) bitta jarayon barcha taklifnomalarga
// xizmat qiladi, shuning uchun taklifnoma nomi va admin paroli har so'rov uchun alohida beriladi.
// Vercel'da kontekst bo'lmaydi — u yerda qiymatlar muhit o'zgaruvchilaridan olinadi.
import { AsyncLocalStorage } from 'node:async_hooks';

export const requestContext = new AsyncLocalStorage();
