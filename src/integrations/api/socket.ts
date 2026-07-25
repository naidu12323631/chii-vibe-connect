// Socket.IO client singleton (replaces Supabase realtime channels).
import { io, type Socket } from "socket.io-client";
import { API_URL, tokenStore } from "./client";

let socket: Socket | null = null;

/** Get (creating if needed) the shared socket, authenticated with the current JWT. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      auth: { token: tokenStore.get() },
      autoConnect: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

/** Tear down and recreate the socket — call after login/logout so the new token is used. */
export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
