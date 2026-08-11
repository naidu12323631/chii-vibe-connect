import "dotenv/config";
import http from "node:http";
import { randomUUID } from "node:crypto";
import express from "express";
import cors from "cors";

import { query, ensureSchema, sql } from "./db.js";
import { hashPassword, verifyPassword, signToken, requireAuth } from "./auth.js";
import { initRealtime, emitMessage, notifyMembers } from "./realtime.js";

const app = express();
// Allow the configured CLIENT_ORIGIN, and common local dev origins (Vite default and older ports).
const allowedOrigins = [process.env.CLIENT_ORIGIN, "http://localhost:5173", "http://localhost:8080"].filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      // If no origin (curl, mobile devtools), allow.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.json());

const UID = (value) => ({ type: sql.UniqueIdentifier, value });

// Wrap async handlers so thrown errors hit the error middleware.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const parseProfile = (row) =>
  row && {
    id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio,
    interests: JSON.parse(row.interests || "[]"),
    availability: JSON.parse(row.availability || "[]"),
  };

async function isMember(planId, userId) {
  const { recordset } = await query(
    `SELECT 1 AS hit FROM dbo.plans WHERE id = @planId AND user_id = @userId
     UNION
     SELECT 1 FROM dbo.plan_participants WHERE plan_id = @planId AND user_id = @userId`,
    { planId: UID(planId), userId: UID(userId) },
  );
  return recordset.length > 0;
}

// ---------------------------------------------------------------- health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ------------------------------------------------------------------ auth
app.post(
  "/api/auth/signup",
  wrap(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const displayName = String(req.body.display_name || "").trim() || email.split("@")[0];
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const existing = await query("SELECT 1 FROM dbo.users WHERE email = @email", { email });
    if (existing.recordset.length) return res.status(409).json({ error: "An account with this email already exists" });

    const id = randomUUID();
    const password_hash = await hashPassword(password);
    await query(
      "INSERT INTO dbo.users (id, email, password_hash) VALUES (@id, @email, @hash)",
      { id: UID(id), email, hash: password_hash },
    );
    await query(
      "INSERT INTO dbo.profiles (id, display_name) VALUES (@id, @name)",
      { id: UID(id), name: displayName },
    );
    const user = { id, email, display_name: displayName };
    res.status(201).json({ token: signToken(user), user });
  }),
);

app.post(
  "/api/auth/login",
  wrap(async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const { recordset } = await query(
      `SELECT u.id, u.email, u.password_hash, p.display_name
         FROM dbo.users u LEFT JOIN dbo.profiles p ON p.id = u.id
        WHERE u.email = @email`,
      { email },
    );
    const row = recordset[0];
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const user = { id: row.id, email: row.email, display_name: row.display_name };
    res.json({ token: signToken(user), user });
  }),
);

app.get(
  "/api/auth/me",
  requireAuth,
  wrap(async (req, res) => {
    const { recordset } = await query(
      `SELECT u.id, u.email, p.display_name
         FROM dbo.users u LEFT JOIN dbo.profiles p ON p.id = u.id
        WHERE u.id = @id`,
      { id: UID(req.user.id) },
    );
    const row = recordset[0];
    if (!row) return res.status(404).json({ error: "User not found" });
    res.json({ user: row });
  }),
);

// -------------------------------------------------------------- profiles
app.get(
  "/api/profiles",
  requireAuth,
  wrap(async (req, res) => {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return res.json([]);
    // Build a parameterized IN list.
    const params = {};
    const placeholders = ids.map((id, i) => {
      params[`id${i}`] = UID(id);
      return `@id${i}`;
    });
    const { recordset } = await query(
      `SELECT id, display_name, avatar_url, bio, interests, availability
         FROM dbo.profiles WHERE id IN (${placeholders.join(",")})`,
      params,
    );
    res.json(recordset.map(parseProfile));
  }),
);

app.get(
  "/api/profiles/:id",
  requireAuth,
  wrap(async (req, res) => {
    const { recordset } = await query(
      `SELECT id, display_name, avatar_url, bio, interests, availability
         FROM dbo.profiles WHERE id = @id`,
      { id: UID(req.params.id) },
    );
    if (!recordset[0]) return res.status(404).json({ error: "Profile not found" });
    res.json(parseProfile(recordset[0]));
  }),
);

app.put(
  "/api/profiles/me",
  requireAuth,
  wrap(async (req, res) => {
    const { display_name, bio, interests, availability } = req.body;
    await query(
      `UPDATE dbo.profiles
          SET display_name = @display_name,
              bio          = @bio,
              interests    = @interests,
              availability = @availability,
              updated_at   = SYSUTCDATETIME()
        WHERE id = @id`,
      {
        id: UID(req.user.id),
        display_name: display_name ?? null,
        bio: bio ?? null,
        interests: JSON.stringify(Array.isArray(interests) ? interests : []),
        availability: JSON.stringify(Array.isArray(availability) ? availability : []),
      },
    );
    res.json({ ok: true });
  }),
);

// ----------------------------------------------------------------- plans
app.get(
  "/api/plans",
  requireAuth,
  wrap(async (_req, res) => {
    const { recordset: plans } = await query(
      "SELECT * FROM dbo.plans ORDER BY created_at DESC",
    );
    const { recordset: parts } = await query(
      "SELECT plan_id, user_id FROM dbo.plan_participants",
    );
    const partsByPlan = {};
    for (const p of parts) (partsByPlan[p.plan_id] ??= []).push({ user_id: p.user_id });

    // Creator profiles.
    const creatorIds = [...new Set(plans.map((p) => p.user_id))];
    let profilesById = {};
    if (creatorIds.length) {
      const params = {};
      const ph = creatorIds.map((id, i) => ((params[`id${i}`] = UID(id)), `@id${i}`));
      const { recordset: profs } = await query(
        `SELECT id, display_name, avatar_url FROM dbo.profiles WHERE id IN (${ph.join(",")})`,
        params,
      );
      profilesById = Object.fromEntries(
        profs.map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }]),
      );
    }
    res.json(
      plans.map((p) => ({
        ...p,
        participants: partsByPlan[p.id] ?? [],
        profile: profilesById[p.user_id] ?? null,
      })),
    );
  }),
);

app.post(
  "/api/plans",
  requireAuth,
  wrap(async (req, res) => {
    const { title, description, location, plan_time, max_participants } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ error: "Title is required" });
    const id = randomUUID();
    await query(
      `INSERT INTO dbo.plans (id, user_id, title, description, location, plan_time, max_participants)
       VALUES (@id, @user_id, @title, @description, @location, @plan_time, @max)`,
      {
        id: UID(id),
        user_id: UID(req.user.id),
        title: String(title).trim(),
        description: description || null,
        location: location || null,
        plan_time: plan_time ? { type: sql.DateTime2, value: new Date(plan_time) } : null,
        max: { type: sql.Int, value: Number(max_participants) || 4 },
      },
    );
    const { recordset } = await query("SELECT * FROM dbo.plans WHERE id = @id", { id: UID(id) });
    res.status(201).json(recordset[0]);
  }),
);

app.get(
  "/api/plans/:id",
  requireAuth,
  wrap(async (req, res) => {
    const { recordset } = await query("SELECT * FROM dbo.plans WHERE id = @id", { id: UID(req.params.id) });
    if (!recordset[0]) return res.status(404).json({ error: "Plan not found" });
    res.json(recordset[0]);
  }),
);

app.get(
  "/api/plans/:id/participants",
  requireAuth,
  wrap(async (req, res) => {
    const { recordset } = await query(
      "SELECT user_id FROM dbo.plan_participants WHERE plan_id = @id",
      { id: UID(req.params.id) },
    );
    res.json(recordset); // [{ user_id }]
  }),
);

app.post(
  "/api/plans/:id/join",
  requireAuth,
  wrap(async (req, res) => {
    const planId = req.params.id;
    const { recordset: planRows } = await query(
      "SELECT max_participants FROM dbo.plans WHERE id = @id",
      { id: UID(planId) },
    );
    if (!planRows[0]) return res.status(404).json({ error: "Plan not found" });

    const { recordset: countRows } = await query(
      "SELECT COUNT(*) AS n FROM dbo.plan_participants WHERE plan_id = @id",
      { id: UID(planId) },
    );
    if (countRows[0].n >= planRows[0].max_participants) {
      return res.status(409).json({ error: "Plan is full" });
    }
    try {
      await query(
        "INSERT INTO dbo.plan_participants (id, plan_id, user_id) VALUES (@id, @plan, @user)",
        { id: UID(randomUUID()), plan: UID(planId), user: UID(req.user.id) },
      );
    } catch (e) {
      if (e.number === 2627 || e.number === 2601) return res.json({ ok: true }); // already joined (unique violation)
      throw e;
    }
    res.json({ ok: true });
  }),
);

app.delete(
  "/api/plans/:id/leave",
  requireAuth,
  wrap(async (req, res) => {
    await query(
      "DELETE FROM dbo.plan_participants WHERE plan_id = @plan AND user_id = @user",
      { plan: UID(req.params.id), user: UID(req.user.id) },
    );
    res.json({ ok: true });
  }),
);

// -------------------------------------------------------------- messages
app.get(
  "/api/plans/:id/messages",
  requireAuth,
  wrap(async (req, res) => {
    if (!(await isMember(req.params.id, req.user.id))) {
      return res.status(403).json({ error: "Join this plan to view its chat" });
    }
    const { recordset } = await query(
      "SELECT id, plan_id, user_id, content, created_at FROM dbo.plan_messages WHERE plan_id = @id ORDER BY created_at ASC",
      { id: UID(req.params.id) },
    );
    res.json(recordset);
  }),
);

app.post(
  "/api/plans/:id/messages",
  requireAuth,
  wrap(async (req, res) => {
    const planId = req.params.id;
    const content = String(req.body.content || "").trim();
    if (!content) return res.status(400).json({ error: "Message is empty" });
    if (content.length > 2000) return res.status(400).json({ error: "Message too long" });
    if (!(await isMember(planId, req.user.id))) {
      return res.status(403).json({ error: "Join this plan to chat" });
    }

    const id = randomUUID();
    await query(
      "INSERT INTO dbo.plan_messages (id, plan_id, user_id, content) VALUES (@id, @plan, @user, @content)",
      { id: UID(id), plan: UID(planId), user: UID(req.user.id), content },
    );
    const { recordset } = await query(
      "SELECT id, plan_id, user_id, content, created_at FROM dbo.plan_messages WHERE id = @id",
      { id: UID(id) },
    );
    const { recordset: prof } = await query(
      "SELECT display_name FROM dbo.profiles WHERE id = @id",
      { id: UID(req.user.id) },
    );
    const message = { ...recordset[0], sender_name: prof[0]?.display_name ?? "Someone" };

    emitMessage(planId, message);
    notifyMembers(planId, message, req.user.id).catch((e) => console.error("[notify]", e.message));

    res.status(201).json(message);
  }),
);

// --------------------------------------------------- memberships (notifs)
app.get(
  "/api/memberships",
  requireAuth,
  wrap(async (req, res) => {
    const { recordset } = await query(
      `SELECT id, title FROM dbo.plans WHERE user_id = @uid
       UNION
       SELECT p.id, p.title FROM dbo.plans p
         JOIN dbo.plan_participants pp ON pp.plan_id = p.id
        WHERE pp.user_id = @uid`,
      { uid: UID(req.user.id) },
    );
    res.json({
      plan_ids: recordset.map((r) => r.id),
      titles: Object.fromEntries(recordset.map((r) => [r.id, r.title])),
    });
  }),
);

// ------------------------------------------------------------------ push
app.post(
  "/api/push/subscribe",
  requireAuth,
  wrap(async (req, res) => {
    const { endpoint, p256dh, auth, user_agent } = req.body;
    if (!endpoint || !p256dh || !auth) return res.status(400).json({ error: "Incomplete subscription" });
    // Upsert by endpoint (delete-then-insert; endpoint is NVARCHAR(MAX)).
    await query("DELETE FROM dbo.push_subscriptions WHERE endpoint = @endpoint", { endpoint });
    await query(
      `INSERT INTO dbo.push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent)
       VALUES (@id, @user, @endpoint, @p256dh, @auth, @ua)`,
      {
        id: UID(randomUUID()),
        user: UID(req.user.id),
        endpoint,
        p256dh,
        auth,
        ua: user_agent || null,
      },
    );
    res.json({ ok: true });
  }),
);

app.delete(
  "/api/push/unsubscribe",
  requireAuth,
  wrap(async (req, res) => {
    await query("DELETE FROM dbo.push_subscriptions WHERE endpoint = @endpoint", {
      endpoint: req.body.endpoint,
    });
    res.json({ ok: true });
  }),
);

// -------------------------------------------------------- error handler
app.use((err, _req, res, _next) => {
  console.error("[api error]", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ----------------------------------------------------------------- boot
const PORT = Number(process.env.PORT) || 4000;
const server = http.createServer(app);
initRealtime(server);

ensureSchema()
  .then(() => {
    server.listen(PORT, () => console.log(`[api] listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("[boot] failed to start:", err.message);
    process.exit(1);
  });
