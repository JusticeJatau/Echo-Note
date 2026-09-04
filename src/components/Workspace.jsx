import { Plus, Search, Star, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NoteEditor } from "@/components/NoteEditor";
import { preview, relativeTime, searchNotes, useEcho } from "@/store/echo";
import { cn } from "@/lib/utils";

function Highlight({ text, query }) {
  const value = query.trim().replace(/^#/, "");
  if (!value) return text;
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, index) => part.toLowerCase() === value.toLowerCase() ? <mark key={index} className="rounded bg-warning/25 px-0.5 text-inherit">{part}</mark> : part);
}

export function Workspace({
  title,
  filter,
  emptyTitle,
  emptyHint,
  variant = "notes",
  folderId = null,
}) {
  const [listWidth, setListWidth] = useState(340);
  const {
    notes,
    activeNoteId,
    setActiveNote,
    createNote,
    search,
    setSearch,
    toggleFavorite,
    trashNote,
    restoreNote,
    destroyNote,
  } = useEcho();

  const visible = searchNotes(notes.filter(filter), search).sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at),
  );
  const active = visible.find((n) => n.id === activeNoteId) ?? null;

  useEffect(() => {
    if (!active && visible.length && variant === "notes") setActiveNote(visible[0].id);
  }, [visible.length, active, variant]);

  useEffect(() => {
    const savedWidth = Number(localStorage.getItem("echonotes-note-list-width"));
    if (savedWidth >= 260 && savedWidth <= 520) setListWidth(savedWidth);
  }, []);

  const resizeList = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = listWidth;
    let nextWidth = listWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (moveEvent) => {
      nextWidth = Math.min(520, Math.max(260, startWidth + moveEvent.clientX - startX));
      setListWidth(nextWidth);
    };
    const stop = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("echonotes-note-list-width", String(nextWidth));
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const resizeWithKeyboard = (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const width = Math.min(520, Math.max(260, listWidth + (event.key === "ArrowRight" ? 16 : -16)));
    setListWidth(width);
    localStorage.setItem("echonotes-note-list-width", String(width));
  };

  return (
    <div className="flex h-full min-w-0 flex-1">
      <div style={{ "--note-list-width": `${listWidth}px` }} className="flex w-full shrink-0 flex-col bg-surface/40 md:w-[var(--note-list-width)]">
        <header className="flex h-[60px] items-center gap-2 border-b border-border px-4">
          <h1 className="flex-1 text-[15px] font-semibold">{title}</h1>
          {variant === "notes" && (
            <button
              onClick={() => createNote(folderId)}
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90"
              aria-label="New note"
            >
              <Plus className="size-4" />
            </button>
          )}
        </header>

        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 focus-within:border-ring">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label="Clear search">
                <X className="size-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {visible.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium">{emptyTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">{emptyHint}</p>
            </div>
          )}
          {visible.map((note) => (
            <button
              key={note.id}
              onClick={() => setActiveNote(note.id)}
              className={cn(
                "mb-1.5 w-full rounded-xl border bg-card/50 px-3.5 py-3 text-left transition-colors",
                note.id === activeNoteId
                  ? "border-primary/50 bg-surface"
                  : "border-transparent hover:border-border hover:bg-surface/70",
              )}
            >
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium"><Highlight text={note.title} query={search}/></p>
                {note.is_favorite && (
                  <Star className="size-3.5 shrink-0 fill-current text-warning" />
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                <Highlight text={preview(note.content) || "Empty note"} query={search}/>
              </p>
              {(note.tags ?? []).length > 0 && <div className="mt-2 flex flex-wrap gap-1">{note.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">#{tag}</span>)}</div>}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {relativeTime(note.updated_at)}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  {variant === "notes" ? (
                    <>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(note.id);
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-warning"
                      >
                        <Star className="size-3.5" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          trashNote(note.id);
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreNote(note.id);
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-success"
                      >
                        <RotateCcw className="size-3.5" />
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          destroyNote(note.id);
                        }}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </span>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div role="separator" aria-label="Resize note list" aria-orientation="vertical" tabIndex={0} onPointerDown={resizeList} onDoubleClick={() => { setListWidth(340); localStorage.setItem("echonotes-note-list-width", "340"); }} onKeyDown={resizeWithKeyboard} className="group relative hidden w-1 shrink-0 cursor-col-resize bg-border outline-none hover:bg-primary/60 focus:bg-primary md:block"><span className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/30 group-hover:bg-primary"/></div>

      {active ? (
        <NoteEditor note={active} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background">
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
          {variant === "notes" && (
            <button
              onClick={() => createNote(folderId)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" /> New note
            </button>
          )}
        </div>
      )}
    </div>
  );
}
