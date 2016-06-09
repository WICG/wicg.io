/*globals async, caches, siteFiles, Response, fetch */
"use strict";

// Let's start bringing in things we need
importScripts("js/lib/async.js");
importScripts("js/siteFiles.js");

// Set up Service Worker tasks
const SWTasks = {
  deleteAllCaches: async(function*() {
    const keys = yield caches.keys();
    const promisesToDelete = keys.map(
      key => caches.delete(key)
    );
    yield Promise.all(promisesToDelete);
  }),
  cacheSite: async(function*(siteFiles) {
    console.log("Trying to offline site");
    try {
      const cache = yield caches.open("site_cache");
      yield cache.addAll(siteFiles);
    } catch (err) {
      console.error(err);
    }
    console.log("Done caching site files!", siteFiles.join("\n"));
  }),
  respondFromCache: async(function*(request, cacheName) {
    const cache = yield caches.open(cacheName);
    const response = yield cache.match(request);
    // We have this, yay!
    if (response) {
      return response;
    }
    // Try to get it from the network and store it
    try {
      console.warn("Not in cache. Getting from network:", request.url || request);
      response = yield fetch(request);
      yield cache.put(request, response.clone());
    } catch (err) {
      var msg = `failed to store ${request.url || request} in ${cacheName}.`;
      console.warn(msg, err);
      // ensure a response
      response = new Response();
    }
    return response;
  }),
  saveToCache: async(function*(request, response, cacheName) {
    const cache = yield caches.open(cacheName);
    yield cache.put(request, response.clone());
  }),
};

// Let's set up life cycle listeners ("install", "activate", "fetch")
self.addEventListener("install", async(function*() {
  yield SWTasks.deleteAllCaches();
  yield SWTasks.cacheSite(siteFiles);
  console.log("Successfully completed install tasks...");
}));

self.addEventListener("fetch", function(ev) {
  console.info("Handling", ev.request.url, "going to network first...");
  const networkFirst = async(function*() {
    let response;
    try {
      response = yield fetch(ev.request);
      if (!response.ok) {
        throw new Error("Got response, but was not ok!", response.status);
      }
    } catch (err) {
      console.error("Useless response, going to cache:", err);
      return yield SWTasks.respondFromCache(ev.request, "site_cache");
    }
    // Response was ok, so let's cache it!
    try {
      yield SWTasks.saveToCache(ev.request, response, "site_cache");
    } catch (err) {
      console.error("Oh crap! Wasn't able to write to cache!", err);
    }
    return response;
  });
  ev.respondWith(networkFirst());
});
