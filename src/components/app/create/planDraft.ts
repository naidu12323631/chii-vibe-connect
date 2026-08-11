import { CATEGORIES, categoryByKey, type Category } from "@/lib/planMeta";

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 300;
export const PARTICIPANTS_MIN = 2;
export const PARTICIPANTS_MAX = 50;

/** "Other" lets the host skip tagging without us guessing a vibe for them. */
export const OTHER_VIBE = "other";

export type Draft = {
  /** Uploaded image URL, or "preset:<vibe>" for a built-in gradient cover. */
  cover: string | null;
  title: string;
  description: string;
  /** "yyyy-mm-dd" */
  date: string;
  /** "HH:mm" */
  time: string;
  location: string;
  mapsUrl: string;
  maxParticipants: number;
  vibe: string | null;
};

export const emptyDraft: Draft = {
  cover: null,
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  mapsUrl: "",
  maxParticipants: 4,
  vibe: null,
};

export const STEPS = [
  { key: "details", label: "Details" },
  { key: "location", label: "Location" },
  { key: "preferences", label: "Preferences" },
  { key: "review", label: "Review" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

/** Covers offered without an upload — one gradient per vibe. */
export const PRESET_COVERS: Category[] = [
  categoryByKey("chill"),
  categoryByKey("fun"),
  categoryByKey("games"),
  categoryByKey("adventure"),
];

export const presetCover = (category: Category) => `preset:${category.key}`;

export const isPresetCover = (cover: string | null | undefined): cover is string =>
  typeof cover === "string" && cover.startsWith("preset:");

/** The vibe a preset cover refers to, for rendering its gradient. */
export const coverCategory = (cover: string) => categoryByKey(cover.slice("preset:".length));

/** Combines the date and time fields into an ISO timestamp, or null. */
export const draftWhenIso = (draft: Draft): string | null => {
  if (!draft.date || !draft.time) return null;
  const parsed = new Date(`${draft.date}T${draft.time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

/** Human-readable summary of the chosen date and time. */
export const draftWhenLabel = (draft: Draft): string | null => {
  const iso = draftWhenIso(draft);
  if (!iso) return null;
  return new Date(iso).toLocaleString([], { dateStyle: "full", timeStyle: "short" });
};

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export type DraftErrors = Partial<Record<"title" | "when" | "location" | "mapsUrl" | "maxParticipants", string>>;

/** Everything wrong with the draft, keyed by field. */
export const validateDraft = (draft: Draft): DraftErrors => {
  const errors: DraftErrors = {};

  if (!draft.title.trim()) errors.title = "Give your plan a title.";
  else if (draft.title.trim().length > TITLE_MAX) errors.title = `Keep it under ${TITLE_MAX} characters.`;

  if (!draft.date || !draft.time) errors.when = "Pick a date and time.";
  else if (!draftWhenIso(draft)) errors.when = "That date and time isn't valid.";

  if (!draft.location.trim()) errors.location = "Choose where you're meeting.";

  if (draft.mapsUrl.trim() && !isHttpUrl(draft.mapsUrl.trim())) {
    errors.mapsUrl = "That doesn't look like a link.";
  }

  if (
    !Number.isFinite(draft.maxParticipants) ||
    draft.maxParticipants < PARTICIPANTS_MIN ||
    draft.maxParticipants > PARTICIPANTS_MAX
  ) {
    errors.maxParticipants = `Between ${PARTICIPANTS_MIN} and ${PARTICIPANTS_MAX} people.`;
  }

  return errors;
};

/** Which fields each step is responsible for, so Next only blocks on its own. */
const STEP_FIELDS: Record<StepKey, (keyof DraftErrors)[]> = {
  details: ["title", "when", "mapsUrl"],
  location: ["location", "mapsUrl"],
  preferences: ["maxParticipants"],
  review: ["title", "when", "location", "mapsUrl", "maxParticipants"],
};

export const errorsForStep = (draft: Draft, step: StepKey): DraftErrors => {
  const all = validateDraft(draft);
  const scoped: DraftErrors = {};
  for (const field of STEP_FIELDS[step]) {
    if (all[field]) scoped[field] = all[field];
  }
  return scoped;
};

export const canLeaveStep = (draft: Draft, step: StepKey) =>
  Object.keys(errorsForStep(draft, step)).length === 0;

/** Vibe options shown as chips, including the untagged "Other". */
export const VIBE_CHOICES = [...CATEGORIES.slice(0, 5), null];
