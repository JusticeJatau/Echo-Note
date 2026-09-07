import * as SQLite from "expo-sqlite";

let database;
export async function getDatabase() {
  if (database) return database;
  database = await SQLite.openDatabaseAsync("echonotes.db");
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, dirty INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, folder_id TEXT, title TEXT NOT NULL,
      content TEXT NOT NULL, tags_json TEXT NOT NULL DEFAULT '[]', is_favorite INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0, is_deleted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, dirty INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS notes_owner_updated_idx ON notes(owner_id, updated_at DESC);
    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT, created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );
  `);
  return database;
}

const toNote = (row) => ({ ...row, tags: JSON.parse(row.tags_json || "[]"), is_favorite: !!row.is_favorite, is_archived: !!row.is_archived, is_deleted: !!row.is_deleted });
export async function listLocalNotes(ownerId) {
  const db = await getDatabase();
  return (await db.getAllAsync("SELECT * FROM notes WHERE owner_id = ? ORDER BY updated_at DESC", ownerId)).map(toNote);
}
export async function saveLocalNote(note, ownerId) {
  const db = await getDatabase();
  await db.runAsync(`INSERT INTO notes (id,owner_id,folder_id,title,content,tags_json,is_favorite,is_archived,is_deleted,created_at,updated_at,dirty)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET folder_id=excluded.folder_id,title=excluded.title,content=excluded.content,
    tags_json=excluded.tags_json,is_favorite=excluded.is_favorite,is_archived=excluded.is_archived,is_deleted=excluded.is_deleted,updated_at=excluded.updated_at,dirty=1`,
    note.id, ownerId, note.folder_id ?? null, note.title, note.content, JSON.stringify(note.tags ?? []), note.is_favorite ? 1 : 0,
    note.is_archived ? 1 : 0, note.is_deleted ? 1 : 0, note.created_at, note.updated_at);
  await db.runAsync(`INSERT OR REPLACE INTO operations (id,owner_id,entity_type,entity_id,operation,payload,created_at,attempts)
    VALUES (?,?,?,?,?,?,?,0)`, `${ownerId}:note:${note.id}`, ownerId, "note", note.id, "upsert", JSON.stringify(note), new Date().toISOString());
}
