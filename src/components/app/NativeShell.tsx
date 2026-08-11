import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlatform } from "@/hooks/usePlatform";

// Roots where the Android hardware back button should exit rather than navigate.
const ROOT_PATHS = ["/app", "/plans", "/explore", "/maps", "/chats", "/profile", "/"];

/**
 * Applies native-only chrome inside the Capacitor shell: brand status bar, hide
 * the splash once React has painted, and make Android's back button behave.
 *
 * The Capacitor plugins are imported lazily so the web bundle doesn't pull them
 * in, and every call is guarded — on the web this component renders nothing and
 * does nothing.
 */
const NativeShell = () => {
  const { native } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!native) return;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
          import("@capacitor/status-bar"),
          import("@capacitor/splash-screen"),
          import("@capacitor/app"),
        ]);

        await StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        // Android only; throws on iOS, which has no settable bar colour.
        await StatusBar.setBackgroundColor({ color: "#673ddc" }).catch(() => {});
        await SplashScreen.hide().catch(() => {});

        const handler = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack && !ROOT_PATHS.includes(window.location.pathname)) {
            navigate(-1);
          } else {
            App.exitApp();
          }
        });
        cleanup = () => { handler.remove(); };
      } catch (err) {
        console.warn("[native] shell setup skipped:", err);
      }
    })();

    return () => cleanup?.();
  }, [native, navigate]);

  // Native webviews keep the scroll position across route changes.
  useEffect(() => {
    if (native) window.scrollTo(0, 0);
  }, [native, location.pathname]);

  return null;
};

export default NativeShell;
