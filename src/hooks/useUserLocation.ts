import { useCallback, useEffect, useState } from "react";
import type { LatLng } from "@/lib/geo";

type Status = "idle" | "locating" | "granted" | "denied" | "unsupported";

/**
 * Browser geolocation for the "you are here" dot and plan distances. Nothing is
 * requested until `locate()` is called or a previous grant is detected, so the
 * page never fires an unprompted permission dialog on load.
 */
export const useUserLocation = () => {
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;
  const [position, setPosition] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<Status>(supported ? "idle" : "unsupported");

  const locate = useCallback(() => {
    if (!supported) return;
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lng: coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, [supported]);

  // If permission was granted earlier, pick the fix up without prompting again.
  useEffect(() => {
    if (!supported || !navigator.permissions?.query) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (!cancelled && result.state === "granted") locate();
      })
      .catch(() => { /* Permissions API unavailable — wait for an explicit tap */ });
    return () => { cancelled = true; };
  }, [supported, locate]);

  return { position, status, locate, supported };
};
