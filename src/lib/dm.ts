// Pure helpers for one-to-one chats. Kept free of Supabase so they stay
// testable — the queries live in the pages that use them.

type Pair = { sender_id: string; recipient_id: string };

/** The other person in a thread, from `meId`'s point of view. */
export const peerIdOf = (m: Pair, meId: string) =>
  m.sender_id === meId ? m.recipient_id : m.sender_id;

/**
 * Everyone else currently in the app. The presence roster includes you, so it
 * always has to be filtered before picking someone to chat with.
 */
export const onlinePeers = (onlineIds: Iterable<string>, meId: string): string[] =>
  [...new Set(onlineIds)].filter((id) => id !== meId);

/**
 * Newest message per conversation partner. `messages` must already be sorted
 * newest-first — the first row seen for a peer wins.
 */
export const latestByPeer = <T extends Pair>(messages: T[], meId: string): Record<string, T> => {
  const latest: Record<string, T> = {};
  for (const m of messages) {
    const peer = peerIdOf(m, meId);
    if (!latest[peer]) latest[peer] = m;
  }
  return latest;
};

/** Uniformly random element, or null when there's nothing to pick. */
export const pickRandom = <T,>(items: T[]): T | null =>
  items.length ? items[Math.floor(Math.random() * items.length)] : null;

/**
 * Random peer to start a chat with, preferring anyone you haven't messaged yet
 * so "chat to someone random" keeps surfacing new people before repeating.
 */
export const pickRandomPeer = (candidates: string[], alreadyTalkedTo: Iterable<string>): string | null => {
  const seen = new Set(alreadyTalkedTo);
  const fresh = candidates.filter((id) => !seen.has(id));
  return pickRandom(fresh.length ? fresh : candidates);
};
