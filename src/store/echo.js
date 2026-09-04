import { create } from "zustand";
import { persist } from "zustand/middleware";

const now = () => new Date().toISOString();

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function touch(state, id) {
  return state.dirty.includes(id) ? state.dirty : [...state.dirty, id];
}

export const useEcho = create()(
  persist(
    (set, get) => ({
      notes: [],
      folders: [],
      activeNoteId: null,
      search: "",
      sidebarOpen: true,
      commandOpen: false,
      panel: null,
      syncState: "offline",
      lastSyncedAt: null,
      dirty: [],

      setActiveNote: (id) => set({ activeNoteId: id }),
      setSearch: (value) => set({ search: value }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setCommandOpen: (open) => set({ commandOpen: open }),
      setPanel: (panel) => set({ panel }),
      setSyncState: (syncState, at) =>
        set((s) => ({ syncState, lastSyncedAt: at === undefined ? s.lastSyncedAt : at })),

      createNote: (folderId = null) => {
        const note = {
          id: uid(),
          folder_id: folderId ?? null,
          title: "Untitled Note",
          content: "",
          is_favorite: false,
          is_archived: false,
          is_deleted: false,
          created_at: now(),
          updated_at: now(),
        };
        set((s) => ({
          notes: [note, ...s.notes],
          activeNoteId: note.id,
          dirty: touch(s, note.id),
        }));
        return note;
      },

      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updated_at: now() } : n)),
          dirty: touch(s, id),
        })),

      toggleFavorite: (id) => {
        const note = get().notes.find((n) => n.id === id);
        if (note) get().updateNote(id, { is_favorite: !note.is_favorite });
      },

      trashNote: (id) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, is_deleted: true, updated_at: now() } : n,
          ),
          activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
          dirty: touch(s, id),
        })),

      restoreNote: (id) => get().updateNote(id, { is_deleted: false }),

      destroyNote: (id) =>
        set((s) => ({
          notes: s.notes.filter((n) => n.id !== id),
          activeNoteId: s.activeNoteId === id ? null : s.activeNoteId,
          dirty: s.dirty.filter((d) => d !== id),
        })),

      createFolder: (name) => {
        const folder = {
          id: uid(),
          name,
          color: null,
          created_at: now(),
          updated_at: now(),
        };
        set((s) => ({ folders: [...s.folders, folder], dirty: touch(s, folder.id) }));
        return folder;
      },

      renameFolder: (id, name) =>
        set((s) => ({
          folders: s.folders.map((f) => (f.id === id ? { ...f, name, updated_at: now() } : f)),
          dirty: touch(s, id),
        })),

      deleteFolder: (id) =>
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id),
          notes: s.notes.map((n) => (n.folder_id === id ? { ...n, folder_id: null } : n)),
          dirty: s.dirty.filter((d) => d !== id),
        })),

      markClean: (ids) => set((s) => ({ dirty: s.dirty.filter((d) => !ids.includes(d)) })),

      mergeRemote: (remoteNotes, remoteFolders) =>
        set((s) => {
          const byId = new Map(s.notes.map((n) => [n.id, n]));
          for (const remote of remoteNotes) {
            const local = byId.get(remote.id);
            // local unsynced edits always win; otherwise newest wins
            if (!local || (!s.dirty.includes(remote.id) && remote.updated_at >= local.updated_at)) {
              byId.set(remote.id, remote);
            }
          }
          const folderIds = new Map(s.folders.map((f) => [f.id, f]));
          for (const remote of remoteFolders) {
            const local = folderIds.get(remote.id);
            if (!local || (!s.dirty.includes(remote.id) && remote.updated_at >= local.updated_at)) {
              folderIds.set(remote.id, remote);
            }
          }
          return {
            notes: [...byId.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
            folders: [...folderIds.values()].sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            ),
          };
        }),

      clearLocal: () =>
        set({ notes: [], folders: [], dirty: [], activeNoteId: null, lastSyncedAt: null }),
    }),
    {
      name: "echonotes-local-v1",
      partialize: (s) => ({
        notes: s.notes,
        folders: s.folders,
        dirty: s.dirty,
        lastSyncedAt: s.lastSyncedAt,
      }),
    },
  ),
);

export const searchNotes = (notes, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return notes;
  return notes.filter(
    (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
  );
};

export function preview(content, length = 90) {
  const text = content
    .replace(/[#*`>_-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 30) return `${day} days ago`;
  return new Date(iso).toLocaleDateString();
}

export function wordCount(content) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  return { words, characters: content.length };
}
