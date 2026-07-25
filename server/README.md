# chillout server

Express + SQL Server + bcrypt + JWT + Socket.IO API. Replaces the former Supabase backend
(auth, database, realtime chat, notifications).

## Setup

1. **Install deps**
   ```bash
   cd server
   npm install
   ```

2. **Configure** — copy `.env.example` to `.env` and fill in:
   - `DB_SERVER` / `DB_INSTANCE` — your SQL Server, e.g. `LTIN691254` + `SQLEXPRESS`.
     (Connecting by named instance requires the **SQL Server Browser** service running.
     Alternatively set `DB_PORT=1433` and clear `DB_INSTANCE`.)
   - `DB_USER` / `DB_PASSWORD` — a SQL Server login. SQL auth must be enabled on the instance.
   - `JWT_SECRET` — a long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).

3. **Run** — the server auto-creates the `chillout` database and tables on boot:
   ```bash
   npm run dev      # auto-restart on change
   # or: npm start
   ```
   Initialize the schema without starting the server: `npm run db:init`.

## Notes

- Passwords are hashed with **bcrypt** (`bcryptjs`, standard `$2a$` hashes) before storage in `dbo.users`.
- Auth is **JWT** (Bearer token); the frontend stores it in `localStorage`.
- Realtime chat + notification toasts use **Socket.IO** (rooms `plan:<id>` and `user:<id>`).
- `interests` / `availability` are stored as JSON text and (de)serialized by the API.
- Row-level security from the old Supabase schema is reimplemented as server-side authorization
  (`requireAuth` middleware + `isMember` checks).
