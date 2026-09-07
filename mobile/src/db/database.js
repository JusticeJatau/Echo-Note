import * as SQLite from "expo-sqlite";

let database;
const bool = (value) => value ? 1 : 0;
const parse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
const noteFromRow = (row) => ({ ...row, tags: parse(row.tags_json, []), is_favorite: !!row.is_favorite, is_archived: !!row.is_archived, is_deleted: !!row.is_deleted, is_system: !!row.is_system });

export async function getDatabase() {
  if (database) return database;
  database = await SQLite.openDatabaseAsync("echonotes.db");
  const oldNotes = await database.getAllAsync("PRAGMA table_info(notes)");
  if (oldNotes.length && !oldNotes.some((column) => column.name === "owner_id" && column.pk === 2)) {
    await database.execAsync(`
      ALTER TABLE notes RENAME TO notes_legacy;
      CREATE TABLE notes (id TEXT NOT NULL, owner_id TEXT NOT NULL, folder_id TEXT, title TEXT NOT NULL, content TEXT NOT NULL, tags_json TEXT NOT NULL DEFAULT '[]', is_favorite INTEGER NOT NULL DEFAULT 0, is_archived INTEGER NOT NULL DEFAULT 0, is_deleted INTEGER NOT NULL DEFAULT 0, is_system INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, dirty INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (id, owner_id));
      INSERT INTO notes (id,owner_id,folder_id,title,content,tags_json,is_favorite,is_archived,is_deleted,is_system,created_at,updated_at,dirty) SELECT id,owner_id,folder_id,title,content,tags_json,is_favorite,is_archived,is_deleted,0,created_at,updated_at,dirty FROM notes_legacy;
      DROP TABLE notes_legacy;
    `);
  }
  const oldFolders = await database.getAllAsync("PRAGMA table_info(folders)");
  if (oldFolders.length && !oldFolders.some((column) => column.name === "owner_id" && column.pk === 2)) {
    await database.execAsync(`
      ALTER TABLE folders RENAME TO folders_legacy;
      CREATE TABLE folders (id TEXT NOT NULL, owner_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, dirty INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (id, owner_id));
      INSERT INTO folders SELECT id,owner_id,name,color,created_at,updated_at,dirty FROM folders_legacy;
      DROP TABLE folders_legacy;
    `);
  }
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS folders (id TEXT NOT NULL, owner_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, dirty INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (id, owner_id));
    CREATE TABLE IF NOT EXISTS notes (id TEXT NOT NULL, owner_id TEXT NOT NULL, folder_id TEXT, title TEXT NOT NULL, content TEXT NOT NULL, tags_json TEXT NOT NULL DEFAULT '[]', is_favorite INTEGER NOT NULL DEFAULT 0, is_archived INTEGER NOT NULL DEFAULT 0, is_deleted INTEGER NOT NULL DEFAULT 0, is_system INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, dirty INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (id, owner_id));
    CREATE INDEX IF NOT EXISTS notes_owner_updated_idx ON notes(owner_id, updated_at DESC);
    CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT, created_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT);
    CREATE INDEX IF NOT EXISTS operations_owner_created_idx ON operations(owner_id, created_at);
    CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
  `);
  const operationColumns = await database.getAllAsync("PRAGMA table_info(operations)");
  if (!operationColumns.some((column) => column.name === "last_error")) await database.execAsync("ALTER TABLE operations ADD COLUMN last_error TEXT");
  return database;
}

export async function listLocalNotes(ownerId) { return (await (await getDatabase()).getAllAsync("SELECT * FROM notes WHERE owner_id = ? ORDER BY updated_at DESC", ownerId)).map(noteFromRow); }
export async function listLocalFolders(ownerId) { return (await (await getDatabase()).getAllAsync("SELECT * FROM folders WHERE owner_id = ? ORDER BY name COLLATE NOCASE", ownerId)); }
async function queue(db, ownerId, entityType, entityId, operation, payload) { await db.runAsync(`INSERT OR REPLACE INTO operations (id,owner_id,entity_type,entity_id,operation,payload,created_at,attempts,last_error) VALUES (?,?,?,?,?,?,?,0,NULL)`, `${ownerId}:${entityType}:${entityId}`, ownerId, entityType, entityId, operation, payload ? JSON.stringify(payload) : null, new Date().toISOString()); }
export async function saveLocalNote(note, ownerId, shouldQueue = true) {
  const db = await getDatabase();
  await db.runAsync(`INSERT INTO notes (id,owner_id,folder_id,title,content,tags_json,is_favorite,is_archived,is_deleted,is_system,created_at,updated_at,dirty) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id,owner_id) DO UPDATE SET folder_id=excluded.folder_id,title=excluded.title,content=excluded.content,tags_json=excluded.tags_json,is_favorite=excluded.is_favorite,is_archived=excluded.is_archived,is_deleted=excluded.is_deleted,is_system=excluded.is_system,updated_at=excluded.updated_at,dirty=excluded.dirty`, note.id, ownerId, note.folder_id ?? null, note.title, note.content, JSON.stringify(note.tags ?? []), bool(note.is_favorite), bool(note.is_archived), bool(note.is_deleted), bool(note.is_system), note.created_at, note.updated_at, shouldQueue ? 1 : 0);
  if (shouldQueue && !note.is_system) await queue(db, ownerId, "note", note.id, "upsert", note);
}
export async function saveLocalFolder(folder, ownerId, shouldQueue = true) { const db=await getDatabase(); await db.runAsync(`INSERT INTO folders (id,owner_id,name,color,created_at,updated_at,dirty) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id,owner_id) DO UPDATE SET name=excluded.name,color=excluded.color,updated_at=excluded.updated_at,dirty=excluded.dirty`,folder.id,ownerId,folder.name,folder.color??null,folder.created_at,folder.updated_at,shouldQueue?1:0); if(shouldQueue)await queue(db,ownerId,"folder",folder.id,"upsert",folder); }
export async function deleteLocalEntity(ownerId, entityType, id, shouldQueue = true) { const db=await getDatabase();const table=entityType==="note"?"notes":"folders";await db.runAsync(`DELETE FROM ${table} WHERE id=? AND owner_id=?`,id,ownerId);if(shouldQueue)await queue(db,ownerId,entityType,id,"delete",null); }
export async function listOperations(ownerId) { return (await (await getDatabase()).getAllAsync("SELECT * FROM operations WHERE owner_id=? ORDER BY created_at",ownerId)).map(row=>({...row,payload:parse(row.payload,null)})); }
export async function finishOperation(id,ownerId){await(await getDatabase()).runAsync("DELETE FROM operations WHERE id=? AND owner_id=?",id,ownerId)}
export async function failOperation(id,message){await(await getDatabase()).runAsync("UPDATE operations SET attempts=attempts+1,last_error=? WHERE id=?",String(message??"Sync failed"),id)}
export async function markClean(ownerId,entityType,id){const table=entityType==="note"?"notes":"folders";await(await getDatabase()).runAsync(`UPDATE ${table} SET dirty=0 WHERE id=? AND owner_id=?`,id,ownerId)}
export async function clearWorkspace(ownerId){const db=await getDatabase();await db.withTransactionAsync(async()=>{await db.runAsync("DELETE FROM operations WHERE owner_id=?",ownerId);await db.runAsync("DELETE FROM notes WHERE owner_id=?",ownerId);await db.runAsync("DELETE FROM folders WHERE owner_id=?",ownerId)})}
export async function copyWorkspace(fromOwner,toOwner){for(const folder of await listLocalFolders(fromOwner))await saveLocalFolder(folder,toOwner,true);for(const note of (await listLocalNotes(fromOwner)).filter(n=>!n.is_system))await saveLocalNote(note,toOwner,true)}
export async function getPreference(key,fallback=null){const row=await(await getDatabase()).getFirstAsync("SELECT value FROM preferences WHERE key=?",key);return row?parse(row.value,fallback):fallback}
export async function setPreference(key,value){await(await getDatabase()).runAsync("INSERT OR REPLACE INTO preferences (key,value) VALUES (?,?)",key,JSON.stringify(value))}
export async function listAlerts(ownerId){return(await(await getDatabase()).getAllAsync("SELECT * FROM alerts WHERE owner_id=? ORDER BY created_at DESC",ownerId)).map(r=>({...r,read:!!r.read}))}
export async function saveAlert(a,ownerId){await(await getDatabase()).runAsync("INSERT OR REPLACE INTO alerts (id,owner_id,type,title,message,read,created_at) VALUES (?,?,?,?,?,?,?)",a.id,ownerId,a.type,a.title,a.message,bool(a.read),a.created_at)}
export async function updateAlert(id,read){await(await getDatabase()).runAsync("UPDATE alerts SET read=? WHERE id=?",bool(read),id)}
export async function deleteAlert(id){await(await getDatabase()).runAsync("DELETE FROM alerts WHERE id=?",id)}
