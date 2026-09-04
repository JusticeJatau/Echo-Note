import { supabase } from "@/integrations/supabase/client";
import { finalizePendingOperations, listPendingOperations, markPendingOperationFailed } from "@/lib/offlineDB";
import { useEcho } from "@/store/echo";
import { useNotifications } from "@/store/notifications";
import { usePreferences } from "@/store/preferences";

const activeSyncs = new Map();
const retryTimers = new Map();
const retryCounts = new Map();
const RETRY_DELAYS = [3000, 10000, 30000];

export function syncNow(userId) {
  if (!userId) return Promise.resolve({ ok: false, reason: "no-user" });
  if (activeSyncs.has(userId)) return activeSyncs.get(userId);
  const task = runSync(userId).finally(() => activeSyncs.delete(userId));
  activeSyncs.set(userId, task);
  return task;
}

export function syncAfterReconnect(userId) {
  clearRetry(userId);
  return syncNow(userId);
}

async function runSync(userId) {
  const ownerId = `user:${userId}`;
  const isCurrentWorkspace = () => useEcho.getState().ownerId === ownerId;
  if (!isCurrentWorkspace()) return { ok: false, reason: "different-workspace" };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    useEcho.getState().setSyncState("offline");
    return { ok: false, reason: "offline" };
  }

  useEcho.getState().setSyncState("syncing");
  let pending = [];

  try {
    pending = await listPendingOperations(ownerId);
    const initialRemote = await fetchRemote(userId);
    const remoteByType = {
      note: new Map(initialRemote.notes.map((item) => [item.id, item])),
      folder: new Map(initialRemote.folders.map((item) => [item.id, item])),
    };
    const completed = [];
    const failures = [];

    for (const operation of sortOperations(pending)) {
      try {
        if (operation.operation === "upsert") {
          const remote = remoteByType[operation.entity_type]?.get(operation.entity_id);
          const localUpdatedAt = operation.payload?.updated_at ?? "";
          if (!remote || localUpdatedAt >= (remote.updated_at ?? "")) {
            await upsertOperation(operation, userId);
          }
        } else if (operation.operation === "delete") {
          await deleteOperation(operation, userId);
        } else {
          throw new Error(`Unsupported queue operation: ${operation.operation}`);
        }
        completed.push(operation);
      } catch (error) {
        failures.push(error);
        await markPendingOperationFailed(operation, error);
      }
    }

    const removed = await finalizePendingOperations(ownerId, completed);
    const stillPending = await listPendingOperations(ownerId);
    const pendingEntityIds = new Set(stillPending.map((operation) => operation.entity_id));
    const cleanIds = removed.map((operation) => operation.entity_id).filter((id) => !pendingEntityIds.has(id));
    if (isCurrentWorkspace() && cleanIds.length) useEcho.getState().markCleanLocal(cleanIds);

    const latestRemote = await fetchRemote(userId);
    if (!isCurrentWorkspace()) return { ok: false, reason: "different-workspace" };
    useEcho.getState().mergeRemote(latestRemote.notes, latestRemote.folders);

    if (failures.length) throw new Error(`${failures.length} queued operation${failures.length === 1 ? "" : "s"} failed`);

    const syncedAt = new Date().toISOString();
    useEcho.getState().setSyncState("synced", syncedAt);
    clearRetry(userId);
    if (pending.length) {
      useNotifications.getState().addAlert({ title: "Sync complete", message: `${removed.length} offline change${removed.length === 1 ? "" : "s"} synced safely.`, type: "success" });
      if (usePreferences.getState().notifications && typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("EchoNotes", { body: "Your offline changes are now synced." });
      }
    }
    return { ok: true, processed: removed.length };
  } catch (error) {
    console.error("sync failed", error);
    if (isCurrentWorkspace()) useEcho.getState().setSyncState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    if ((retryCounts.get(userId) ?? 0) === 0) {
      useNotifications.getState().addAlert({ title: "Sync couldn't finish", message: "Your changes are still safe on this device. EchoNotes will retry automatically.", type: "error" });
    }
    scheduleRetry(userId);
    return { ok: false, reason: "failed", error };
  }
}

async function fetchRemote(userId) {
  const [{ data: notes, error: noteError }, { data: folders, error: folderError }] = await Promise.all([
    supabase.from("notes").select("*").eq("user_id", userId),
    supabase.from("folders").select("*").eq("user_id", userId),
  ]);
  if (noteError) throw noteError;
  if (folderError) throw folderError;
  return {
    notes: (notes ?? []).map(toLocalNote),
    folders: (folders ?? []).map(toLocalFolder),
  };
}

function sortOperations(operations) {
  const priority = { "folder:upsert": 0, "note:upsert": 1, "note:delete": 2, "folder:delete": 3 };
  return [...operations].sort((a, b) => {
    const order = (priority[`${a.entity_type}:${a.operation}`] ?? 9) - (priority[`${b.entity_type}:${b.operation}`] ?? 9);
    return order || a.created_at.localeCompare(b.created_at);
  });
}

async function upsertOperation(operation, userId) {
  if (!operation.payload) throw new Error("Queued upsert has no payload");
  const table = operation.entity_type === "note" ? "notes" : operation.entity_type === "folder" ? "folders" : null;
  if (!table) throw new Error(`Unknown entity type: ${operation.entity_type}`);
  const { error } = await supabase.from(table).upsert({ ...operation.payload, user_id: userId });
  if (error) throw error;
}

async function deleteOperation(operation, userId) {
  const table = operation.entity_type === "note" ? "notes" : operation.entity_type === "folder" ? "folders" : null;
  if (!table) throw new Error(`Unknown entity type: ${operation.entity_type}`);
  const { error } = await supabase.from(table).delete().eq("id", operation.entity_id).eq("user_id", userId);
  if (error) throw error;
}

function scheduleRetry(userId) {
  if (typeof window === "undefined" || retryTimers.has(userId) || !navigator.onLine) return;
  const attempt = retryCounts.get(userId) ?? 0;
  if (attempt >= RETRY_DELAYS.length) return;
  retryCounts.set(userId, attempt + 1);
  const timer = window.setTimeout(() => {
    retryTimers.delete(userId);
    void syncNow(userId);
  }, RETRY_DELAYS[attempt]);
  retryTimers.set(userId, timer);
}

function clearRetry(userId) {
  const timer = retryTimers.get(userId);
  if (timer && typeof window !== "undefined") window.clearTimeout(timer);
  retryTimers.delete(userId);
  retryCounts.delete(userId);
}

function toLocalNote(row) {
  return {
    id: row.id,
    folder_id: row.folder_id ?? null,
    title: row.title ?? "Untitled Note",
    content: row.content ?? "",
    is_favorite: !!row.is_favorite,
    is_archived: !!row.is_archived,
    is_deleted: !!row.is_deleted,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toLocalFolder(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
