import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const SECRET = process.env.JWT_SECRET || "insecure-dev-secret";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET); // throws on invalid/expired
}

/** Express middleware: require a valid Bearer token; attaches req.user = { id, email }. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing authorization token" });
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/** Socket.IO handshake auth: resolves the user from the token or throws. */
export function authSocket(socket) {
  const token = socket.handshake.auth?.token;
  if (!token) throw new Error("Missing token");
  const payload = verifyToken(token);
  return { id: payload.sub, email: payload.email };
}
