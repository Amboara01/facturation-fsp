import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function openDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

export const defaultDbPath = path.join(__dirname, "../../storage/db/app.db");

let singleton;

export function getDb() {
  if (!singleton) {
    singleton = openDatabase(defaultDbPath);
  }
  return singleton;
}
