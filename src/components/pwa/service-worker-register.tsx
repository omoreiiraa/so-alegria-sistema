"use client";

import { useEffect } from "react";

/** Registra o service worker para tornar o app instalável (PWA). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* silencioso — o app funciona sem o SW */
      });
    }
  }, []);
  return null;
}
