import { describe, expect, it } from "vitest";
import { getOAuthRedirectUrl } from "../lib/authRedirect";

describe("getOAuthRedirectUrl", () => {
  it("builds the app redirect URL for Google OAuth", () => {
    expect(getOAuthRedirectUrl("https://example.com")).toBe("https://example.com/app");
    expect(getOAuthRedirectUrl("https://example.com/")).toBe("https://example.com/app");
  });
});
