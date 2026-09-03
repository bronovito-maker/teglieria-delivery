"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {});
        });
      });
      if ("caches" in window) {
        caches.keys().then((keys) => keys.forEach((key) => caches.delete(key))).catch(() => {});
      }
      return;
    }

    const register = async () => {
      try {
        // Evita che Safari/Chrome mobile riutilizzi una versione vecchia del
        // service worker che conteneva pagine di login nella cache.
        await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    };

    register();
  }, []);

  return null;
}
