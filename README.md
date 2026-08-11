# milo

Meet people nearby: post a hangout, join one happening near you, chat, and see
plans on a map.

One codebase ships three ways:

| Target | What it is | How to run |
| --- | --- | --- |
| Desktop web | Responsive React app with a sidebar layout | `npm run dev` |
| Mobile web / PWA | Installable to the home screen on Android + iOS, runs full-screen offline-capable | Install from the browser |
| Android / iOS | Capacitor native shells around the same build | `npm run cap:android` / `npm run cap:ios` |

## Getting started

```bash
npm install
cp .env.example .env      # fill in your Supabase project values
npm run dev
```

### Database

Migrations live in `supabase/migrations` and are applied by hand: open the
Supabase Dashboard → SQL Editor and run them **in filename order**. Each one is
idempotent, so re-running is safe.

Pending ones worth knowing about:

- `0009_plan_cover.sql` — cover images on plans + the `covers` storage bucket
- `0010_post_likes.sql` — likes on photo posts
- `0011_profile_links.sql` — usernames, location, social links, profile visibility

The app degrades gracefully if a migration hasn't been run: the affected control
is hidden or explains which file to run, rather than erroring.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm test` | Vitest suite |
| `npm run lint` | ESLint |
| `npm run icons` | Regenerate app icons from the brand colour + wordmark |
| `npm run cap:sync` | Build, then copy the web build into the native projects |
| `npm run cap:android` | Sync and open Android Studio |
| `npm run cap:ios` | Sync and open Xcode (macOS only) |

## PWA

`public/manifest.webmanifest` plus `public/sw.js` make the web app installable.

- **Launch target** — installed launches start at `/app` and skip the marketing
  page; a plain browser visit still gets the landing page (and so do crawlers).
- **Offline** — the service worker keeps the app shell and hashed assets cached,
  so the app opens offline and shows the last loaded plans with an offline
  banner. Supabase requests are never cached, so data is never served stale.
- **Icons** — `npm run icons` regenerates every size from an inline SVG in
  `scripts/generate-icons.mjs`. Change `BRAND` there and re-run.
- **Cache busting** — bump `CACHE_VERSION` in `public/sw.js` when you want
  clients to drop their old caches.

## Native apps (Capacitor)

`capacitor.config.ts` holds the app id (`app.milo.social`), splash screen and
status-bar config. The web build in `dist/` is copied into the native project by
`cap sync`.

### Android

The `android/` project is committed and ready:

```bash
npm run cap:android     # build + sync + open Android Studio
```

Build a release AAB from Android Studio (Build → Generate Signed Bundle) with
your own keystore.

### iOS

The `ios/` project is **not** generated yet — it needs macOS, because CocoaPods
can't run on Windows. On a Mac:

```bash
npm run cap:add:ios     # npx cap add ios
npm run cap:ios         # build + sync + open Xcode
```

Then set your signing team in Xcode and archive.

### Known native caveat: Google sign-in

Email/password auth works in the native shells. **Google OAuth does not yet** —
it redirects to `window.location.origin`, which inside Capacitor is
`https://localhost` rather than a real URL. Making it work needs a custom scheme
deep link registered in both native projects, `@capacitor/browser` to host the
flow, and that redirect URL added to the Supabase Auth allow-list. Until then,
hide or skip the Google button in native builds.

## Layout of the app

- `src/pages` — routed screens. `Home`, `Explore`, `MapsPage`, `Chats` and
  `Profile` render inside `AppShell`; the landing, auth, plan detail and video
  chat pages have their own layouts.
- `src/components/app` — the signed-in app shell (sidebar, bottom tab bar,
  create-plan wizard) and its cards.
- `src/hooks` — `usePlans` and `usePresence` load the plan feed and presence once
  for the whole shell; `useLocalPrefs` holds device-local prefs (saved plans and
  posts, home city); `usePlatform` reports standalone/native/online state.
- `src/lib` — pure helpers (plan metadata and filtering, geo maths, profile field
  normalising). These are where the test suite is focused.
