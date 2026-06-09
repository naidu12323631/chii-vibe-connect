import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/vapid";

type PushStatus = "unsupported" | "default" | "granted" | "denied";

const isPreviewHost = () => {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h.startsWith("id-preview--") ||
    h.startsWith("preview--") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovableproject-dev.com") ||
    h.endsWith(".beta.lovable.dev")
  );
};

const supported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported()) { setStatus("unsupported"); return; }
    setStatus(Notification.permission as PushStatus);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => { /* ignore */ });
  }, [user]);

  const register = useCallback(async () => {
    if (!supported()) return null;
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);

  const enable = useCallback(async () => {
    if (!user) { toast.error("Sign in first"); return; }
    if (!supported()) { toast.error("Push isn't supported in this browser"); return; }
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm as PushStatus);
      if (perm !== "granted") {
        toast.error("Notifications were blocked");
        return;
      }
      const reg = await register();
      if (!reg) return;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        toast.error("Couldn't read subscription");
        return;
      }
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" },
      );
      if (error) { toast.error(error.message); return; }
      setSubscribed(true);
      toast.success("Push notifications enabled");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to enable push");
    } finally {
      setBusy(false);
    }
  }, [user, register]);

  const disable = useCallback(async () => {
    if (!supported()) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to disable push");
    } finally {
      setBusy(false);
    }
  }, []);

  // Auto-register the SW (for foreground notifications click handling) when supported,
  // outside Lovable preview iframes to avoid noise.
  useEffect(() => {
    if (!supported() || isPreviewHost()) return;
    register().catch(() => { /* ignore */ });
  }, [register]);

  return { status, subscribed, busy, enable, disable, supported: supported() };
};
