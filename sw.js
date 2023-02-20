/*globals self, async, caches, fetch */
"use strict";

const SITE_CACHE = "site-v12";

self.addEventListener("install", ev => {
  ev.waitUntil(cacheIsPopulated());
});

async function cacheIsPopulated() {
  const resources = [
    "./",
    "./images/code@1x.jpg",
    "./images/github.svg",
    "./images/logo.png",
    "./images/logo.svg",
    "./images/twitter_white.svg",
    "./images/w3c_white.svg",
    "./js/lib/hyperhtml.js",
    "./manifest.json",
    "./styles/fonts/nexa/Nexa_Bold.otf",
    "./styles/style.css",
    "./data/active.json",
    "./data/archived.json",
  ];
  const cache = await caches.open(SITE_CACHE);
  await cache.addAll(resources);
}

self.addEventListener("activate", async () => {
  const keys = await caches.keys();
  await keys.filter(key => key !== SITE_CACHE).map(key => caches.delete(key));
});

self.addEventListener("message", ({ data: { action } }) => {
  switch (action) {
    case "skipWaiting":
      self.skipWaiting();
      break;
  }
});

self.addEventListener("fetch", ev => {
  ev.respondWith(aCachedResponse(ev));
});

async function aCachedResponse(ev) {
  const response = await caches.match(ev.request);
  if (response) {
    return response;
  }
  console.warn("No caches match for?:", ev.request.url);
  // go to network instead
  try {
    const netResponse = await fetch(ev.request);
    if (netResponse.ok) {
      return netResponse;
    }
  } catch (err) {
    // just return the index if all goes bad.
    console.error(err);
  }
  return await caches.match("/");
}
