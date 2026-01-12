/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
// service-worker.js

// Define the target URL that we want to intercept and proxy.
const TARGET_URL_PREFIX = 'https://generativelanguage.googleapis.com';

// Installation event:
self.addEventListener('install', (event) => {
  try {
    console.log('Service Worker: Installing...');
    event.waitUntil(self.skipWaiting());
  } catch (error) {
    console.error('Service Worker: Error during install event:', error);
    // If skipWaiting fails, the new SW might get stuck in a waiting state.
  }
});

// Activation event:
self.addEventListener('activate', (event) => {
  try {
    console.log('Service Worker: Activating...');
    event.waitUntil(self.clients.claim());
  } catch (error) {
    console.error('Service Worker: Error during activate event:', error);
    // If clients.claim() fails, the SW might not control existing pages until next nav.
  }
});

// Fetch event: Pass through all requests without interception
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
