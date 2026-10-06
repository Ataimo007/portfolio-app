import "server-only";
import { Pool, type PoolClient } from "pg";

let pool: Pool;
export function database() {
  if (!process.env.PGHOST || !process.env.PGPASSWORD)
    throw new Error("Database not configured");
  return (pool ??= new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "portfolio",
    user: process.env.PGUSER || "portal",
    password: process.env.PGPASSWORD,
    max: 8,
    connectionTimeoutMillis: 4000,
    idleTimeoutMillis: 30000,
    statement_timeout: 5000,
  }));
}
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await database().connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
