// Standalone schema bootstrapper: `npm run db:init`
import "dotenv/config";
import { ensureSchema } from "./db.js";

ensureSchema()
  .then(() => {
    console.log("[db] init complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[db] init failed:", err.message);
    process.exit(1);
  });
