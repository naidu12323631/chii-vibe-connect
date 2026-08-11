import { describe, expect, it } from "vitest";
import {
  canLeaveStep, coverCategory, draftWhenIso, draftWhenLabel, emptyDraft, errorsForStep,
  isPresetCover, presetCover, PARTICIPANTS_MAX, PARTICIPANTS_MIN, TITLE_MAX, validateDraft,
  type Draft,
} from "@/components/app/create/planDraft";
import { categoryByKey } from "@/lib/planMeta";

const complete: Draft = {
  ...emptyDraft,
  title: "Coffee & co-work",
  date: "2026-09-01",
  time: "18:30",
  location: "Indiranagar, Bangalore",
};

describe("validateDraft", () => {
  it("accepts a complete draft", () => {
    expect(validateDraft(complete)).toEqual({});
  });

  it("requires a title, a date/time and a place", () => {
    const errors = validateDraft(emptyDraft);
    expect(errors.title).toBeTruthy();
    expect(errors.when).toBeTruthy();
    expect(errors.location).toBeTruthy();
  });

  it("treats whitespace-only text as missing", () => {
    expect(validateDraft({ ...complete, title: "   " }).title).toBeTruthy();
    expect(validateDraft({ ...complete, location: "  " }).location).toBeTruthy();
  });

  it("rejects a date without a time and vice versa", () => {
    expect(validateDraft({ ...complete, time: "" }).when).toBeTruthy();
    expect(validateDraft({ ...complete, date: "" }).when).toBeTruthy();
  });

  it("flags an over-long title", () => {
    expect(validateDraft({ ...complete, title: "x".repeat(TITLE_MAX + 1) }).title).toBeTruthy();
  });

  it("only rejects a maps link when it isn't a URL", () => {
    expect(validateDraft({ ...complete, mapsUrl: "" }).mapsUrl).toBeUndefined();
    expect(validateDraft({ ...complete, mapsUrl: "https://maps.app.goo.gl/abc" }).mapsUrl).toBeUndefined();
    expect(validateDraft({ ...complete, mapsUrl: "not a link" }).mapsUrl).toBeTruthy();
    // Guard against javascript: and other non-web schemes.
    expect(validateDraft({ ...complete, mapsUrl: "javascript:alert(1)" }).mapsUrl).toBeTruthy();
  });

  it("keeps the headcount in range", () => {
    expect(validateDraft({ ...complete, maxParticipants: PARTICIPANTS_MIN - 1 }).maxParticipants).toBeTruthy();
    expect(validateDraft({ ...complete, maxParticipants: PARTICIPANTS_MAX + 1 }).maxParticipants).toBeTruthy();
    expect(validateDraft({ ...complete, maxParticipants: NaN }).maxParticipants).toBeTruthy();
    expect(validateDraft({ ...complete, maxParticipants: PARTICIPANTS_MAX }).maxParticipants).toBeUndefined();
  });
});

describe("errorsForStep", () => {
  it("does not block Details on a location that belongs to step 2", () => {
    const draft = { ...complete, location: "" };
    expect(errorsForStep(draft, "details")).toEqual({});
    expect(canLeaveStep(draft, "details")).toBe(true);
    expect(canLeaveStep(draft, "location")).toBe(false);
  });

  it("blocks Details on its own fields", () => {
    expect(canLeaveStep({ ...complete, title: "" }, "details")).toBe(false);
    expect(canLeaveStep({ ...complete, date: "" }, "details")).toBe(false);
  });

  it("holds Review to every field", () => {
    expect(canLeaveStep({ ...complete, location: "" }, "review")).toBe(false);
    expect(canLeaveStep(complete, "review")).toBe(true);
  });
});

describe("draftWhenIso", () => {
  it("combines the date and time into a timestamp", () => {
    const iso = draftWhenIso(complete);
    expect(iso).toBeTruthy();
    const parsed = new Date(iso!);
    // Built from local time, so compare local parts.
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8); // September
    expect(parsed.getDate()).toBe(1);
    expect(parsed.getHours()).toBe(18);
    expect(parsed.getMinutes()).toBe(30);
  });

  it("is null until both parts are set", () => {
    expect(draftWhenIso(emptyDraft)).toBeNull();
    expect(draftWhenIso({ ...complete, time: "" })).toBeNull();
    expect(draftWhenLabel(emptyDraft)).toBeNull();
  });

  it("is null for an impossible date", () => {
    expect(draftWhenIso({ ...complete, date: "2026-13-45" })).toBeNull();
  });
});

describe("preset covers", () => {
  it("round-trips a vibe through the cover value", () => {
    const cover = presetCover(categoryByKey("games"));
    expect(cover).toBe("preset:games");
    expect(isPresetCover(cover)).toBe(true);
    expect(coverCategory(cover).label).toBe("Games");
  });

  it("does not mistake an uploaded URL for a preset", () => {
    expect(isPresetCover("https://example.com/cover.jpg")).toBe(false);
    expect(isPresetCover(null)).toBe(false);
  });
});
