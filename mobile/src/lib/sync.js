import NetInfo from "@react-native-community/netinfo";
import { supabase } from "./supabase";
import {
  deleteLocalEntity,
  failOperation,
  finishOperation,
  listLocalFolders,
  listLocalNotes,
  listOperations,
  markClean,
  saveLocalFolder,
  saveLocalNote,
} from "../db/database";
import { useNotesStore } from "../store/notes";
import { useAlerts } from "../store/alerts";

let active = null;
const notePayload = (note, userId) => ({
  id: note.id,
  user_id: userId,
  folder_id: note.folder_id ?? null,
  title: note.title,
  content: note.content,
  tags: note.tags ?? [],
  is_favorite: !!note.is_favorite,
  is_archived: !!note.is_archived,
  is_deleted: !!note.is_deleted,
  created_at: note.created_at,
  updated_at: note.updated_at,
});
const folderPayload = (folder, userId) => ({
  id: folder.id,
  user_id: userId,
  name: folder.name,
  color: folder.color ?? null,
  created_at: folder.created_at,
  updated_at: folder.updated_at,
});
export async function syncNow(userId) {
  if (!userId) return { ok: false, reason: "auth" };
  if (active) return active;
  active = (async () => {
    const network = await NetInfo.fetch();
    if (!network.isConnected) {
      useNotesStore.getState().setSync("offline");
      return { ok: false, reason: "offline" };
    }
    useNotesStore.getState().setSync("syncing");
    try {
      const operations = await listOperations(userId);
      for (const op of operations) {
        const table = op.entity_type === "note" ? "notes" : "folders";
        let result;
        if (op.operation === "delete")
          result = await supabase
            .from(table)
            .delete()
            .eq("id", op.entity_id)
            .eq("user_id", userId);
        else
          result = await supabase
            .from(table)
            .upsert(
              op.entity_type === "note"
                ? notePayload(op.payload, userId)
                : folderPayload(op.payload, userId),
            );
        if (result.error) {
          await failOperation(op.id, result.error.message);
          throw result.error;
        }
        await markClean(userId, op.entity_type, op.entity_id);
        await finishOperation(op.id, userId);
      }
      const [rn, rf] = await Promise.all([
        supabase.from("notes").select("*").eq("user_id", userId),
        supabase.from("folders").select("*").eq("user_id", userId),
      ]);
      if (rn.error) throw rn.error;
      if (rf.error) throw rf.error;
      const localNotes = await listLocalNotes(userId);
      const localFolders = await listLocalFolders(userId);
      const remoteNoteIds = new Set((rn.data ?? []).map((n) => n.id));
      const remoteFolderIds = new Set((rf.data ?? []).map((f) => f.id));
      for (const item of localNotes.filter(
        (note) => !note.dirty && !remoteNoteIds.has(note.id),
      )) {
        await deleteLocalEntity(userId, "note", item.id, false);
      }
      for (const item of localFolders.filter(
        (folder) => !folder.dirty && !remoteFolderIds.has(folder.id),
      )) {
        await deleteLocalEntity(userId, "folder", item.id, false);
      }
      const notes = new Map(
        localNotes
          .filter((n) => n.dirty || remoteNoteIds.has(n.id))
          .map((n) => [n.id, n]),
      );
      const folders = new Map(
        localFolders
          .filter((f) => f.dirty || remoteFolderIds.has(f.id))
          .map((f) => [f.id, f]),
      );
      for (const row of rn.data ?? []) {
        const n = { ...row, tags: row.tags ?? [] };
        const local = notes.get(n.id);
        if (!local || !local.dirty || n.updated_at >= local.updated_at) {
          notes.set(n.id, n);
          await saveLocalNote(n, userId, false);
        }
      }
      for (const row of rf.data ?? []) {
        const local = folders.get(row.id);
        if (!local || !local.dirty || row.updated_at >= local.updated_at) {
          folders.set(row.id, row);
          await saveLocalFolder(row, userId, false);
        }
      }
      const stamp = new Date().toISOString();
      useNotesStore.getState().replaceCloud(
        [...notes.values()].sort((a, b) =>
          b.updated_at.localeCompare(a.updated_at),
        ),
        [...folders.values()],
      );
      useNotesStore.getState().setSync("synced", stamp);
      if (operations.length)
        await useAlerts
          .getState()
          .add(
            "success",
            "Notes synced",
            `${operations.length} pending change${operations.length === 1 ? "" : "s"} synced successfully.`,
          );
      return { ok: true };
    } catch (error) {
      useNotesStore.getState().setSync("error");
      await useAlerts
        .getState()
        .add(
          "error",
          "Sync needs attention",
          error?.message ??
            "Your notes remain safe offline and will retry automatically.",
        );
      return { ok: false, error };
    } finally {
      active = null;
    }
  })();
  return active;
}
export function startAutoSync(userId) {
  if (!userId) return () => {};
  const unsubscribe = NetInfo.addEventListener((s) => {
    if (s.isConnected) void syncNow(userId);
    else useNotesStore.getState().setSync("offline");
  });
  const channel = supabase
    .channel(`mobile-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notes",
        filter: `user_id=eq.${userId}`,
      },
      () => void syncNow(userId),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "folders",
        filter: `user_id=eq.${userId}`,
      },
      () => void syncNow(userId),
    )
    .subscribe();
  void syncNow(userId);
  return () => {
    unsubscribe();
    void supabase.removeChannel(channel);
  };
}
