// Держит саму страницу на iPad, чтобы «Витрина» открывалась и без интернета.
// Ролики сюда не попадают — они лежат в хранилище страницы.
const CACHE = 'vitrina-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  const shell = SHELL.map((p) => new URL(p, self.registration.scope).href);
  const isShell = request.mode === 'navigate' || shell.includes(url.origin + url.pathname);
  if (!isShell) return;
  // Сначала сеть — чтобы подтягивать обновления; без сети — из сохранённой копии
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
