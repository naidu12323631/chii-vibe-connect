import { useEffect, useMemo, useState } from "react";
import type { LatLng } from "@/lib/geo";

// Turns the free-text `location` on a plan into coordinates using OpenStreetMap's
// Nominatim service — no API key required. Results are cached in localStorage
// (including misses) because Nominatim's usage policy allows roughly one request
// per second, so we queue lookups and never repeat one.
const CACHE_KEY = "milo:geocode";
const REQUEST_GAP_MS = 1100;

type CacheEntry = LatLng | null;

const loadCache = (): Record<string, CacheEntry> => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const cache: Record<string, CacheEntry> = loadCache();

const persist = () => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* storage blocked — the in-memory cache still works this session */ }
};

const normalise = (query: string) => query.trim().toLowerCase().replace(/\s+/g, " ");

// One shared queue keeps us inside Nominatim's rate limit no matter how many
// components ask for lookups.
let chain: Promise<void> = Promise.resolve();
const inFlight = new Map<string, Promise<CacheEntry>>();

const fetchCoords = async (query: string): Promise<CacheEntry> => {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const body = (await res.json()) as { lat?: string; lon?: string }[];
    const hit = body?.[0];
    if (!hit?.lat || !hit?.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null; // offline or blocked — treated as "unknown place"
  }
};

/** Look a place up, going through the shared cache and rate-limited queue. */
export const geocode = (rawQuery: string): Promise<CacheEntry> => {
  const key = normalise(rawQuery);
  if (!key) return Promise.resolve(null);
  if (key in cache) return Promise.resolve(cache[key]);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = new Promise<CacheEntry>((resolve) => {
    chain = chain.then(async () => {
      const result = await fetchCoords(key);
      cache[key] = result;
      persist();
      inFlight.delete(key);
      resolve(result);
      await new Promise((r) => setTimeout(r, REQUEST_GAP_MS));
    });
  });
  inFlight.set(key, promise);
  return promise;
};

/**
 * Resolves every distinct location string to coordinates, returning a map keyed
 * by the lower-cased location. Cached places appear on first render; the rest
 * stream in as the queue drains.
 */
export const useGeocodedLocations = (locations: string[]) => {
  const keys = useMemo(
    () => [...new Set(locations.map(normalise).filter(Boolean))],
    [locations],
  );
  const keyList = keys.join("|");

  const [coords, setCoords] = useState<Record<string, LatLng>>(() => {
    const seeded: Record<string, LatLng> = {};
    for (const key of keys) {
      const cached = cache[key];
      if (cached) seeded[key] = cached;
    }
    return seeded;
  });
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let active = true;
    const todo = keys.filter((key) => !(key in cache));
    setPending(todo.length);

    // Show anything already cached straight away.
    setCoords((current) => {
      const next = { ...current };
      let changed = false;
      for (const key of keys) {
        const cached = cache[key];
        if (cached && !next[key]) { next[key] = cached; changed = true; }
      }
      return changed ? next : current;
    });

    for (const key of todo) {
      geocode(key).then((result) => {
        if (!active) return;
        setPending((n) => Math.max(0, n - 1));
        if (result) setCoords((current) => ({ ...current, [key]: result }));
      });
    }

    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyList]);

  return { coords, pending, lookup: (location?: string | null) => (location ? coords[normalise(location)] : undefined) };
};
