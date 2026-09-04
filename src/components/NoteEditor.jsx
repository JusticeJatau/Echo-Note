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
];

export function NoteEditor({ note }) {
  const { updateNote, toggleFavorite, trashNote, setPanel } = useEcho();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saved, setSaved] = useState(true);
  const editorRef = useRef(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setSaved(true);
  }, [note.id]);

  // debounced auto-save
  useEffect(() => {
    if (title === note.title && content === note.content) return;
    setSaved(false);
    const t = setTimeout(() => {
      updateNote(note.id, { title, content });
      setSaved(true);
    }, 500);
    return () => clearTimeout(t);
  }, [title, content]);

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
          <button onClick={() => setPanel("export")} title="Export" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"><Download className="size-4" /></button>
          <button onClick={() => setPanel("share")} title="Share" className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"><Share2 className="size-4" /></button>
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
        </div>
        <div className="min-h-0 flex-1"><LiveMarkdownEditor value={content} onChange={setContent} editorRef={editorRef} /></div>
      </div>

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
