import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Auth mode: trusted (Windows) only when DB_TRUSTED=true.
// If DB_TRUSTED is not set, fall back to SQL login (Tedious) so msnodesqlv8 isn't required by default.
// Trusted connections need the native msnodesqlv8 driver; SQL logins use Tedious.
const TRUSTED = String(process.env.DB_TRUSTED).toLowerCase() === "true";

let sql;
if (TRUSTED) {
  try {
    sql = (await import("mssql/msnodesqlv8.js")).default;
  } catch (e) {
    throw new Error(
      "Windows (trusted) auth needs the 'msnodesqlv8' driver and the Microsoft ODBC Driver for SQL Server. " +
        "Install both, or set DB_PASSWORD to use SQL login instead. Original error: " +
        e.message,
    );
  }
} else {
  sql = (await import("mssql")).default;
}

// Build "HOST\\INSTANCE" or just "HOST" for the server name.
const serverName = process.env.DB_INSTANCE
  ? `${process.env.DB_SERVER || "localhost"}\\${process.env.DB_INSTANCE}`
  : process.env.DB_SERVER || "localhost";

function buildConfig(database) {
  if (TRUSTED) {
    return {
      server: serverName,
      database,
      driver: "msnodesqlv8",
      options: { trustedConnection: true, trustServerCertificate: true },
      ...(process.env.DB_PORT ? { port: Number(process.env.DB_PORT) } : {}),
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    };
  }
  return {
    server: process.env.DB_SERVER || "localhost",
    database,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      ...(process.env.DB_INSTANCE && !process.env.DB_PORT
        ? { instanceName: process.env.DB_INSTANCE }
        : {}),
      encrypt: false,
      trustServerCertificate: true,
    },
    ...(process.env.DB_PORT ? { port: Number(process.env.DB_PORT) } : {}),
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  };
}

const config = buildConfig(process.env.DB_NAME || "milo");

let poolPromise;

/** Lazily create (once) and return the shared connection pool. */
export function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log(`[db] connected to ${serverName} / ${config.database} (${TRUSTED ? "Windows auth" : "SQL login"})`);
        return pool;
      })
      .catch((err) => {
        poolPromise = undefined; // allow retry on next call
        throw err;
      });
  }
  return poolPromise;
}

/**
 * Run a parameterized query.
 * @param {string} text  T-SQL with @named params
 * @param {Record<string, {type: any, value: any} | any>} params
 */
export async function query(text, params = {}) {
  const pool = await getPool();
  const request = pool.request();
  for (const [name, p] of Object.entries(params)) {
    if (p && typeof p === "object" && "type" in p) request.input(name, p.type, p.value);
    else request.input(name, p);
  }
  return request.query(text);
}

/** Create the database if missing, then run schema.sql batch-by-batch. */
export async function ensureSchema() {
  await ensureDatabaseExists();
  const pool = await getPool();
  const sqlText = await readFile(join(__dirname, "..", "schema.sql"), "utf8");
  const batches = sqlText
    .split(/^\s*GO\s*$/im)
    .map((b) => b.trim())
    .filter(Boolean);
  for (const batch of batches) {
    await pool.request().batch(batch);
  }
  console.log(`[db] schema ready (${batches.length} batches applied)`);
}

/** Connect to the `master` db and CREATE DATABASE if it doesn't exist yet. */
async function ensureDatabaseExists() {
  const masterPool = await new sql.ConnectionPool(buildConfig("master")).connect();
  try {
    const dbName = (process.env.DB_NAME || "milo").replace(/]/g, "]]");
    await masterPool
      .request()
      .query(`IF DB_ID(N'${(process.env.DB_NAME || "milo").replace(/'/g, "''")}') IS NULL CREATE DATABASE [${dbName}];`);
  } finally {
    await masterPool.close();
  }
}

export { sql };
