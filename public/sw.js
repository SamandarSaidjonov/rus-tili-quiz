/**
 * Оддий service worker: сайт офлайнда ҳам очилади.
 * HTML — аввал тармоқдан (янги контент учун), бўлмаса кэшдан.
 * Қолган файллар (JS, CSS, шрифт, расм) — аввал кэшдан, кейин тармоқдан.
 *
 * HTML доим `cache: 'reload'` билан олинади: браузернинг ўз HTTP кэши
 * (GitHub Pages'да 10 дақиқа) эски HTML'ни бермасин. Эски HTML янги йиғилишда
 * ўчиб кетган CSS файлини сўрайди ва саҳифа услубсиз чиқади.
 */
const VERSION = 'rt2-v6';
const CACHE = `${VERSION}-assets`;
const OFFLINE_URL = '/rus-tili-quiz/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const old = keys.filter((k) => !k.startsWith(VERSION));
      await Promise.all(old.map((k) => caches.delete(k)));
      await self.clients.claim();

      // Эски версиядан янгисига ўтилди: очиқ саҳифаларда эски HTML турган бўлиши мумкин
      // (у ўчиб кетган CSS'ни сўрайди). Уларни бир марта қайта юклаймиз.
      // Биринчи марта ўрнатилганда (эски кэш йўқ) ҳеч нарса қилинмайди.
      //
      // Муҳим: навигация `waitUntil` ичида кутилмайди. Кутилса, activate тугамайди,
      // навигация сўрови эса activate тугашини кутади — иккаласи бир-бирини тўсиб қолади.
      if (!old.length) return;
      self.clients.matchAll({ type: 'window' }).then((windows) => {
        for (const client of windows) {
          try {
            client.navigate(client.url);
          } catch {
            /* саҳифани янгилаб бўлмаса, фойдаланувчи ўзи янгилайди */
          }
        }
      });
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'reload' })
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(OFFLINE_URL))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
