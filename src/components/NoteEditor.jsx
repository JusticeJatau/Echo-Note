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
  const navigate = useNavigate();
  const { notes, updateNote, toggleFavorite, trashNote, setPanel, setActiveNote, setSearch } = useEcho();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags ?? []);
  const [tagText, setTagText] = useState("");
  const [saved, setSaved] = useState(true);
  const editorRef = useRef(null);
  const autosaveDelay = usePreferences((state) => state.autosaveDelay);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags ?? []);
    setSaved(true);
  }, [note.id]);

  // debounced auto-save
  useEffect(() => {
    if (title === note.title && content === note.content && JSON.stringify(tags) === JSON.stringify(note.tags ?? [])) return;
    setSaved(false);
    const t = setTimeout(() => {
      updateNote(note.id, { title, content, tags });
      setSaved(true);
    }, autosaveDelay);
    return () => clearTimeout(t);
  }, [title, content, tags, autosaveDelay]);

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
      if (!(event.ctrlKey || event.metaKey) || !editorRef.current?.hasFocus) return;
      const key = event.key.toLowerCase();
      if (key === "b") { event.preventDefault(); wrapSelection("**"); }
      if (key === "i") { event.preventDefault(); wrapSelection("*"); }
      if (key === "s") { event.preventDefault(); updateNote(note.id, { title, content, tags }); setSaved(true); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [note.id, title, content, tags]);

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

  return (
    <section className="hidden min-w-0 flex-1 flex-col bg-background md:flex">
      <div className="flex h-12 items-end border-b border-border bg-sidebar px-3">
        <div className="flex h-10 min-w-0 max-w-[260px] items-center gap-2 rounded-t-lg border border-b-0 border-border bg-background px-3 text-xs">
          <span className="size-2 rounded-full bg-primary" /><span className="truncate">{note.title || "Untitled Note"}</span><span className="ml-auto text-muted-foreground">×</span>
        </div>
        <button className="mb-1 ml-2 rounded p-2 text-muted-foreground hover:bg-surface">+</button>
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
            className={cn(
              "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground",
              (i === 3 || i === 6 || i === 9) && "ml-2",
            )}
          >
            <tool.icon className="size-4" />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setPanel("history")} title="Note history" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"><History className="size-4" /></button>
          <button onClick={() => openNotePanel("export")} title="Export" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"><Download className="size-4" /></button>
          <button onClick={() => openNotePanel("share")} title="Share" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"><Share2 className="size-4" /></button>
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
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-3xl shrink-0 px-10 pb-2 pt-8">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Note"
            className="w-full bg-transparent text-[32px] font-bold leading-tight tracking-tight outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => <button key={tag} type="button" title="Remove tag" onClick={() => setTags(tags.filter((item) => item !== tag))} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-destructive/10 hover:text-destructive">#{tag} ×</button>)}
            <form onSubmit={(event) => { event.preventDefault(); addTag(); }} className="flex items-center"><input value={tagText} onChange={(event) => setTagText(event.target.value)} onBlur={addTag} placeholder="+ Add tag" className="h-7 w-24 bg-transparent px-1 text-xs outline-none placeholder:text-muted-foreground focus:w-36"/></form>
          </div>
        </div>
        <div className="min-h-0 flex-1"><LiveMarkdownEditor value={content} onChange={setContent} editorRef={editorRef} /></div>
      </div>

      {(outbound.length > 0 || backlinks.length > 0) && <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-2 text-xs"><span className="text-muted-foreground">Connections:</span>{outbound.map((item) => <button key={`out-${item.id}`} onClick={() => openConnection(item.id)} className="rounded-md bg-primary/10 px-2 py-1 text-primary">→ {item.title}</button>)}{backlinks.map((item) => <button key={`back-${item.id}`} onClick={() => openConnection(item.id)} className="rounded-md bg-surface px-2 py-1 text-muted-foreground hover:text-foreground">← {item.title}</button>)}</div>}

      <div className="flex items-center gap-4 border-t border-border px-6 py-2.5 text-xs text-muted-foreground">
        <span>{stats.words} words</span>
        <span>{stats.characters} characters</span>
        <div className="ml-auto flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            Markdown <span className="size-1.5 rounded-full bg-success" />
          </span>
          <span>{saved ? "Saved" : "Saving..."}</span>
        </div>
      </div>
    </section>
  );
}

function titleCase(value) {
  return String(value ?? "").trim().toLowerCase();
}
