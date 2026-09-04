export const WELCOME_NOTE_ID = "echonotes-welcome";

export const WELCOME_NOTE = Object.freeze({
  id: WELCOME_NOTE_ID,
  folder_id: null,
  title: "Welcome to EchoNotes 👋",
  content: `**Your thoughts, organized.**

A fast, minimal and offline-first note app designed for developers, creators and thinkers.

## Features

- ✅ **Offline-first** — Your notes are always available.
- ✅ **Easy formatting** — Write normally and format with the toolbar.
- ✅ **Auto-sync** — Your changes sync when you're back online.
- ✅ **Organized** — Use folders, tags, search and favorites.
- ✅ **Fast and secure** — Your data stays under your control.

\`\`\`js
function buildSomethingGreat() {
  const idea = new Note();
  idea.save();
  return "EchoNotes";
}
\`\`\`

> The best ideas start with a note.`,
  tags: ["welcome"],
  is_favorite: false,
  is_archived: false,
  is_deleted: false,
  is_system: true,
  is_welcome: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
});

export function withWelcomeNote(notes = []) {
  return [WELCOME_NOTE, ...notes.filter((note) => note.id !== WELCOME_NOTE_ID && !note.is_welcome)];
}
