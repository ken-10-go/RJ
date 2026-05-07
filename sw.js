// Service Worker — goto coffee roast manager
// CACHE_NAME を更新するたびに古いキャッシュが自動削除されます
const CACHE_NAME = 'rj-v2.56';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/goto_coffee_banner.svg',
  './assets/goto_coffee_icon.svg',
  './assets/goto_coffee_icon_notext.svg',
  './assets/goto_coffee_icon_1024.png',
  './assets/goto_coffee_icon_notext_1024.png',
  './js/constants.js',
  './js/ui.js',
  './js/beans.js',
  './js/roast.js',
  './js/ocr.js',
  './js/taste.js',
  './js/records.js',
  './js/storage.js',
  './js/init.js',
];

// インストール: アセットをキャッシュ & 即座にアクティブ化
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// アクティベート: 古いキャッシュを削除 & 全クライアントを即時制御
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// フェッチ: アプリ assets はキャッシュ優先、Drive API / version.json はネットワーク優先
self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Google API・version.json は常に最新を取得
  if (url.includes('googleapis.com') || url.includes('accounts.google.com') ||
      url.includes('version.json')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // その他: キャッシュ優先
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
