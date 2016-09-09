/*globals self, async, caches, fetch */
"use strict";
self.importScripts("./js/lib/async.js");

const SITE_CACHE = "site-v1";

self.addEventListener("install", (ev) => {
  const resources = [
    "./",
    "./images/code@1x.jpg",
    "./images/document.svg",
    "./images/github.svg",
    "./images/irc.svg",
    "./images/link.svg",
    "./images/logo.svg",
    "./images/twitter_white.svg",
    "./images/w3c_white.svg",
    "./js/accordion.js",
    "./js/lib/async.js",
    "./manifest.json",
    "./styles/fonts/nexa/Nexa_Bold.otf",
    "./styles/style.css",
  ];
  ev.waitUntil(async.task(function*() {
    const cache = yield caches.open(SITE_CACHE);
    yield cache.addAll(resources);
  }));
});

self.addEventListener("activate", () => {
  async.task(function*() {
    const keys = yield caches.keys();
    yield keys
      .filter(key => key !== SITE_CACHE)
      .map(key => caches.delete(key));
  });
});

self.addEventListener("message", ({ data: { action } }) => {
  switch (action) {
    case "skipWaiting":
      self.skipWaiting();
      break;
  }
});

self.addEventListener("fetch", (ev) => {
  ev.respondWith(async.task(function*() {
    const response = yield caches.match(ev.request);
    if (response) {
      return response;
    }
    console.warn("No caches match for?:", ev.request.url);
    // go to network instead
    try {
      const netResponse = yield fetch(ev.request);
      if (netResponse.ok) {
        return netResponse;
      }
    } catch (err) {
      // just return the index if all goes bad.
      console.error(err);
    }
    return yield caches.match("/");
  }));
});
