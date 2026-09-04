import { supabase } from "@/integrations/supabase/client";
import { useEcho } from "@/store/echo";
import { usePreferences } from "@/store/preferences";

/**
 * Offline-first sync: local storage is always the working copy.
 * When signed in, we pull the cloud copy, merge, then push anything dirty.
 */
export async function syncNow(userId) {
  const store = useEcho.getState();
  const hadPendingChanges = store.dirty.length > 0;
  store.setSyncState("syncing");

  try {
    const [{ data: remoteNotes, error: nErr }, { data: remoteFolders, error: fErr }] =
      await Promise.all([
        supabase.from("notes").select("*").eq("user_id", userId),
        supabase.from("folders").select("*").eq("user_id", userId),
      ]);
    if (nErr) throw nErr;
    if (fErr) throw fErr;

    store.mergeRemote(
      (remoteNotes ?? []).map(toLocalNote),
      (remoteFolders ?? []).map(toLocalFolder),
    );

    const after = useEcho.getState();
    const dirtyFolders = after.folders.filter((f) => after.dirty.includes(f.id));
    const dirtyNotes = after.notes.filter((n) => after.dirty.includes(n.id));

    if (dirtyFolders.length) {
      const { error } = await supabase
        .from("folders")
        .upsert(dirtyFolders.map((f) => ({ ...f, user_id: userId })));
      if (error) throw error;
    }
    if (dirtyNotes.length) {
      const { error } = await supabase
        .from("notes")
        .upsert(dirtyNotes.map((n) => ({ ...n, user_id: userId })));
      if (error) throw error;
    }

    // push any local folders/notes that exist only locally (first sync)
    const knownNoteIds = new Set((remoteNotes ?? []).map((n) => n.id));
    const knownFolderIds = new Set((remoteFolders ?? []).map((f) => f.id));
    const newFolders = after.folders.filter((f) => !knownFolderIds.has(f.id));
    const newNotes = after.notes.filter((n) => !knownNoteIds.has(n.id));
    if (newFolders.length) {
      await supabase.from("folders").upsert(newFolders.map((f) => ({ ...f, user_id: userId })));
    }
    if (newNotes.length) {
      await supabase.from("notes").upsert(newNotes.map((n) => ({ ...n, user_id: userId })));
    }

    store.markClean([...dirtyNotes, ...dirtyFolders].map((i) => i.id));
    store.setSyncState("synced", new Date().toISOString());
    if (hadPendingChanges && usePreferences.getState().notifications && typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("EchoNotes", { body: "Your offline changes are now synced." });
    }
  } catch (error) {
    console.error("sync failed", error);
    store.setSyncState("error");
  }
}

export async function deleteRemote(table, id) {
  await supabase.from(table).delete().eq("id", id);
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
