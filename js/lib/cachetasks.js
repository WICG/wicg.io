/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
/*globals async, caches, fetch, Response, Request, self*/
/*exported CacheTasks */

"use strict";
(function(exports) {
  /**
   * Collection of common task performed by a Service Worker cache.
   */
  const openedCaches = new Map();
  const memoizedCaches = {
    open: async(function*(cacheName) {
      if (openedCaches.has(cacheName)) {
        return openedCaches.get(cacheName);
      }
      var cache = yield caches.open(cacheName);
      openedCaches.set(cacheName, cache);
      return cache;
    })
  };

  const CacheTasks = {
    /**
     * Populates the a cache with a list of requests.
     *
     * @param {String} cacheName The name of the cache.
     * @param {Array} requests The requests (URLs or Requests) to cache.
     */
    populateCache: async(function* (cacheName, requests) {
      var cache = yield memoizedCaches.open(cacheName);
      var success = true;
      try {
        yield cache.addAll(requests);
      } catch (err) {
        var msg = `Error adding resources to cache ${cacheName}.`;
        console.warn(msg, err);
        success = false;
      }
      return success;
    }),
    /**
     * Saves a binary file into a cache.
     *
     * @param {String} cacheName The name of the cache to save into.
     * @param {ArrayBuffer} arrayBuffer The arrayBuffer holding the file's data.
     * @param {String} type MimeType of the data being stored.
     * @param {String|URL} requestURL The URL this request maps to.
     */
    saveBinaryToCache: async(function* (cacheName, arrayBuffer, type, requestURL) {
      var cache = yield memoizedCaches.open(cacheName);
      var blob = new Blob([arrayBuffer], {
        type
      });
      var responseInit = {
        headers: {
          "Content-Type": type,
        }
      };
      var request = new Request(requestURL);
      var response = new Response(blob, responseInit);
      try {
        yield cache.put(request, response);
      } catch (err) {
        var msg = `putting blob in cache ${cacheName} for ${requestURL}.`;
        console.warn(msg, err);
        throw err;
      }
    }),
    /**
     * Respond to a request from the SW's caches.
     *
     * @param {Request|String} request The request
     * @param {String} [cacheName] The name of the cache to look in.
     * @param {String} [strategy] The strategy to use when the response
     *                              is not found. "throw" causes this to throw
     *                              otherwise, it passes the request to the
     *                              network via fetch.
     */
    respondFromCache: async(function* (request, cacheName, strategy = "") {
      var cache = yield memoizedCaches.open(cacheName);
      var url = request.url || request;
      var response = yield cache.match(request);
      var msg = "";
      if (response) {
        return response;
      }
      switch (strategy) {
      case "throw":
        msg = `Not found in ${cacheName} cache: ${url}`;
        var error = new Error(msg);
        console.warn(error);
        throw error;
      case "store":
        try {
          response = yield fetch(request);
          yield cache.put(request, response.clone());
        } catch (err) {
          var msg = `failed to store ${url} in ${cacheName}.`;
          console.warn(msg, err);
          throw err;
        }
        break;
      //Default passes the request to network using fetch()
      default:
        msg = `Not in cache ${cacheName}. Fetching but not storing: ${url}`;
        console.warn(msg);
        response = yield fetch(request);
        break;
      }
      return response;
    }),
    /**
     * Checks if there is a cache entry for a particular request.
     *
     * @param {Request|String} request The request to check for.
     * @param {String} [cacheName] The cache's name to look in.
     * @return {Boolean} True if it has the request, false otherwise.
     */
    hasCacheEntry: async(function* (request, cacheName) {
      var cache = yield memoizedCaches.open(cacheName);
      var response = yield cache.match(request);
      return (response) ? true : false;
    }),
    /**
     * Deletes a cache entry.
     *
     * @param {Request[]|String[]} request The request.
     * @param {String} cacheName The cache name from where to delete.
     * @returns {Boolean}
     */
    deleteCacheEntry: async(function* (request, cacheName, options={}) {
      var cache = yield memoizedCaches.open(cacheName);
      var result = yield cache.delete(request, options);
      return result;
    }),
    /**
     * Delete all the SW's caches.
     *
     * @returns {Map<String,Boolean>} A map representing the keys and the result
     *                                of deleting the cache.
     */
    deleteAllCaches: async(function* () {
      var keys = yield caches.keys();
      var promises = keys.map(key => caches.delete(key));
      var results = yield Promise.all(promises);
      var keyResult = new Map();
      keys.forEach((key, index) => keyResult.set(key, results[index]));
      return keyResult;
    }),
  };
  exports.CacheTasks = CacheTasks;
}(self));
