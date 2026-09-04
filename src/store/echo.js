import { create } from "zustand";
import { clearWorkspace, commitWorkspaceChange, loadWorkspace, migrateLegacyLocalStorage, saveWorkspace } from "@/lib/offlineDB";

const now = () => new Date().toISOString();
const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const touch = (state, id) => state.dirty.includes(id) ? state.dirty : [...state.dirty, id];
const snapshot = (state) => ({ notes: state.notes, folders: state.folders, dirty: state.dirty, tombstones: state.tombstones, lastSyncedAt: state.lastSyncedAt });
const persist = (state) => void saveWorkspace(state.ownerId, snapshot(state));
const record = (state, entityType, entityId, operation, payload = null) => {
  void commitWorkspaceChange(state.ownerId, snapshot(state), [{ entityType, entityId, operation, payload }]);
};

let hydrationSequence = 0;

export const useEcho = create((set, get) => ({
  notes: [], folders: [], activeNoteId: null, search: "", sidebarOpen: true,
  commandOpen: false, panel: null, syncState: "offline", lastSyncedAt: null,
  dirty: [], tombstones: { notes: [], folders: [] }, ownerId: null, hydrated: false,

  hydrateLocal: async (ownerId) => {
    const sequence = ++hydrationSequence;
    set({ notes: [], folders: [], activeNoteId: null, dirty: [], tombstones: { notes: [], folders: [] }, ownerId, hydrated: false });
    await migrateLegacyLocalStorage();
    const workspace = await loadWorkspace(ownerId);
    if (sequence !== hydrationSequence) return false;
    set({
      notes: workspace?.notes ?? [], folders: workspace?.folders ?? [], dirty: workspace?.dirty ?? [],
      tombstones: workspace?.tombstones ?? { notes: [], folders: [] },
      lastSyncedAt: workspace?.lastSyncedAt ?? null, ownerId, hydrated: true,
    });
    return true;
  },

  setActiveNote: (id) => set({ activeNoteId: id }),
  setSearch: (search) => set({ search }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setPanel: (panel) => set({ panel }),
  setSyncState: (syncState, at) => {
    set((state) => ({ syncState, lastSyncedAt: at === undefined ? state.lastSyncedAt : at }));
    persist(get());
  },

  createNote: (folderId = null) => {
    const note = { id: uid(), folder_id: folderId, title: "Untitled Note", content: "", is_favorite: false, is_archived: false, is_deleted: false, created_at: now(), updated_at: now() };
    set((state) => ({ notes: [note, ...state.notes], activeNoteId: note.id, dirty: touch(state, note.id) }));
    record(get(), "note", note.id, "upsert", note);
    return note;
  },

  updateNote: (id, patch) => {
    let updated;
    set((state) => ({
      notes: state.notes.map((note) => {
        if (note.id !== id) return note;
        updated = { ...note, ...patch, updated_at: now() };
        return updated;
      }),
      dirty: touch(state, id),
    }));
    if (updated) record(get(), "note", id, "upsert", updated);
  },

  toggleFavorite: (id) => {
    const note = get().notes.find((item) => item.id === id);
    if (note) get().updateNote(id, { is_favorite: !note.is_favorite });
  },
  trashNote: (id) => get().updateNote(id, { is_deleted: true }),
  restoreNote: (id) => get().updateNote(id, { is_deleted: false }),
  destroyNote: (id) => {
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
      activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
      dirty: touch(state, id),
      tombstones: { ...state.tombstones, notes: state.tombstones.notes.includes(id) ? state.tombstones.notes : [...state.tombstones.notes, id] },
    }));
    record(get(), "note", id, "delete");
  },

  createFolder: (name) => {
    const folder = { id: uid(), name, color: null, created_at: now(), updated_at: now() };
    set((state) => ({ folders: [...state.folders, folder], dirty: touch(state, folder.id) }));
    record(get(), "folder", folder.id, "upsert", folder);
    return folder;
  },
  renameFolder: (id, name) => {
    let updated;
    set((state) => ({
      folders: state.folders.map((folder) => {
        if (folder.id !== id) return folder;
        updated = { ...folder, name, updated_at: now() };
        return updated;
      }),
      dirty: touch(state, id),
    }));
    if (updated) record(get(), "folder", id, "upsert", updated);
  },
  deleteFolder: (id) => {
    const changedNotes = [];
    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== id),
      notes: state.notes.map((note) => {
        if (note.folder_id !== id) return note;
        const updated = { ...note, folder_id: null, updated_at: now() };
        changedNotes.push(updated);
        return updated;
      }),
      dirty: [...new Set([...state.dirty, id, ...changedNotes.map((note) => note.id)])],
      tombstones: { ...state.tombstones, folders: state.tombstones.folders.includes(id) ? state.tombstones.folders : [...state.tombstones.folders, id] },
    }));
    const state = get();
    void commitWorkspaceChange(state.ownerId, snapshot(state), [
      { entityType: "folder", entityId: id, operation: "delete", payload: null },
      ...changedNotes.map((note) => ({ entityType: "note", entityId: note.id, operation: "upsert", payload: note })),
    ]);
  },

  markClean: (ids) => {
    set((state) => ({ dirty: state.dirty.filter((id) => !ids.includes(id)) }));
    persist(get());
  },
  markCleanLocal: (ids) => set((state) => ({ dirty: state.dirty.filter((id) => !ids.includes(id)) })),
  mergeRemote: (remoteNotes, remoteFolders) => {
    set((state) => {
      const remoteNoteIds = new Set(remoteNotes.map((note) => note.id));
      const remoteFolderIds = new Set(remoteFolders.map((folder) => folder.id));
      const notes = new Map(state.notes.filter((note) => state.dirty.includes(note.id) || remoteNoteIds.has(note.id)).map((note) => [note.id, note]));
      for (const remote of remoteNotes) {
        if (state.tombstones.notes.includes(remote.id)) continue;
        const local = notes.get(remote.id);
        if (!local || (!state.dirty.includes(remote.id) && remote.updated_at >= local.updated_at)) notes.set(remote.id, remote);
      }
      const folders = new Map(state.folders.filter((folder) => state.dirty.includes(folder.id) || remoteFolderIds.has(folder.id)).map((folder) => [folder.id, folder]));
      for (const remote of remoteFolders) {
        if (state.tombstones.folders.includes(remote.id)) continue;
        const local = folders.get(remote.id);
        if (!local || (!state.dirty.includes(remote.id) && remote.updated_at >= local.updated_at)) folders.set(remote.id, remote);
      }
      return {
        notes: [...notes.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
        folders: [...folders.values()].sort((a, b) => a.created_at.localeCompare(b.created_at)),
      };
    });
    persist(get());
  },
  clearLocal: async () => {
    const ownerId = get().ownerId;
    if (ownerId) await clearWorkspace(ownerId);
    set({ notes: [], folders: [], dirty: [], activeNoteId: null, tombstones: { notes: [], folders: [] }, lastSyncedAt: null });
  },
}));

export const searchNotes = (notes, query) => {
  const value = query.trim().toLowerCase();
  if (!value) return notes;
  return notes.filter((note) => note.title.toLowerCase().includes(value) || note.content.toLowerCase().includes(value));
};
export function preview(content, length = 90) {
  const text = content.replace(/[#*`>_-]/g, "").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}
export function wordCount(content) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  return { words, characters: content.length };
}
