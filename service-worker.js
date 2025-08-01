// Install event: cache core files for offline use
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('segrec-cache-v1').then(cache => {
        // Add key app resources to the cache
      return cache.addAll([
        '/', // Root page
        '/index.html', // Main HTML file
        '/style.css', // Stylesheet
        '/app.js' // JavaScript logic
      ]);
    })
  );
  console.log('Service Worker: Installed');
});

// Fetch event: serve cached content when available, fallback to network if not
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
        // Respond with cache if found, else fetch from network
      return response || fetch(event.request);
    })
  );
});
