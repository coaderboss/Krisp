const CACHE_NAME = "cyberkrisp-static-v1";
const DYNAMIC_CACHE = "cyberkrisp-dynamic-v1";

// 1. INSTALL EVENT - Skips waiting to force update immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// 2. ACTIVATE EVENT - Auto-cleans old caches when a new update arrives
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. SMART FETCH - "Network First, Fallback to Cache" (🟢 SECURED FOR APIS)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // SECURITY FIX: Never cache dynamic API routes, auth sessions, or TRPC endpoints
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) {
      return; // Let the browser handle these normally, bypassing SW cache completely
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return caches.open(DYNAMIC_CACHE).then((cache) => {
          // Verify scheme is http/https before caching (prevents chrome-extension:// crash)
          if (url.protocol === 'http:' || url.protocol === 'https:') {
             cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
      .catch(() => caches.match(event.request))
  );
});

// 4. ADVANCED PUSH EVENT - Handles rich media and interactions
self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || "Portal update available.",
      icon: "/cyberpng.png", 
      badge: "/cyberpng.png", 
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: data.requireInteraction || false,
      data: { url: data.url || "/" },
      image: data.image || null,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Cyberkrisp Portal", options)
    );
  } catch (error) {
    console.error("[SW] Push payload error:", error);
  }
});

// 5. SECURE NOTIFICATION CLICK - Prevents Open-Redirect Attacks
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  let targetUrl = event.notification.data.url || "/";
  
  // Security Check: URL origin validate karo taaki phishing attack na ho
  try {
    const parsedUrl = new URL(targetUrl, self.location.origin);
    if (parsedUrl.origin !== self.location.origin) {
      targetUrl = self.location.origin + "/dashboard";
    }
  } catch (e) {
    targetUrl = self.location.origin + "/dashboard";
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});