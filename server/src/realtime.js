import { Server } from "socket.io";
import { authSocket } from "./auth.js";
import { query, sql } from "./db.js";
import { initVideoChat } from "./video-chat.js";

let io;

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: {
      // Accept the configured origin plus the common local dev ports.
      origin: [process.env.CLIENT_ORIGIN, "http://localhost:5173", "http://localhost:8080"].filter(Boolean),
      credentials: true,
    },
  });

  // Anonymous stranger video-chat lives on its own namespace (no auth required).
  initVideoChat(io);

  io.on("connection", (socket) => {
    let user;
    try {
      user = authSocket(socket);
    } catch {
      socket.disconnect(true);
      return;
    }

    // Personal room for cross-plan notifications.
    socket.join(`user:${user.id}`);

    // Clients join/leave the room for the plan chat they're viewing.
    socket.on("plan:join", (planId) => {
      if (typeof planId === "string") socket.join(`plan:${planId}`);
    });
    socket.on("plan:leave", (planId) => {
      if (typeof planId === "string") socket.leave(`plan:${planId}`);
    });
  });

  return io;
}

/** Everyone currently in a plan's chat room gets the new message. */
export function emitMessage(planId, message) {
  io?.to(`plan:${planId}`).emit("message:new", message);
}

/** Notify every plan member (except the sender) about a new message. */
export async function notifyMembers(planId, message, senderId) {
  if (!io) return;
  const { recordset } = await query(
    `SELECT p.user_id, p.title FROM dbo.plans p WHERE p.id = @planId
     UNION
     SELECT pp.user_id, (SELECT title FROM dbo.plans WHERE id = @planId)
       FROM dbo.plan_participants pp WHERE pp.plan_id = @planId`,
    { planId: { type: sql.UniqueIdentifier, value: planId } },
  );
  const title = recordset[0]?.title ?? "your plan";
  const payload = { ...message, plan_title: title };
  for (const row of recordset) {
    if (row.user_id !== senderId) io.to(`user:${row.user_id}`).emit("notify", payload);
  }
}
