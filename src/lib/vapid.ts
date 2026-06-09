// Public VAPID key — safe to ship in the client.
export const VAPID_PUBLIC_KEY =
  "BDaXu0DgYEmIK-NFLDg3DiXzzFJmqGHcjx0aRIXPv_dE5T0FZ2w0sjYIlUfuqPAEm0j9ASRBoJiOsU2Z1ie4l5k";

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
