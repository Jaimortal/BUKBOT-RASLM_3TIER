import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE || !process.env.PGPASSWORD) {
  throw new Error("Set PGHOST, PGUSER, PGPASSWORD, and PGDATABASE in .env before running db:push");
}

const databaseUrl = new URL(`postgresql://${process.env.PGHOST}:${process.env.PGPORT || "5432"}/${process.env.PGDATABASE}`);
databaseUrl.username = process.env.PGUSER;
databaseUrl.password = process.env.PGPASSWORD;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl.toString(),
  },
});
