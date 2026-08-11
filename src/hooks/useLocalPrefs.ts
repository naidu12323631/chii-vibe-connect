import { useCallback, useSyncExternalStore } from "react";

// Small localStorage-backed preferences. Saved plans and the "your city" value
// are device-local on purpose — neither needs a schema change to work.
//
// State lives in a module-level store rather than per-component useState, so
// bookmarking a plan on one card immediately updates every other card and the
// "Saved" filter on Explore.
const SAVED_KEY = "milo:saved-plans";
const SAVED_POSTS_KEY = "milo:saved-posts";
const CITY_KEY = "milo:home-city";

const hasStorage = typeof window !== "undefined";

const readIdSet = (key: string): Set<string> => {
  if (!hasStorage) return new Set();
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : []);
  } catch {
    return new Set();
  }
};

const readSaved = () => readIdSet(SAVED_KEY);
const readSavedPosts = () => readIdSet(SAVED_POSTS_KEY);

const readCity = (): string => {
  if (!hasStorage) return "";
  try {
    return localStorage.getItem(CITY_KEY) ?? "";
  } catch {
    return "";
  }
};

// Snapshots are cached so useSyncExternalStore sees stable references.
let savedSnapshot = readSaved();
let savedPostsSnapshot = readSavedPosts();
let citySnapshot = readCity();

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

// Mirror changes made in other tabs.
if (hasStorage) {
  window.addEventListener("storage", (e) => {
    if (e.key === SAVED_KEY) { savedSnapshot = readSaved(); emit(); }
    if (e.key === SAVED_POSTS_KEY) { savedPostsSnapshot = readSavedPosts(); emit(); }
    if (e.key === CITY_KEY) { citySnapshot = readCity(); emit(); }
  });
}

const writeIdSet = (key: string, ids: Set<string>) => {
  try {
    localStorage.setItem(key, JSON.stringify([...ids]));
  } catch { /* storage full or blocked — keep the in-memory state */ }
};

/** Bookmarked plan ids, persisted per device and shared across components. */
export const useSavedPlans = () => {
  const saved = useSyncExternalStore(subscribe, () => savedSnapshot, () => savedSnapshot);

  const toggleSaved = useCallback((id: string) => {
    const next = new Set(savedSnapshot);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    savedSnapshot = next;
    writeIdSet(SAVED_KEY, next);
    emit();
  }, []);

  return { saved, toggleSaved, isSaved: (id: string) => saved.has(id) };
};

/** Bookmarked post ids — the same device-local treatment as saved plans. */
export const useSavedPosts = () => {
  const savedPosts = useSyncExternalStore(subscribe, () => savedPostsSnapshot, () => savedPostsSnapshot);

  const toggleSavedPost = useCallback((id: string) => {
    const next = new Set(savedPostsSnapshot);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    savedPostsSnapshot = next;
    writeIdSet(SAVED_POSTS_KEY, next);
    emit();
  }, []);

  return { savedPosts, toggleSavedPost, isPostSaved: (id: string) => savedPosts.has(id) };
};

/** The city used by the "Nearby" filter. */
export const useHomeCity = () => {
  const city = useSyncExternalStore(subscribe, () => citySnapshot, () => citySnapshot);

  const setCity = useCallback((next: string) => {
    citySnapshot = next;
    try {
      if (next.trim()) localStorage.setItem(CITY_KEY, next.trim());
      else localStorage.removeItem(CITY_KEY);
    } catch { /* ignore */ }
    emit();
  }, []);

  return { city, setCity };
};
