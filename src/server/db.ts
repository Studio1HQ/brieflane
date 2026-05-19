import Database from "better-sqlite3";
import { join } from "path";

// Initialize to the same db as corsair
export const db = new Database(join(process.cwd(), "corsair.db"));
db.pragma("journal_mode = WAL");
