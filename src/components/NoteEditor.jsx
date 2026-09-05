import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Star,
  Strikethrough,
  Trash2,
  Download,
  History,
  MoreHorizontal,
  Share2,
  Sun,
  Cloud,
  Eye,
  FileCode2,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useEcho, wordCount } from "@/store/echo";
import { cn } from "@/lib/utils";
import { LiveMarkdownEditor } from "@/components/LiveMarkdownEditor";
import { usePreferences } from "@/store/preferences";
import { normalizeTags, noteLinks } from "@/lib/noteTools";
import { useNavigate } from "@tanstack/react-router";

const tools = [
  { icon: Heading1, label: "H1", insert: "# " },
  { icon: Heading2, label: "H2", insert: "## " },
  { icon: Heading3, label: "H3", insert: "### " },
  { icon: Bold, label: "Bold", insert: "**bold**" },
  { icon: Italic, label: "Italic", insert: "*italic*" },
  { icon: Strikethrough, label: "Strikethrough", insert: "~~text~~" },
  { icon: Link2, label: "Link", insert: "[label](url)" },
  { icon: Quote, label: "Quote", insert: "> " },
  { icon: Code, label: "Code", insert: "```js\n\n```" },
  { icon: List, label: "Bullet list", insert: "- " },
  { icon: ListOrdered, label: "Numbered list", insert: "1. " },
  { icon: ListTodo, label: "Task", insert: "- [ ] " },
  { icon: Minus, label: "Divider", insert: "\n---\n" },
];

export function NoteEditor({ note }) {
  const readOnly = !!note.is_system;
  const navigate = useNavigate();
  const { notes, openedNoteIds, updateNote, toggleFavorite, trashNote, createNote, closeNoteTab, setPanel, setActiveNote, setSearch } = useEcho();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags ?? []);
  const [tagText, setTagText] = useState("");
  const [saved, setSaved] = useState(true);
  const editorRef = useRef(null);
  const autosaveDelay = usePreferences((state) => state.autosaveDelay);
  const editorMode = usePreferences((state) => state.editorMode);
  const setPreference = usePreferences((state) => state.setPreference);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags ?? []);
    setSaved(true);
  }, [note.id]);

  // debounced auto-save
  useEffect(() => {
    if (readOnly) return;
    if (title === note.title && content === note.content && JSON.stringify(tags) === JSON.stringify(note.tags ?? [])) return;
    setSaved(false);
    const t = setTimeout(() => {
      updateNote(note.id, { title, content, tags });
      setSaved(true);
    }, autosaveDelay);
    return () => clearTimeout(t);
  }, [title, content, tags, autosaveDelay, readOnly]);

  const insert = (snippet) => {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: snippet },
      selection: { anchor: from + snippet.length },
      scrollIntoView: true,
    });
    view.focus();
  };

  const wrapSelection = (before, after = before) => {
    const view = editorRef.current;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);
    view.dispatch({
      changes: { from, to, insert: `${before}${selected}${after}` },
      selection: { anchor: from + before.length, head: from + before.length + selected.length },
      scrollIntoView: true,
    });
    view.focus();
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (readOnly || !(event.ctrlKey || event.metaKey) || !editorRef.current?.hasFocus) return;
      const key = event.key.toLowerCase();
      if (key === "b") { event.preventDefault(); wrapSelection("**"); }
      if (key === "i") { event.preventDefault(); wrapSelection("*"); }
      if (key === "s") { event.preventDefault(); updateNote(note.id, { title, content, tags }); setSaved(true); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [note.id, title, content, tags, readOnly]);

  const addTag = () => {
    const next = normalizeTags([...tags, ...tagText.split(",")]);
    setTags(next);
    setTagText("");
  };

  const outboundTitles = noteLinks(content);
  const outbound = notes.filter((item) => item.id !== note.id && outboundTitles.some((title) => title.toLowerCase() === item.title.toLowerCase()));
  const backlinks = notes.filter((item) => item.id !== note.id && noteLinks(item.content).some((title) => title.toLowerCase() === titleCase(note.title)));
  const openConnection = (id) => {
    setSearch("");
    setActiveNote(id);
    void navigate({ to: "/app" });
  };
  const openNotePanel = (name) => {
    updateNote(note.id, { title, content, tags });
    setSaved(true);
    setPanel(name);
  };

  const stats = wordCount(content);
  const openTabs = openedNoteIds.map((id) => notes.find((item) => item.id === id)).filter(Boolean);
  const saveDraft = () => {
    if (!readOnly && (title !== note.title || content !== note.content || JSON.stringify(tags) !== JSON.stringify(note.tags ?? []))) {
      updateNote(note.id, { title, content, tags });
    }
  };
  const activateTab = (id) => {
    if (id === note.id) return;
    saveDraft();
    setSearch("");
    void navigate({ to: "/app" }).then(() => setActiveNote(id));
  };
  const closeTab = (event, id) => {
    event.stopPropagation();
    if (id === note.id) saveDraft();
    closeNoteTab(id);
  };

  return (
    <section className="hidden min-w-0 flex-1 flex-col bg-background md:flex">
      <div className="flex h-12 min-w-0 items-end border-b border-border bg-sidebar pl-3 pr-2">
        <div className="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto [scrollbar-width:thin]">
          {openTabs.map((tab) => {
            const active = tab.id === note.id;
            const tabTitle = active ? title : tab.title;
            return <button key={tab.id} type="button" onClick={() => activateTab(tab.id)} title={tabTitle || "Untitled Note"} className={cn("group flex h-10 min-w-[132px] max-w-[240px] shrink-0 items-center gap-2 rounded-t-lg border px-3 text-xs transition-colors", active ? "border-border border-b-background bg-background text-foreground" : "border-transparent bg-transparent text-muted-foreground hover:bg-surface hover:text-foreground")}>
              <span className={cn("size-2 shrink-0 rounded-full", tab.is_welcome ? "bg-primary" : active ? "bg-success" : "bg-muted-foreground/40")} />
              <span className="min-w-0 flex-1 truncate text-left">{tabTitle || "Untitled Note"}</span>
              <span role="button" tabIndex={0} aria-label={`Close ${tabTitle || "Untitled Note"}`} onClick={(event) => closeTab(event, tab.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") closeTab(event, tab.id); }} className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-60 hover:bg-surface-2 hover:text-foreground group-hover:opacity-100">
                <X className="size-3" />
              </span>
            </button>;
          })}
        </div>
        <button type="button" onClick={() => createNote()} title="New note" className="mb-1 ml-1 flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"><Plus className="size-4" /></button>
        <div className="mb-1 ml-auto flex items-center gap-1">
          <button title="Theme" className="rounded p-2 text-muted-foreground hover:bg-surface"><Sun className="size-4" /></button>
          <button onClick={() => setPanel("sync")} title="Cloud sync" className="rounded p-2 text-muted-foreground hover:bg-surface"><Cloud className="size-4" /></button>
          <button title="More" className="rounded p-2 text-muted-foreground hover:bg-surface"><MoreHorizontal className="size-4" /></button>
        </div>
      </div>
      <div className="flex items-center gap-1 border-b border-border px-4 py-2">
        {tools.map((tool, i) => (
          <button
            key={tool.label}
            title={tool.label}
            onClick={() => insert(tool.insert)}
            disabled={readOnly}
            className={cn(
              "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35",
              (i === 3 || i === 6 || i === 9) && "ml-2",
            )}
          >
            <tool.icon className="size-4" />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {!readOnly && <button onClick={() => setPanel("history")} title="Note history" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"><History className="size-4" /></button>}
          <button onClick={() => openNotePanel("export")} title="Export" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"><Download className="size-4" /></button>
          {!readOnly && <><button onClick={() => openNotePanel("share")} title="Share" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"><Share2 className="size-4" /></button>
          <button
            onClick={() => toggleFavorite(note.id)}
            title="Favorite"
            className={cn(
              "flex size-8 items-center justify-center rounded-md transition-colors hover:bg-surface",
              note.is_favorite ? "text-warning" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className={cn("size-4", note.is_favorite && "fill-current")} />
          </button>
          <button
            onClick={() => trashNote(note.id)}
            title="Move to trash"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button></>}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-3xl shrink-0 px-10 pb-2 pt-8">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            readOnly={readOnly}
            placeholder="Untitled Note"
            className="w-full bg-transparent text-[32px] font-bold leading-tight tracking-tight outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => readOnly ? <span key={tag} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">#{tag}</span> : <button key={tag} type="button" title="Remove tag" onClick={() => setTags(tags.filter((item) => item !== tag))} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-destructive/10 hover:text-destructive">#{tag} ×</button>)}
            {!readOnly && <form onSubmit={(event) => { event.preventDefault(); addTag(); }} className="flex items-center"><input value={tagText} onChange={(event) => setTagText(event.target.value)} onBlur={addTag} placeholder="+ Add tag" className="h-7 w-24 bg-transparent px-1 text-xs outline-none placeholder:text-muted-foreground focus:w-36"/></form>}
            {readOnly && <span className="ml-auto text-[11px] text-muted-foreground">Built-in guide · Read only</span>}
          </div>
        </div>
        <div className="min-h-0 flex-1"><LiveMarkdownEditor value={content} onChange={setContent} editorRef={editorRef} readOnly={readOnly} /></div>
      </div>

      {(outbound.length > 0 || backlinks.length > 0) && <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-2 text-xs"><span className="text-muted-foreground">Connections:</span>{outbound.map((item) => <button key={`out-${item.id}`} onClick={() => openConnection(item.id)} className="rounded-md bg-primary/10 px-2 py-1 text-primary">→ {item.title}</button>)}{backlinks.map((item) => <button key={`back-${item.id}`} onClick={() => openConnection(item.id)} className="rounded-md bg-surface px-2 py-1 text-muted-foreground hover:text-foreground">← {item.title}</button>)}</div>}

      <div className="flex items-center gap-4 border-t border-border px-6 py-2.5 text-xs text-muted-foreground">
        <span>{stats.words} words</span>
        <span>{stats.characters} characters</span>
        <div className="ml-auto flex items-center gap-4">
          <button type="button" onClick={() => setPreference("editorMode", editorMode === "live-preview" ? "source" : "live-preview")} title="Switch editor mode" className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-surface hover:text-foreground">
            {editorMode === "live-preview" ? <Eye className="size-3.5"/> : <FileCode2 className="size-3.5"/>}
            {editorMode === "live-preview" ? "Live Preview" : "Source Mode"}
          </button>
          <span>{readOnly ? "Built-in note" : saved ? "Saved" : "Saving..."}</span>
        </div>
      </div>
    </section>
  );
}

function titleCase(value) {
  return String(value ?? "").trim().toLowerCase();
}
