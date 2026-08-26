import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { DATA_DIR } from "../config.js";

export function openDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

export const defaultDbPath = path.join(DATA_DIR, "db/app.db");

let singleton;

export function getDb() {
  if (!singleton) {
    singleton = openDatabase(defaultDbPath);
  }
  return singleton;
}
