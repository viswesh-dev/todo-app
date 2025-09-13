/**
 * Service Worker for Todo Application
 * Provides offline functionality and caching strategies
 */

const CACHE_NAME = 'todo-app-v1.0.0';
const STATIC_CACHE_NAME = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE_NAME = `${CACHE_NAME}-dynamic`;

// Files to cache for offline use (App Shell)
const STATIC_FILES = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',  
    '/manifest.json'
];

// Maximum number of items in dynamic cache
const MAX_DYNAMIC_CACHE_SIZE = 50;

/**
 * Utility function to limit cache size
 */
async function limitCacheSize(cacheName, maxSize) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxSize) {
        // Delete oldest entries
        const keysToDelete = keys.slice(0, keys.length - maxSize);
        await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
}

/**
 * Clean up old caches
 */
async function cleanupOldCaches(currentCacheName) {
    const cacheNames = await caches.keys();
    
    return Promise.all(
        cacheNames
            .filter(cacheName => cacheName.startsWith('todo-app-') && cacheName !== currentCacheName)
            .map(cacheName => caches.delete(cacheName))
    );
}

/**
 * Install event - Cache static resources
 */
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Service Worker: Static files cached successfully');
                // Force activation of new service worker
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Service Worker: Failed to cache static files:', error);
            })
    );
});

/**
 * Activate event - Clean up old caches and take control
 */
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            cleanupOldCaches(CACHE_NAME),
            // Take control of all clients immediately
            self.clients.claim()
        ]).then(() => {
            console.log('Service Worker: Activated successfully');
        }).catch((error) => {
            console.error('Service Worker: Activation failed:', error);
        })
    );
});

/**
 * Fetch event - Implement caching strategies
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip caching for Chrome extensions and other protocols
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // Handle different types of requests with appropriate strategies
    if (STATIC_FILES.some(file => request.url.endsWith(file) || request.url.includes(file))) {
        // Static files: Cache First strategy
        event.respondWith(cacheFirstStrategy(request));
    } else if (request.url.includes('api/') || request.url.includes('.json')) {
        // API calls and JSON files: Network First strategy
        event.respondWith(networkFirstStrategy(request));
    } else {
        // Everything else: Stale While Revalidate strategy
        event.respondWith(staleWhileRevalidateStrategy(request));
    }
});

/**
 * Cache First Strategy
 * Good for static resources that don't change often
 */
async function cacheFirstStrategy(request) {
    try {
        // Try to get from cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If not in cache, fetch from network
        const networkResponse = await fetch(request);
        
        // Cache the response for future use
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Cache First Strategy failed:', error);
        
        // Try to return a cached version as fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page or error response
        return createOfflineResponse(request);
    }
}

/**
 * Network First Strategy
 * Good for dynamic content that changes frequently
 */
async function networkFirstStrategy(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache the fresh response
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
            
            // Limit cache size
            limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_SIZE);
            
            return networkResponse;
        }
        
        // If network fails, try cache
        const cachedResponse = await caches.match(request);
        return cachedResponse || createOfflineResponse(request);
    } catch (error) {
        console.error('Network First Strategy failed:', error);
        
        // Network failed, try cache
        const cachedResponse = await caches.match(request);
        return cachedResponse || createOfflineResponse(request);
    }
}

/**
 * Stale While Revalidate Strategy
 * Good for resources where some staleness is acceptable
 */
async function staleWhileRevalidateStrategy(request) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Fetch fresh version in background
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
            limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_SIZE);
        }
        return networkResponse;
    }).catch(() => {
        // Network failed, but we might have cache
        return cachedResponse;
    });
    
    // Return cached version immediately, or wait for network
    return cachedResponse || fetchPromise;
}

/**
 * Create offline response for requests that fail
 */
function createOfflineResponse(request) {
    const url = new URL(request.url);
    
    if (request.destination === 'document' || request.headers.get('accept').includes('text/html')) {
        // Return offline HTML page
        return new Response(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Todo App - Offline</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        padding: 2rem;
                        background: #f8f9fa;
                        color: #333;
                        text-align: center;
                    }
                    .offline-icon {
                        width: 64px;
                        height: 64px;
                        margin-bottom: 1rem;
                        opacity: 0.6;
                    }
                    h1 { margin-bottom: 0.5rem; }
                    p { margin-bottom: 1rem; color: #666; }
                    .retry-btn {
                        padding: 0.5rem 1rem;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        text-decoration: none;
                        display: inline-block;
                    }
                    .retry-btn:hover {
                        background: #0056b3;
                    }
                    @media (prefers-color-scheme: dark) {
                        body { background: #1a1a1a; color: #fff; }
                        p { color: #ccc; }
                    }
                </style>
            </head>
            <body>
                <svg class="offline-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.89.19-4.15.48L18.18 13.8 23.64 7zm-6.6 8.22L3.27 1.44 2 2.72l2.05 2.06C1.91 5.76.59 6.82.36 7l11.63 14.49.01.01.01-.01L16.59 16l.91.91 1.44-1.44z"/>
                </svg>
                <h1>You're Offline</h1>
                <p>It looks like you're not connected to the internet. Don't worry, your tasks are saved locally!</p>
                <a href="/" class="retry-btn" onclick="window.location.reload()">Try Again</a>
            </body>
            </html>
        `, {
            status: 200,
            statusText: 'OK',
            headers: {
                'Content-Type': 'text/html'
            }
        });
    }
    
    // Return offline JSON response for API calls
    if (request.url.includes('api/') || request.headers.get('accept').includes('application/json')) {
        return new Response(JSON.stringify({
            error: 'Offline',
            message: 'This request requires an internet connection',
            offline: true
        }), {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    
    // Generic offline response
    return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable'
    });
}

/**
 * Background sync for data synchronization
 * This would be used if the app had a backend API
 */
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync triggered', event.tag);
    
    if (event.tag === 'todo-sync') {
        event.waitUntil(syncTodoData());
    }
});

/**
 * Sync todo data with server (placeholder for future backend integration)
 */
async function syncTodoData() {
    try {
        console.log('Service Worker: Syncing todo data...');
        
        // This would sync local changes with a remote server
        // For now, we just log that sync was attempted
        
        // Example sync logic:
        // 1. Get pending changes from IndexedDB
        // 2. Send to server API
        // 3. Update local data with server response
        // 4. Clear pending changes
        
        console.log('Service Worker: Todo data sync completed');
    } catch (error) {
        console.error('Service Worker: Todo data sync failed:', error);
        throw error; // Re-throw to trigger retry
    }
}

/**
 * Push notification handling (for future features)
 */
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push message received');
    
    const options = {
        body: 'You have task reminders!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'todo-reminder',
        requireInteraction: false,
        actions: [
            {
                action: 'view',
                title: 'View Tasks'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Todo App', options)
    );
});

/**
 * Notification click handling
 */
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'view') {
        // Open the app
        event.waitUntil(
            self.clients.matchAll().then((clients) => {
                // Check if app is already open
                const appClient = clients.find(client => 
                    client.url.includes(self.location.origin)
                );
                
                if (appClient) {
                    // Focus existing window
                    return appClient.focus();
                } else {
                    // Open new window
                    return self.clients.openWindow('/');
                }
            })
        );
    }
});

/**
 * Handle client messages (communication between main app and SW)
 */
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                version: CACHE_NAME
            });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ success: true });
            }).catch((error) => {
                event.ports[0].postMessage({ success: false, error: error.message });
            });
            break;
            
        case 'CACHE_URLS':
            if (data && data.urls) {
                cacheUrls(data.urls).then(() => {
                    event.ports[0].postMessage({ success: true });
                }).catch((error) => {
                    event.ports[0].postMessage({ success: false, error: error.message });
                });
            }
            break;
            
        default:
            console.log('Service Worker: Unknown message type:', type);
    }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    return cache.addAll(urls);
}

/**
 * Periodic cleanup task
 */
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'cleanup') {
        event.waitUntil(performCleanup());
    }
});

/**
 * Perform periodic cleanup
 */
async function performCleanup() {
    try {
        console.log('Service Worker: Performing periodic cleanup...');
        
        // Limit cache sizes
        await limitCacheSize(STATIC_CACHE_NAME, 50);
        await limitCacheSize(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_CACHE_SIZE);
        
        // Clean up old caches
        await cleanupOldCaches(CACHE_NAME);
        
        console.log('Service Worker: Periodic cleanup completed');
    } catch (error) {
        console.error('Service Worker: Periodic cleanup failed:', error);
    }
}

// Log service worker registration
console.log('Service Worker: Loaded successfully');