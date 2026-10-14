import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** Applies migrations to the test database once before the suite (skipped when no DB is configured). */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  const pool = new Pool({ connectionString: url });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
}
