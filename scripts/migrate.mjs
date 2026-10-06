import pg from "pg";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const client = new pg.Client({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "portfolio",
  user: process.env.PGUSER || "portal",
  password: process.env.PGPASSWORD,
  connectionTimeoutMillis: 5000,
});
async function migrate() {
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(740821)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of (await readdir("db/migrations"))
      .filter((x) => x.endsWith(".sql"))
      .sort()) {
      const sql = await readFile("db/migrations/" + name, "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const old = await client.query(
        "SELECT checksum FROM schema_migrations WHERE name=$1",
        [name],
      );
      if (old.rowCount) {
        if (old.rows[0].checksum !== checksum)
          throw Error("Changed applied migration: " + name);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)",
          [name, checksum],
        );
        await client.query("COMMIT");
        console.log("Applied " + name);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }
    console.log("Database migrations verified");
  } finally {
    await client.end();
  }
}
migrate().catch((error) => {
  console.error("Migration failed", error.message);
  process.exitCode = 1;
});
