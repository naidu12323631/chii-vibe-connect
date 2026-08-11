// Shared display helpers for plans: relative times, date-window filters, and
// the "vibe" category that drives tags, chips, cover art and the vibe cards.
import {
  BookOpen, Coffee, Dices, Dumbbell, Mountain, Music, PartyPopper, Sparkles,
  UtensilsCrossed, type LucideIcon,
} from "lucide-react";

// "just now", "5m ago", "3h ago", "2d ago"
export const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// Is the plan happening within the next 24 hours?
export const isSoon = (iso: string | null) => {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
};

// Same calendar day as today (local time).
export const isToday = (iso: string | null) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

// Between now and 7 days out.
export const isThisWeek = (iso: string | null) => {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > -60 * 60 * 1000 && diff < 7 * 24 * 60 * 60 * 1000;
};

export const isUpcoming = (iso: string | null) => !!iso && new Date(iso).getTime() > Date.now();

export const formatPlanTime = (iso: string) =>
  new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Today, 4:00 PM" · "Tomorrow, 6:00 PM" · "Sat, 4:00 PM" · "12 Aug, 4:00 PM" */
export const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (sameDay(d, now)) return `Today, ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow, ${time}`;

  const withinAWeek = d.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 && d.getTime() > now.getTime();
  if (withinAWeek) return `${d.toLocaleDateString([], { weekday: "short" })}, ${time}`;
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })}, ${time}`;
};

/** Google Maps link for a plan — its own link when set, else a place search. */
export const mapsLinkFor = (plan: { maps_url?: string | null; location?: string | null }) => {
  if (plan.maps_url) return plan.maps_url;
  if (plan.location) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plan.location)}`;
  }
  return null;
};

/** "Starting in 1h 48m" · "Starting in 3d" · "Happening now" · "Already happened" */
export const startsInLabel = (iso: string) => {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (mins < -180) return "Already happened";
  if (mins <= 0) return "Happening now";
  if (mins < 60) return `Starting in ${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `Starting in ${h}h${mins % 60 ? ` ${mins % 60}m` : ""}`;
  const d = Math.floor(h / 24);
  return `Starting in ${d}d${h % 24 ? ` ${h % 24}h` : ""}`;
};

/** How full a plan is, as a percentage — the "heat" signal on trending cards. */
export const fillPercent = (plan: { participants: unknown[]; max_participants: number }) =>
  Math.min(100, Math.round((plan.participants.length / Math.max(1, plan.max_participants)) * 100));

// ------------------------------------------------------------------ categories
// Plans have no category column, so the vibe is inferred from the title +
// description. One category drives: the pill on a plan card, the chips on
// Explore, the gradient cover art, and the "Browse by vibe" cards.
export type Category = {
  key: string;
  /** Chip / pill label. */
  label: string;
  /** Heading on the "Browse by vibe" card. */
  cardTitle: string;
  /** Supporting line on the vibe card. */
  blurb: string;
  icon: LucideIcon;
  /** Icon colour on chips and vibe cards. */
  iconClass: string;
  /** Gradient used when there's no cover photo. */
  cover: string;
  /** Pastel background for the vibe card. */
  tint: string;
  /** Colour set for map pins: card surface, solid badge, and text accent. */
  palette: { card: string; solid: string; text: string; dot: string };
  keywords: string[];
};

// Display order — matches the chip row in the design.
export const CATEGORIES: Category[] = [
  {
    key: "fun", label: "Fun", cardTitle: "Fun Times", blurb: "Fun activities & games",
    icon: PartyPopper, iconClass: "text-orange-500",
    cover: "from-violet-400 via-purple-500 to-fuchsia-600",
    tint: "from-pink-50 to-rose-100 dark:from-pink-950/40 dark:to-rose-900/20",
    palette: {
      card: "bg-fuchsia-50 border-fuchsia-200 dark:bg-fuchsia-950/70 dark:border-fuchsia-900",
      solid: "bg-fuchsia-500", text: "text-fuchsia-600 dark:text-fuchsia-300", dot: "#d946ef",
    },
    keywords: ["fun", "party", "parties", "night out", "nightlife", "club", "clubs", "celebrate", "birthday", "dance", "dancing"],
  },
  {
    key: "chill", label: "Chill", cardTitle: "Chill Vibes", blurb: "Relaxed & low-key hangouts",
    icon: Coffee, iconClass: "text-sky-500",
    cover: "from-amber-400 via-orange-500 to-rose-500",
    tint: "from-violet-50 to-purple-100 dark:from-violet-950/40 dark:to-purple-900/20",
    palette: {
      card: "bg-violet-50 border-violet-200 dark:bg-violet-950/70 dark:border-violet-900",
      solid: "bg-violet-500", text: "text-violet-600 dark:text-violet-300", dot: "#8b5cf6",
    },
    keywords: ["chill", "chilling", "coffee", "co-work", "cowork", "tea", "chai", "brew", "espresso", "latte", "hangout", "hangouts", "walk", "walks", "movie", "movies", "film", "films", "cinema"],
  },
  {
    key: "food", label: "Food", cardTitle: "Foodie", blurb: "Explore cafes & food spots",
    icon: UtensilsCrossed, iconClass: "text-orange-500",
    cover: "from-rose-400 via-red-500 to-orange-500",
    tint: "from-orange-50 to-amber-100 dark:from-orange-950/40 dark:to-amber-900/20",
    palette: {
      card: "bg-rose-50 border-rose-200 dark:bg-rose-950/70 dark:border-rose-900",
      solid: "bg-rose-500", text: "text-rose-600 dark:text-rose-300", dot: "#f43f5e",
    },
    keywords: ["food", "cafe", "cafes", "cafee", "dinner", "lunch", "brunch", "breakfast", "eat", "eats", "eating", "restaurant", "pizza", "biryani", "foodie", "dessert", "desserts"],
  },
  {
    key: "adventure", label: "Adventure", cardTitle: "Adventure", blurb: "Outdoor & thrilling plans",
    icon: Mountain, iconClass: "text-emerald-500",
    cover: "from-lime-400 via-green-500 to-emerald-600",
    tint: "from-emerald-50 to-teal-100 dark:from-emerald-950/40 dark:to-teal-900/20",
    palette: {
      card: "bg-sky-50 border-sky-200 dark:bg-sky-950/70 dark:border-sky-900",
      solid: "bg-sky-500", text: "text-sky-600 dark:text-sky-300", dot: "#0ea5e9",
    },
    keywords: ["adventure", "hike", "hikes", "hiking", "trek", "trekking", "cycle", "cycling", "camp", "camping", "trail", "trails", "outdoor", "outdoors", "beach", "travel", "trip", "sunset", "sunrise", "lake"],
  },
  {
    key: "study", label: "Study", cardTitle: "Study Mode", blurb: "Focus sessions & co-learning",
    icon: BookOpen, iconClass: "text-rose-500",
    cover: "from-slate-500 via-slate-700 to-zinc-900",
    tint: "from-sky-50 to-indigo-100 dark:from-sky-950/40 dark:to-indigo-900/20",
    palette: {
      card: "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/70 dark:border-indigo-900",
      solid: "bg-indigo-500", text: "text-indigo-600 dark:text-indigo-300", dot: "#6366f1",
    },
    keywords: ["study", "studying", "library", "exam", "exams", "learn", "learning", "book", "books", "read", "reading", "revise", "revision", "tech", "code", "coding"],
  },
  {
    key: "music", label: "Music", cardTitle: "Music & Gigs", blurb: "Live shows & jam sessions",
    icon: Music, iconClass: "text-fuchsia-500",
    cover: "from-fuchsia-400 via-purple-500 to-indigo-600",
    tint: "from-fuchsia-50 to-purple-100 dark:from-fuchsia-950/40 dark:to-purple-900/20",
    palette: {
      card: "bg-purple-50 border-purple-200 dark:bg-purple-950/70 dark:border-purple-900",
      solid: "bg-purple-500", text: "text-purple-600 dark:text-purple-300", dot: "#a855f7",
    },
    keywords: ["music", "gig", "gigs", "concert", "concerts", "band", "jam", "karaoke", "dj", "sing", "singing"],
  },
  {
    key: "sports", label: "Sports", cardTitle: "Get Moving", blurb: "Sports, gym & fitness",
    icon: Dumbbell, iconClass: "text-blue-500",
    cover: "from-sky-400 via-blue-500 to-indigo-600",
    tint: "from-blue-50 to-sky-100 dark:from-blue-950/40 dark:to-sky-900/20",
    palette: {
      card: "bg-amber-50 border-amber-200 dark:bg-amber-950/70 dark:border-amber-900",
      solid: "bg-amber-500", text: "text-amber-600 dark:text-amber-300", dot: "#f59e0b",
    },
    keywords: ["gym", "workout", "yoga", "fitness", "cricket", "football", "badminton", "tennis", "swim", "swimming", "sport", "sports", "running", "jog", "jogging", "marathon"],
  },
  {
    key: "games", label: "Games", cardTitle: "Game Night", blurb: "Board games & quizzes",
    icon: Dices, iconClass: "text-teal-500",
    cover: "from-emerald-400 via-teal-500 to-cyan-600",
    tint: "from-teal-50 to-cyan-100 dark:from-teal-950/40 dark:to-cyan-900/20",
    palette: {
      card: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/70 dark:border-emerald-900",
      solid: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-300", dot: "#10b981",
    },
    keywords: ["game", "games", "gaming", "board", "cards", "chess", "carrom", "quiz", "poker"],
  },
];

export const DEFAULT_CATEGORY: Category = {
  key: "hangout", label: "Hangout", cardTitle: "Anything Goes", blurb: "Everything else on milo",
  icon: Sparkles, iconClass: "text-primary",
  cover: "from-violet-500 via-purple-600 to-indigo-700",
  tint: "from-violet-50 to-indigo-100 dark:from-violet-950/40 dark:to-indigo-900/20",
  palette: {
    card: "bg-violet-50 border-violet-200 dark:bg-violet-950/70 dark:border-violet-900",
    solid: "bg-violet-500", text: "text-violet-600 dark:text-violet-300", dot: "#8b5cf6",
  },
  keywords: [],
};

// Specific vibes are checked before broad ones, so "Board Game Night" lands on
// Games rather than Fun, and "cafe" beats the generic "hangout".
const MATCH_ORDER = ["study", "games", "music", "sports", "adventure", "food", "chill", "fun"];

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Keywords match whole words only. Plain substring matching misfired badly:
// "brunch" contains "run" (Sports), "team" contains "tea" (Chill) and "bread"
// contains "read" (Study). Compiled once per category on first use.
const patterns = new Map<string, RegExp>();
const patternFor = (category: Category) => {
  let pattern = patterns.get(category.key);
  if (!pattern) {
    pattern = new RegExp(`\\b(${category.keywords.map(escape).join("|")})\\b`, "i");
    patterns.set(category.key, pattern);
  }
  return pattern;
};

/** Best-matching category for a plan, falling back to a generic "Hangout". */
export const categoryOf = (plan: { title: string; description?: string | null }): Category => {
  const text = `${plan.title} ${plan.description ?? ""}`;
  for (const key of MATCH_ORDER) {
    const category = CATEGORIES.find((c) => c.key === key);
    if (category?.keywords.length && patternFor(category).test(text)) return category;
  }
  return DEFAULT_CATEGORY;
};

export const categoryByKey = (key: string): Category =>
  CATEGORIES.find((c) => c.key === key) ?? DEFAULT_CATEGORY;

/** Filter chips shown above the home feed. */
export const FEED_FILTERS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "nearby", label: "Nearby" },
  { key: "online", label: "Online" },
] as const;

export type FeedFilter = (typeof FEED_FILTERS)[number]["key"];

export type SortKey = "newest" | "soonest" | "popular";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "soonest", label: "Happening soonest" },
  { key: "popular", label: "Most people going" },
];
