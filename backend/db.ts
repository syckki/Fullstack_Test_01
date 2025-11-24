import path from "node:path";

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(process.cwd(), "backend/.env"),
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  // host: process.env.DB_HOST,
  // user: process.env.DB_USER,
  // password: process.env.DB_PASSWORD,
  // database: process.env.DB_NAME,
  // port: Number(process.env.DB_PORT) || 3306,
});

export const db = drizzle(pool, { schema, mode: 'default' });

// Función para cerrar conexiones al finalizar (opcional pero recomendado)
export async function closeDatabase() {
  await pool.end();
}

// Para manejar el cierre gracefully
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});
