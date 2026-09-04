import { useNavigate } from "@tanstack/react-router";
import { Bell, Download, FileText, HelpCircle, Plus, Share2, Star, Trash2, Settings, Search, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { searchNotes, useEcho } from "@/store/echo";

export function CommandPalette() {
  const navigate = useNavigate();
  const open = useEcho((s) => s.commandOpen);
  const setOpen = useEcho((s) => s.setCommandOpen);
  const notes = useEcho((s) => s.notes);
  const createNote = useEcho((s) => s.createNote);
  const setActiveNote = useEcho((s) => s.setActiveNote);
  const setPanel = useEcho((s) => s.setPanel);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  const results = searchNotes(
    notes.filter((n) => !n.is_deleted),
    query,
  ).slice(0, 6);

  const actions = [
    {
      label: "New note",
      icon: Plus,
      run: () => {
        const note = createNote(null);
        setActiveNote(note.id);
        void navigate({ to: "/app" });
      },
    },
    { label: "Favorites", icon: Star, run: () => void navigate({ to: "/app/favorites" }) },
    { label: "Trash", icon: Trash2, run: () => void navigate({ to: "/app/trash" }) },
    { label: "Settings", icon: Settings, run: () => void navigate({ to: "/app/settings" }) },
    { label: "Share active note", icon: Share2, run: () => setPanel("share") },
    { label: "Export active note", icon: Download, run: () => setPanel("export") },
    { label: "Import Markdown or text", icon: Upload, run: () => setPanel("import") },
    { label: "Notifications", icon: Bell, run: () => setPanel("notifications") },
    { label: "Help & feedback", icon: HelpCircle, run: () => setPanel("help") },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes or run a command…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Actions
          </p>
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                action.run();
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface"
            >
              <action.icon className="size-4 text-muted-foreground" />
              {action.label}
            </button>
          ))}
          {results.length > 0 && (
            <>
              <p className="mt-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </p>
              {results.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setActiveNote(note.id);
                    void navigate({ to: "/app" });
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface"
                >
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="truncate">{note.title || "Untitled"}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
