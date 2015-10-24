/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * This is an approximate implementation of ES7's async-await pattern.
 * see: https://github.com/tc39/ecmascript-asyncawait
 *
 * It allows for simple creation of async function and "tasks".
 *
 * For example:
 *
 *  var myThinger = {
 *    doAsynThing: async(function*(url){
 *      var result = yield fetch(url);
 *      return process(result);
 *    });
 * }
 *
 * And Task-like things can be created as follows:
 *
 * var myTask = async(function*{
 *   var result = yield fetch(url);
 *   return result;
 * });
 * //returns a promise
 *
 * myTask().then(doSomethingElse);
 *
 */

(function(exports) {
  "use strict";
  function async(func, self) {
    return function asyncFunction() {
      var args = Array.from(arguments);
      return new Promise(function(resolve, reject) {
        var gen;
        if (typeof func !== "function") {
          reject(new TypeError("Expected a Function."));
        }
        //not a generator, wrap it.
        if (func.constructor.name !== "GeneratorFunction") {
          gen = (function*() {
            return func.call(self, ...args);
          }());
        } else {
          gen = func.call(self, ...args);
        }
        try {
          step(gen.next(undefined));
        } catch (err) {
          console.warn("The generator threw immediately.", err);
          reject(err);
        }

        function step(next) {
          const value = next.value;
          if (next.done) {
            return resolve(value);
          }
          if (value instanceof Promise) {
            return value.then(
              result => step(gen.next(result)),
              error => {
                try {
                  step(gen.throw(error));
                } catch (err) {
                  throw err;
                }
              }
            ).catch((err) => {
              console.warn("Unhandled error in async function.", err);
              reject(err);
            });
          }
          step(gen.next(value));
        }
      });
    };
  }
  exports.async = async;
}(this || self));
