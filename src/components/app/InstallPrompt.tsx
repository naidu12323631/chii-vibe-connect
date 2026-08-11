import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatform } from "@/hooks/usePlatform";

const DISMISSED_KEY = "milo:install-dismissed";

/** Chrome/Edge/Android fire this so the page can trigger the install itself. */
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const wasDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * "Add milo to your home screen" banner, shown only in a mobile browser — never
 * when already installed or inside the native shell. Android installs in one tap
 * via beforeinstallprompt; iOS has no such API, so it gets the Share-sheet steps.
 */
const InstallPrompt = () => {
  const { installed, ios } = usePlatform();
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      // Keep the event so the banner can trigger it on a real user gesture.
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setDismissed(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch { /* ignore */ }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    close();
  };

  // Nothing to offer: already an app, dismissed, or a desktop browser with no prompt.
  if (installed || dismissed) return null;
  const canPrompt = !!deferred;
  if (!canPrompt && !ios) return null;

  return (
    <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-3 lg:hidden">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Download className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold">Install milo</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Add it to your home screen for full-screen, app-like access.
          </p>

          {showIosHelp && (
            <ol className="mt-2 space-y-1 text-[13px] text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Share className="h-3.5 w-3.5 shrink-0 text-primary" /> 1. Tap Share in Safari
              </li>
              <li className="flex items-center gap-1.5">
                <SquarePlus className="h-3.5 w-3.5 shrink-0 text-primary" /> 2. Choose “Add to Home Screen”
              </li>
            </ol>
          )}

          <div className="mt-2.5 flex gap-2">
            {canPrompt ? (
              <Button variant="gradient" size="sm" onClick={install}>Install</Button>
            ) : (
              <Button variant="gradient" size="sm" onClick={() => setShowIosHelp((v) => !v)}>
                {showIosHelp ? "Got it" : "How?"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={close}>Not now</Button>
          </div>
        </div>
        <button
          onClick={close}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
