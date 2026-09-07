import { create } from "zustand";
import * as Crypto from "expo-crypto";
import { listLocalNotes, saveLocalNote } from "../db/database";

export const useNotesStore = create((set, get) => ({
  notes: [], loading: false,
  load: async (ownerId) => { set({ loading: true }); set({ notes: await listLocalNotes(ownerId), loading: false }); },
  create: async (ownerId) => {
    const now = new Date().toISOString();
    const note = { id: Crypto.randomUUID(), title: "Untitled Note", content: "", tags: [], folder_id: null, is_favorite: false, is_archived: false, is_deleted: false, created_at: now, updated_at: now };
    await saveLocalNote(note, ownerId); set({ notes: [note, ...get().notes] }); return note;
  },
  update: async (id, patch, ownerId) => {
    const current = get().notes.find((note) => note.id === id); if (!current) return;
    const note = { ...current, ...patch, updated_at: new Date().toISOString() };
    await saveLocalNote(note, ownerId); set({ notes: get().notes.map((item) => item.id === id ? note : item) });
  },
}));
