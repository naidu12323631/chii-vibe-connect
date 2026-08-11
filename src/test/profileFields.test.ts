import { describe, expect, it } from "vitest";
import {
  checkUsernameFormat, instagramUrl, interestEmoji, normaliseInstagram, normaliseUsername,
  normaliseWebsite, USERNAME_PATTERN, visibilityOption,
} from "@/lib/profileFields";
import { handleFor } from "@/components/app/profile/ProfileHero";

describe("normaliseUsername", () => {
  it("drops the @, lower-cases, and strips illegal characters", () => {
    expect(normaliseUsername("@Arjun")).toBe("arjun");
    expect(normaliseUsername("  Arjun Kumar! ")).toBe("arjunkumar");
    expect(normaliseUsername("@@a.r_j99")).toBe("a.r_j99");
  });

  it("produces values the database constraint accepts", () => {
    // The same pattern as profiles_username_format in 0011.
    expect(USERNAME_PATTERN.test(normaliseUsername("@Arjun.Dev_1"))).toBe(true);
  });
});

describe("checkUsernameFormat", () => {
  it("accepts a valid handle", () => {
    expect(checkUsernameFormat("arjun")).toBeNull();
    expect(checkUsernameFormat("@a.b_c9")).toBeNull();
  });

  it("reports what's wrong", () => {
    expect(checkUsernameFormat("")).toBe("empty");
    expect(checkUsernameFormat("   ")).toBe("empty");
    expect(checkUsernameFormat("ab")).toBe("short");
    expect(checkUsernameFormat("a".repeat(21))).toBe("long");
  });

  it("treats an all-punctuation handle as empty rather than invalid", () => {
    expect(checkUsernameFormat("!!!")).toBe("empty");
  });
});

describe("normaliseInstagram", () => {
  it("accepts a handle, an @handle or a profile URL", () => {
    expect(normaliseInstagram("arjun")).toBe("arjun");
    expect(normaliseInstagram("@Arjun_")).toBe("arjun_");
    expect(normaliseInstagram("https://instagram.com/Arjun.Dev/")).toBe("arjun.dev");
    expect(normaliseInstagram("www.instagram.com/arjun?igshid=1")).toBe("arjun");
  });

  it("is null when blank", () => {
    expect(normaliseInstagram("   ")).toBeNull();
  });

  it("builds a working profile link", () => {
    expect(instagramUrl("arjun")).toBe("https://instagram.com/arjun");
    expect(instagramUrl("@arjun")).toBe("https://instagram.com/arjun");
  });
});

describe("normaliseWebsite", () => {
  it("adds a missing scheme", () => {
    expect(normaliseWebsite("example.com").url).toBe("https://example.com/");
  });

  it("keeps an explicit scheme", () => {
    expect(normaliseWebsite("http://example.com/x").url).toBe("http://example.com/x");
  });

  it("is null and error-free when blank", () => {
    const result = normaliseWebsite("  ");
    expect(result.url).toBeNull();
    expect(result.error).toBeUndefined();
  });

  it("rejects junk and non-web schemes", () => {
    expect(normaliseWebsite("not a link").error).toBeTruthy();
    expect(normaliseWebsite("nodots").error).toBeTruthy();
    expect(normaliseWebsite("javascript:alert(1)").error).toBeTruthy();
  });
});

describe("visibilityOption", () => {
  it("falls back to public for an unset value", () => {
    expect(visibilityOption(undefined).key).toBe("public");
    expect(visibilityOption("private").label).toBe("Private");
  });
});

describe("interestEmoji", () => {
  it("matches known interests case-insensitively", () => {
    expect(interestEmoji("Coffee")).toBe("☕");
    expect(interestEmoji(" gaming ")).toBe("🎮");
  });

  it("falls back for anything unknown", () => {
    expect(interestEmoji("Underwater basket weaving")).toBe("✨");
  });
});

describe("handleFor", () => {
  it("prefers a saved username", () => {
    expect(handleFor({ id: "u1", display_name: "Arjun Kumar", username: "arjun_k" })).toBe("@arjun_k");
  });

  it("derives one when no username is saved", () => {
    expect(handleFor({ id: "u1", display_name: "Arjun Kumar", username: null })).toBe("@arjunkumar");
    expect(handleFor({ id: "u1", display_name: null }, "arjun.dev@example.com")).toBe("@arjun.dev");
  });
});
