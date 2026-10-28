// Install Event - Triggered when the service worker is installed
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installed safely.");
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

// Activate Event
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activated.");
  event.waitUntil(self.clients.claim()); // Take control of all pages immediately
});

// 🟢 THE PUSH EVENT: Catches the notification from the server
self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    // Enterprise Configuration for OS-level Push
    const options = {
      body: data.body || "You have a new update.",
      icon: "/cyberpng.png", // Must be in public folder
      badge: "/cyberpng.png", // Small monochrome icon for Android top bar
      vibrate: [200, 100, 200, 100, 200], // Haptic feedback pattern
      requireInteraction: data.requireInteraction || false, // If true, stays on screen until dismissed
      data: {
        url: data.url || "/dashboard", // Where to go when clicked
      },
      image: data.image || null, // For large banner images (Shortlisted congrats image etc)
    };

    // Show the native notification
    event.waitUntil(
      self.registration.showNotification(data.title || "Cybersecurity Club", options)
    );
  } catch (error) {
    console.error("[Service Worker] Error parsing push payload:", error);
  }
});

// 🟢 THE NOTIFICATION CLICK EVENT: What happens when student taps the notification
self.addEventListener("notificationclick", function (event) {
  event.notification.close(); // Close the native pop-up

  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // 1. If the app is already open in the background, bring it to front and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // 2. If the app is completely closed, open a new window/app instance
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});