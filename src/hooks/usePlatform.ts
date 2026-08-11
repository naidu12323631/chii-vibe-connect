import { useEffect, useState } from "react";

// How the app is being run. Drives the app-like chrome: standalone launches skip
// the marketing page, and the install prompt only shows in a mobile browser.
const query = "(display-mode: standalone), (display-mode: minimal-ui), (display-mode: fullscreen)";

const readStandalone = () => {
  if (typeof window === "undefined") return false;
  // navigator.standalone is the iOS Safari home-screen flag.
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.(query).matches === true;
};

const readNative = () =>
  typeof window !== "undefined" &&
  (window.location.protocol === "capacitor:" || !!(window as { Capacitor?: unknown }).Capacitor);

export const isIos = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as a Mac, but with touch points.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/**
 * `standalone` — launched from the home screen or installed as an app.
 * `native`     — running inside the Capacitor Android/iOS shell.
 * `installed`  — either of the above, i.e. not a plain browser tab.
 */
export const usePlatform = () => {
  const [standalone, setStandalone] = useState(readStandalone);
  const native = readNative();

  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const update = () => setStandalone(readStandalone());
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return { standalone, native, installed: standalone || native, ios: isIos() };
};

/** Tracks connectivity so the app can say it's offline instead of failing quietly. */
export const useOnline = () => {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
};
