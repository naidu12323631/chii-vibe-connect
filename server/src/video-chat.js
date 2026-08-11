// Anonymous stranger video-chat signaling (Omegle-style).
//
// Lives on its own Socket.IO namespace "/video" so it needs NO authentication —
// the main "/" connection still requires a JWT for the plans/meetups features.
//
// Responsibilities:
//   1. Matchmaking: pair up two waiting strangers at random.
//   2. WebRTC signaling relay: forward offer/answer/ICE between the pair.
//   3. Text chat relay between the pair.
//   4. Skip ("next") and exit ("stop") + disconnect cleanup.

/**
 * @param {import("socket.io").Server} io
 */
export function initVideoChat(io) {
  const nsp = io.of("/video");

  // socket.id of the single stranger currently waiting for a partner (or null).
  let waiting = null;
  // socket.id -> partner socket.id
  const partners = new Map();

  const cities = [
    "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Chennai",
    "Pune", "Kolkata", "Jaipur", "Ahmedabad", "Kochi",
  ];
  // Deterministic-ish label per socket so both peers see a stable "location".
  const labelFor = (socket) => {
    const n = socket.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return { country: "India", city: cities[n % cities.length], flag: "🇮🇳" };
  };

  /** Break a pair apart and tell the partner they were left. */
  function unpair(socketId, { notify = true } = {}) {
    const partnerId = partners.get(socketId);
    if (!partnerId) return null;
    partners.delete(socketId);
    partners.delete(partnerId);
    if (notify) nsp.to(partnerId).emit("partner:left");
    return partnerId;
  }

  /** Put a socket into the waiting slot, or match it with whoever is already waiting. */
  function enqueue(socket) {
    // Already paired? Ignore stray ready calls.
    if (partners.has(socket.id)) return;

    if (waiting && waiting !== socket.id && nsp.sockets.has(waiting)) {
      const partnerId = waiting;
      waiting = null;
      const partner = nsp.sockets.get(partnerId);

      partners.set(socket.id, partnerId);
      partners.set(partnerId, socket.id);

      // The earlier-waiting peer initiates the WebRTC offer.
      partner.emit("matched", { initiator: true, peer: labelFor(socket) });
      socket.emit("matched", { initiator: false, peer: labelFor(partner) });
    } else {
      waiting = socket.id;
      socket.emit("waiting");
    }
  }

  nsp.on("connection", (socket) => {
    // Enter the matchmaking queue.
    socket.on("ready", () => enqueue(socket));

    // Relay WebRTC signaling (offer / answer / ICE candidates) to the partner.
    socket.on("signal", (data) => {
      const partnerId = partners.get(socket.id);
      if (partnerId) nsp.to(partnerId).emit("signal", data);
    });

    // Relay a text chat message to the partner.
    socket.on("chat", (text) => {
      const partnerId = partners.get(socket.id);
      const content = String(text || "").slice(0, 2000).trim();
      if (partnerId && content) nsp.to(partnerId).emit("chat", { text: content });
    });

    // "Next": leave the current partner and look for a new one.
    socket.on("next", () => {
      const formerPartnerId = unpair(socket.id);
      // If the waiting slot is us, clear it.
      if (waiting === socket.id) waiting = null;
      // Requeue the abandoned partner too, so they find someone else quickly.
      if (formerPartnerId && nsp.sockets.has(formerPartnerId)) {
        enqueue(nsp.sockets.get(formerPartnerId));
      }
      enqueue(socket);
    });

    // "Stop": leave the chat entirely.
    socket.on("stop", () => {
      const formerPartnerId = unpair(socket.id);
      if (waiting === socket.id) waiting = null;
      if (formerPartnerId && nsp.sockets.has(formerPartnerId)) {
        enqueue(nsp.sockets.get(formerPartnerId));
      }
    });

    socket.on("disconnect", () => {
      const formerPartnerId = unpair(socket.id);
      if (waiting === socket.id) waiting = null;
      // Give the abandoned partner a fresh match.
      if (formerPartnerId && nsp.sockets.has(formerPartnerId)) {
        enqueue(nsp.sockets.get(formerPartnerId));
      }
    });
  });
}
