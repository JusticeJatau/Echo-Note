const DB_NAME = "echonotes-offline";
const DB_VERSION = 1;
const LEGACY_KEY = "echonotes-local-v1";
const MIGRATION_KEY = "localstorage-v1-migrated";

let databasePromise;
const saveChains = new Map();

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function openOfflineDB() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("workspaces")) database.createObjectStore("workspaces", { keyPath: "owner_id" });
      if (!database.objectStoreNames.contains("operations")) {
        const operations = database.createObjectStore("operations", { keyPath: "id" });
        operations.createIndex("owner_id", "owner_id", { unique: false });
        operations.createIndex("created_at", "created_at", { unique: false });
      }
      if (!database.objectStoreNames.contains("meta")) database.createObjectStore("meta", { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

export async function loadWorkspace(ownerId) {
  await (saveChains.get(ownerId) ?? Promise.resolve()).catch(() => {});
  const database = await openOfflineDB();
  if (!database) return null;
  const transaction = database.transaction("workspaces", "readonly");
  return requestResult(transaction.objectStore("workspaces").get(ownerId));
}

export async function getGuestWorkspaceSummary() {
  const guest = await loadWorkspace("guest");
  return {
    notes: guest?.notes?.length ?? 0,
    folders: guest?.folders?.length ?? 0,
    hasData: !!(guest?.notes?.length || guest?.folders?.length),
  };
}

export async function claimGuestWorkspace(ownerId) {
  if (!ownerId || ownerId === "guest") return { notes: 0, folders: 0 };

  await Promise.all([
    (saveChains.get("guest") ?? Promise.resolve()).catch(() => {}),
    (saveChains.get(ownerId) ?? Promise.resolve()).catch(() => {}),
  ]);

  const database = await openOfflineDB();
  if (!database) return { notes: 0, folders: 0 };

  const transaction = database.transaction(["workspaces", "operations"], "readwrite");
  const completed = transactionDone(transaction);
  const workspaceStore = transaction.objectStore("workspaces");
  const operationStore = transaction.objectStore("operations");
  const guest = await requestResult(workspaceStore.get("guest"));
  const current = await requestResult(workspaceStore.get(ownerId));

  if (!guest?.notes?.length && !guest?.folders?.length) {
    await completed;
    return { notes: 0, folders: 0 };
  }

  const mergeByNewest = (accountItems = [], guestItems = []) => {
    const merged = new Map(accountItems.map((item) => [item.id, item]));
    guestItems.forEach((item) => {
      const existing = merged.get(item.id);
      if (!existing || (item.updated_at ?? "") > (existing.updated_at ?? "")) merged.set(item.id, item);
    });
    return [...merged.values()];
  };

  const guestNotes = guest.notes ?? [];
  const guestFolders = guest.folders ?? [];
  const notes = mergeByNewest(current?.notes, guestNotes).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const folders = mergeByNewest(current?.folders, guestFolders).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const claimedIds = [...guestFolders.map((item) => item.id), ...guestNotes.map((item) => item.id)];
  const dirty = [...new Set([...(current?.dirty ?? []), ...claimedIds])];
  const tombstones = {
    notes: current?.tombstones?.notes ?? [],
    folders: current?.tombstones?.folders ?? [],
  };

  workspaceStore.put({
    owner_id: ownerId,
    notes,
    folders,
    dirty,
    tombstones,
    lastSyncedAt: current?.lastSyncedAt ?? null,
    saved_at: new Date().toISOString(),
  });

  const createdAt = new Date().toISOString();
  [...guestFolders.map((payload) => ({ entityType: "folder", payload })), ...guestNotes.map((payload) => ({ entityType: "note", payload }))]
    .forEach(({ entityType, payload }) => {
      operationStore.put({
        id: `${ownerId}:${entityType}:${payload.id}`,
        owner_id: ownerId,
        entity_type: entityType,
        entity_id: payload.id,
        operation: "upsert",
        payload,
        created_at: createdAt,
        attempts: 0,
      });
    });

  workspaceStore.delete("guest");
  const guestOperations = operationStore.index("owner_id").openKeyCursor(IDBKeyRange.only("guest"));
  guestOperations.onsuccess = () => {
    const cursor = guestOperations.result;
    if (!cursor) return;
    operationStore.delete(cursor.primaryKey);
    cursor.continue();
  };

  await completed;
  return { notes: guestNotes.length, folders: guestFolders.length };
}

async function writeWorkspace(ownerId, snapshot) {
  const database = await openOfflineDB();
  if (!database) return;
  const transaction = database.transaction("workspaces", "readwrite");
  transaction.objectStore("workspaces").put({ owner_id: ownerId, ...snapshot, saved_at: new Date().toISOString() });
  await transactionDone(transaction);
}

export function saveWorkspace(ownerId, snapshot) {
  if (!ownerId) return Promise.resolve();
  const previous = saveChains.get(ownerId) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(() => writeWorkspace(ownerId, snapshot));
  saveChains.set(ownerId, next);
  return next;
}

async function writeWorkspaceChange(ownerId, snapshot, operations) {
  const database = await openOfflineDB();
  if (!database) return;
  const transaction = database.transaction(["workspaces", "operations"], "readwrite");
  transaction.objectStore("workspaces").put({ owner_id: ownerId, ...snapshot, saved_at: new Date().toISOString() });
  const operationStore = transaction.objectStore("operations");
  const createdAt = new Date().toISOString();
  operations.forEach(({ entityType, entityId, operation, payload }) => {
    operationStore.put({
      id: `${ownerId}:${entityType}:${entityId}`,
      owner_id: ownerId,
      entity_type: entityType,
      entity_id: entityId,
      operation,
      payload: payload ?? null,
      created_at: createdAt,
      attempts: 0,
    });
  });
  await transactionDone(transaction);
}

export function commitWorkspaceChange(ownerId, snapshot, operations) {
  if (!ownerId) return Promise.resolve();
  const previous = saveChains.get(ownerId) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(() => writeWorkspaceChange(ownerId, snapshot, operations));
  saveChains.set(ownerId, next);
  return next;
}

export async function enqueueOperation({ ownerId, entityType, entityId, operation, payload }) {
  const database = await openOfflineDB();
  if (!database || !ownerId) return;
  const transaction = database.transaction("operations", "readwrite");
  transaction.objectStore("operations").put({
    id: `${ownerId}:${entityType}:${entityId}`,
    owner_id: ownerId,
    entity_type: entityType,
    entity_id: entityId,
    operation,
    payload: payload ?? null,
    created_at: new Date().toISOString(),
    attempts: 0,
  });
  await transactionDone(transaction);
}

export async function listPendingOperations(ownerId) {
  const database = await openOfflineDB();
  if (!database) return [];
  const transaction = database.transaction("operations", "readonly");
  const operations = await requestResult(transaction.objectStore("operations").index("owner_id").getAll(ownerId));
  return operations.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function removePendingOperations(ids) {
  if (!ids.length) return;
  const database = await openOfflineDB();
  if (!database) return;
  const transaction = database.transaction("operations", "readwrite");
  const store = transaction.objectStore("operations");
  ids.forEach((id) => store.delete(id));
  await transactionDone(transaction);
}

async function deleteWorkspace(ownerId) {
  const database = await openOfflineDB();
  if (!database) return;
  const transaction = database.transaction(["workspaces", "operations"], "readwrite");
  transaction.objectStore("workspaces").delete(ownerId);
  const store = transaction.objectStore("operations");
  const request = store.index("owner_id").openKeyCursor(IDBKeyRange.only(ownerId));
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    store.delete(cursor.primaryKey);
    cursor.continue();
  };
  await transactionDone(transaction);
}

export function clearWorkspace(ownerId) {
  const previous = saveChains.get(ownerId) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(() => deleteWorkspace(ownerId));
  saveChains.set(ownerId, next);
  return next;
}

export async function migrateLegacyLocalStorage() {
  if (typeof localStorage === "undefined") return;
  const database = await openOfflineDB();
  if (!database) return;
  let transaction = database.transaction("meta", "readonly");
  if (await requestResult(transaction.objectStore("meta").get(MIGRATION_KEY))) return;
  const raw = localStorage.getItem(LEGACY_KEY);
  if (raw) {
    try {
      const legacy = JSON.parse(raw)?.state ?? {};
      transaction = database.transaction("workspaces", "readonly");
      const guest = await requestResult(transaction.objectStore("workspaces").get("guest"));
      if (!guest && (legacy.notes?.length || legacy.folders?.length)) {
        await writeWorkspace("guest", {
          notes: legacy.notes ?? [], folders: legacy.folders ?? [], dirty: legacy.dirty ?? [],
          tombstones: { notes: [], folders: [] }, lastSyncedAt: legacy.lastSyncedAt ?? null,
        });
      }
    } catch (error) {
      console.error("Could not migrate legacy EchoNotes data", error);
      return;
    }
  }
  transaction = database.transaction("meta", "readwrite");
  transaction.objectStore("meta").put({ key: MIGRATION_KEY, completed_at: new Date().toISOString() });
  await transactionDone(transaction);
  localStorage.removeItem(LEGACY_KEY);
}
