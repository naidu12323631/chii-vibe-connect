import type { CapacitorConfig } from "@capacitor/cli";

// Native Android/iOS shells around the same Vite build that serves the web app.
//
//   npm run build && npx cap sync
//   npx cap open android      (Android Studio)
//   npx cap open ios          (Xcode — macOS only)
const config: CapacitorConfig = {
  appId: "app.milo.social",
  appName: "milo",
  webDir: "dist",
  // Serve over https://localhost so the Web Crypto and geolocation APIs the app
  // relies on are treated as a secure context.
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: "#673ddc",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashImmersive: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#673ddc",
    },
    Keyboard: {
      // Pushes the layout up instead of covering inputs with the keyboard.
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
  android: {
    // Debug builds talk to Supabase over TLS; no cleartext needed.
    allowMixedContent: false,
  },
  ios: {
    contentInset: "always",
  },
};

export default config;
