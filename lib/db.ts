import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:nhl-bracket.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

// Auto-migrate: add columns that may not exist yet
const migrations = [
  "ALTER TABLE picks ADD COLUMN predicted_games INTEGER",
  "ALTER TABLE series ADD COLUMN home_team_wins INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE series ADD COLUMN away_team_wins INTEGER NOT NULL DEFAULT 0",
];

const migrationsRan = (async () => {
  for (const sql of migrations) {
    try {
      await client.execute(sql);
    } catch {
      // Column already exists — ignore
    }
  }
})();

export { migrationsRan };
