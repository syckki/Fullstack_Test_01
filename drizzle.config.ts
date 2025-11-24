import path from "node:path";
import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(process.cwd(), "backend/.env"),
});

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Ensure the database is provisioned and the environment variable is set.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
