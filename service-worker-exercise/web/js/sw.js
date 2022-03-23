'use strict'

const version = 5
var isOnline = true
var isLoggedIn = false
// id of the cached file collection for each version
var cacheName = `ramblings-${version}`

var urlsToCache = {
  // resources urls that need to be cached
  loggedOut: [
    // pages urls get rewrited by the server
    '/',
    '/about',
    '/contact',
    '/login',
    '/404',
    '/offline',

    // other static files
    '/js/blog.js',
    '/js/home.js',
    '/js/login.js',
    '/js/add-post.js',
    '/css/style.css',
    '/images/logo.gif',
    '/images/offline.png',
  ],
}

// these events won't be fired on restart
self.addEventListener('install', onInstall)
self.addEventListener('activate', onActivate)
self.addEventListener('message', onMessage)
self.addEventListener('fetch', onFetch)

// will run on restart
main().catch(console.error)

async function main() {
  await sendMessage({requestStatusUpdate: true})
  // no force reload on startup: cache everything missing and ignore everything already in the cache
  await cacheLoggedOutFiles()
}

async function onInstall() {
  console.log(`Service Worker (${version}) installed.`)
  // skip the waiting phase
  self.skipWaiting()
}

async function sendMessage(message) {
  var allClients = await clients.matchAll({
    includeUncontrolled: true,
  })
  return Promise.all(
    allClients.map(function clientMessage(client) {
      var channel = new MessageChannel()
      channel.port1.onmessage = onMessage
      return client.postMessage(message, [channel.port2])
    }),
  )
}

function onMessage({data}) {
  if (data.statusUpdate) {
    ;({isOnline, isLoggedIn} = data.statusUpdate)
    console.log(
      `Service Worker (${version}) status update...
      isOnline:${isOnline}, isLoggedIn:${isLoggedIn}`,
    )
  }
}

function onFetch(event) {
  event.respondWith(router(event.request))
}

async function router(request) {
  var url = new URL(request.url)
  var requestUrl = url.pathname
  var cache = await caches.open(cacheName)

  if (url.origin === location.origin) {
    var res
    try {
      let fetchOptions = {
        method: request.method,
        headers: request.headers,
        credentials: 'omit',
        cache: 'no-store',
      }

      res = await fetch(request.url, fetchOptions)
      if (res && res.ok) {
        await cache.put(requestUrl, res.clone())
        return res
      }
    } catch (error) {}

    res = await cache.match(requestUrl)
    if (res) {
      return res.clone()
    }
  }
}

async function onActivate(event) {
  // If shutdown is necessary, don't do it until activation is handled
  event.waitUntil(handleActivation())
}

async function handleActivation() {
  await clearCaches()
  // recache everything on activation
  await cacheLoggedOutFiles({forceReload: true})
  // fire `controllerchange` event
  await clients.claim()
  console.log(`Service Worker (${version}) activated.`)
}

async function clearCaches() {
  var cacheNames = await caches.keys()
  var oldCacheNames = cacheNames.filter(function matchOldCache(cacheName) {
    if (/^ramblings-\d+$/.test(cacheName)) {
      let [, cacheVersion] = cacheName.match(/^ramblings-(\d+)$/)
      cacheVersion = cacheVersion !== null ? Number(cacheVersion) : cacheVersion
      return cacheVersion > 0 && cacheVersion !== version
    }
  })
  return Promise.all(
    oldCacheNames.map(function deleteCache(cacheName) {
      return caches.delete(cacheName)
    }),
  )
}

async function cacheLoggedOutFiles({forceReload} = {forceReload: false}) {
  var cache = await caches.open(cacheName)

  return Promise.all(
    urlsToCache.loggedOut.map(async function requestFile(url) {
      try {
        let res

        if (!forceReload) {
          res = await cache.match(url)
          if (res) {
            return res
          }
        }

        let fetchOptions = {
          method: 'GET',
          cache: 'no-cache', // cache must be validated by server
          credentials: 'omit',
        }
        res = await fetch(url, fetchOptions)
        if (res.ok) {
          await cache.put(url, res.clone())
        }
      } catch (error) {}
    }),
  )
}
