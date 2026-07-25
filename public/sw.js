/* 16 Skincare — Service Worker
 *
 * 役割は2つだけに絞っている:
 *   1. アプリシェルの最小キャッシュ（オフラインでも起動できる）
 *   2. リマインド通知のタップでアプリに戻す
 *
 * Next.js のビルド成果物（/_next/*）はハッシュ付きなので stale-while-revalidate、
 * ページ遷移（navigate）はネットワーク優先＋失敗時キャッシュにしている。
 * ここで API レスポンスをキャッシュすると古い診断結果を返してしまうため、除外する。
 */

const VERSION = 'v1'
const SHELL_CACHE = `16sk-shell-${VERSION}`
const RUNTIME_CACHE = `16sk-runtime-${VERSION}`

const SHELL_ASSETS = ['/', '/diagnosis', '/mypage', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // 1つでも取得に失敗するとインストール全体が落ちるので、個別に握りつぶす
      .then((cache) => Promise.all(SHELL_ASSETS.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // API と Supabase 通信はキャッシュしない（常に最新を取る）
  if (url.pathname.startsWith('/api/')) return

  // ページ遷移: ネットワーク優先、オフライン時はキャッシュ
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // 静的アセット: キャッシュ優先＋裏で更新
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    })
  )
})

// 通知をタップしたら、開いているタブがあればそれを前面に、無ければ新しく開く
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = '/mypage?tab=routine'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
