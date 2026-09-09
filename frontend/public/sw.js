/**
 * Service worker mínimo do PWA.
 *
 * Escopo deliberadamente estreito: guarda apenas a casca do app (HTML/ícones)
 * para abrir rápido e permitir a instalação no celular. Chamadas a /api NUNCA
 * são cacheadas — dados de protocolo e assinatura precisam ser sempre atuais,
 * e uma resposta velha aqui induziria o gerente a erro.
 */
const CACHE = 'contratos-casca-v1';
const CASCA = ['/', '/manifest.webmanifest', '/icone-192.png', '/icone-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCA)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);

  if (evento.request.method !== 'GET' || url.pathname.startsWith('/api')) return;

  // Navegações: rede primeiro, com a casca em cache como reserva offline.
  if (evento.request.mode === 'navigate') {
    evento.respondWith(fetch(evento.request).catch(() => caches.match('/')));
    return;
  }

  evento.respondWith(caches.match(evento.request).then((cacheado) => cacheado ?? fetch(evento.request)));
});
