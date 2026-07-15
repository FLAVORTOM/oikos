// Oikos service worker — cache the app shell, never cache Dropbox data
const CACHE = 'oikos-v3';
const SHELL = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Dropbox API calls always go to the network
  if (url.hostname.endsWith('dropboxapi.com') || url.hostname.endsWith('dropbox.com')) return;
  // App shell: cache-first, refresh in background
  e.respondWith(
    caches.match(e.request).then(hit => {
      const fetching = fetch(e.request).then(res => {
        if (res.ok && url.origin === location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => hit);
      return hit || fetching;
    })
  );
});
