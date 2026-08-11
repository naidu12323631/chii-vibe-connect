import { afterEach, describe, expect, it, vi } from "vitest";
import { latestByPeer, onlinePeers, peerIdOf, pickRandom, pickRandomPeer } from "@/lib/dm";

const ME = "me";

describe("peerIdOf", () => {
  it("returns the recipient when I sent it", () => {
    expect(peerIdOf({ sender_id: ME, recipient_id: "them" }, ME)).toBe("them");
  });

  it("returns the sender when they sent it", () => {
    expect(peerIdOf({ sender_id: "them", recipient_id: ME }, ME)).toBe("them");
  });
});

describe("onlinePeers", () => {
  it("returns everyone online except me", () => {
    expect(onlinePeers(new Set([ME, "a", "b"]), ME).sort()).toEqual(["a", "b"]);
  });

  it("excludes me even when I'm the only one online", () => {
    expect(onlinePeers(new Set([ME]), ME)).toEqual([]);
  });

  it("dedupes repeated ids", () => {
    expect(onlinePeers(["a", "a", "b"], ME).sort()).toEqual(["a", "b"]);
  });

  it("returns nothing for an empty roster", () => {
    expect(onlinePeers(new Set<string>(), ME)).toEqual([]);
  });
});

describe("latestByPeer", () => {
  it("keeps the first row seen per peer (input is newest-first)", () => {
    const rows = [
      { sender_id: ME, recipient_id: "a", content: "newest" },
      { sender_id: "a", recipient_id: ME, content: "older" },
      { sender_id: "b", recipient_id: ME, content: "b-only" },
    ];
    const latest = latestByPeer(rows, ME);
    expect(latest.a.content).toBe("newest");
    expect(latest.b.content).toBe("b-only");
  });

  it("groups both directions under the same peer", () => {
    const latest = latestByPeer(
      [
        { sender_id: "a", recipient_id: ME },
        { sender_id: ME, recipient_id: "a" },
      ],
      ME,
    );
    expect(Object.keys(latest)).toEqual(["a"]);
  });
});

describe("pickRandom", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns null for an empty list", () => {
    expect(pickRandom([])).toBeNull();
  });

  it("returns the only item", () => {
    expect(pickRandom(["solo"])).toBe("solo");
  });

  it("picks by Math.random across the whole range", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickRandom(["a", "b", "c"])).toBe("a");
    vi.spyOn(Math, "random").mockReturnValue(0.999);
    expect(pickRandom(["a", "b", "c"])).toBe("c");
  });
});

describe("pickRandomPeer", () => {
  afterEach(() => vi.restoreAllMocks());

  it("prefers someone not messaged yet", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickRandomPeer(["a", "b"], ["a"])).toBe("b");
  });

  it("falls back to the full circle once everyone has been messaged", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickRandomPeer(["a", "b"], ["a", "b"])).toBe("a");
  });

  it("returns null when the circle is empty", () => {
    expect(pickRandomPeer([], [])).toBeNull();
  });
});
