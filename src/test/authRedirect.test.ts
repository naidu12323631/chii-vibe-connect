import { describe, expect, it } from "vitest";
import { getOAuthRedirectUrl } from "../lib/authRedirect";

describe("getOAuthRedirectUrl", () => {
  it("returns the Vercel app URL by default", () => {
    expect(getOAuthRedirectUrl("https://example.com")).toBe("https://miloumingle.vercel.app/app");
    expect(getOAuthRedirectUrl("https://example.com/")).toBe("https://miloumingle.vercel.app/app");
  });
});
