import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register the service worker so the app shell works offline and push keeps
// working. Skipped in dev (the worker would cache Vite's module graph) and in
// Capacitor's native shell, where assets are already local.
const isNative = window.location.protocol === "capacitor:" || !!(window as { Capacitor?: unknown }).Capacitor;

if (import.meta.env.PROD && !isNative && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("[pwa] service worker registration failed:", err);
    });
  });
}
