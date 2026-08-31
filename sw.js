/* Service Worker para INVENTARIOUGELCHURCAMPA - permite instalación y uso offline */
"use strict";

var CACHE_NAME = "inventario-ugel-churcampa-v5";
var CORE_URLS = [
  "./",
  "./index.html",
  "./upload.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./instituciones.js",
  "./mapeo_sbn.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./logo.png",
  "./logo ugel churcampa.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request).then(function (response) {
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, clone);
        });
      }
      return response;
    }).catch(function () {
      return caches.match(request).then(function (cached) {
        return cached || caches.match("./index.html");
      });
    })
  );
});
