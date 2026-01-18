/**
 * Service Worker Registration Utility
 *
 * Handles SW registration, updates, and lifecycle events
 */

type SWUpdateCallback = () => void;

interface RegisterSWOptions {
  onUpdate?: SWUpdateCallback;
  onSuccess?: SWUpdateCallback;
  onOffline?: () => void;
  onOnline?: () => void;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register the service worker
 */
export async function registerSW(options: RegisterSWOptions = {}): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    console.log("[registerSW] Service Worker not supported");
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[registerSW] Skipping Service Worker registration in development");
    return;
  }

  try {
    // Wait for window load to not block initial render
    if (document.readyState !== "complete") {
      await new Promise<void>((resolve) => {
        window.addEventListener("load", () => resolve());
      });
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    swRegistration = registration;
    console.log("[registerSW] Service Worker registered:", registration.scope);

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;

      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // New service worker available
          console.log("[registerSW] New service worker available");
          options.onUpdate?.();
        } else if (newWorker.state === "activated") {
          // First time install
          console.log("[registerSW] Service worker activated");
          options.onSuccess?.();
        }
      });
    });

    // Handle controller change (when skipWaiting is called)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      console.log("[registerSW] Controller changed, reloading...");
      window.location.reload();
    });

    // Check for updates periodically (every hour)
    setInterval(
      () => {
        registration.update();
      },
      60 * 60 * 1000
    );
  } catch (error) {
    console.error("[registerSW] Registration failed:", error);
  }

  // Setup online/offline listeners
  if (options.onOffline || options.onOnline) {
    window.addEventListener("online", () => {
      console.log("[registerSW] Online");
      options.onOnline?.();
    });

    window.addEventListener("offline", () => {
      console.log("[registerSW] Offline");
      options.onOffline?.();
    });
  }
}

/**
 * Unregister all service workers
 */
export async function unregisterSW(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();

  for (const registration of registrations) {
    await registration.unregister();
  }

  console.log("[unregisterSW] All service workers unregistered");
}

/**
 * Skip waiting and activate new service worker immediately
 */
export function skipWaiting(): void {
  if (!swRegistration?.waiting) {
    console.log("[skipWaiting] No waiting service worker");
    return;
  }

  swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
}

/**
 * Clear all service worker caches
 */
export async function clearSWCache(): Promise<void> {
  if (!("caches" in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.filter((name) => name.startsWith("syntropy-")).map((name) => caches.delete(name))
  );

  console.log("[clearSWCache] All Syntropy caches cleared");
}

/**
 * Request persistent storage permission
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    console.log("[requestPersistentStorage] Not supported");
    return false;
  }

  const isPersisted = await navigator.storage.persist();
  console.log("[requestPersistentStorage] Persisted:", isPersisted);
  return isPersisted;
}

/**
 * Get storage usage estimate
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) {
    return null;
  }

  const estimate = await navigator.storage.estimate();
  return {
    usage: estimate.usage || 0,
    quota: estimate.quota || 0,
  };
}

/**
 * Check if running as installed PWA
 */
export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;

  // Check display-mode
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  // Check iOS Safari
  // @ts-expect-error - iOS Safari specific property
  const isIOSStandalone = window.navigator.standalone === true;

  return isStandalone || isIOSStandalone;
}

/**
 * Get current online status
 */
export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}
