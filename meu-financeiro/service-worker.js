const SW_VERSION='meu-financeiro-sw-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('meu-financeiro-')).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  // Rede primeiro de propósito: evita servir uma versão antiga do app financeiro.
  event.respondWith(fetch(event.request));
});