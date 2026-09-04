import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/share/$shareId")({
  component: SharedNotePage,
  head: () => ({ meta: [{ title: "Shared Note — EchoNotes" }, { name: "robots", content: "noindex, nofollow" }] }),
});

function SharedNotePage() {
  const { shareId } = Route.useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void supabase.from("note_shares").select("title, content, tags, updated_at").eq("share_id", shareId).maybeSingle().then(({ data, error: loadError }) => {
      if (cancelled) return;
      setLoading(false);
      if (loadError || !data) setError("This shared note is unavailable or its owner disabled the link.");
      else setNote(data);
    });
    return () => { cancelled = true; };
  }, [shareId]);

  return <main className="min-h-screen bg-background text-foreground"><header className="border-b border-border bg-sidebar"><div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-5"><img src="/echo8v-logo.png" alt="Echo8V" className="size-9 object-contain"/><div><p className="text-sm font-semibold">EchoNotes</p><p className="text-[11px] text-muted-foreground">Shared read-only note</p></div></div></header><article className="mx-auto max-w-3xl px-5 py-10 md:px-10">{loading ? <div className="py-20 text-center text-sm text-muted-foreground">Opening shared note…</div> : error ? <div className="rounded-2xl border border-border bg-card p-8 text-center"><FileText className="mx-auto size-9 text-muted-foreground"/><h1 className="mt-4 text-lg font-semibold">Note unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p></div> : <><h1 className="text-3xl font-bold tracking-tight md:text-4xl">{note.title}</h1><p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="size-3.5"/>Updated {new Date(note.updated_at).toLocaleString()}</p>{note.tags?.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{note.tags.map((tag) => <span key={tag} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">#{tag}</span>)}</div>}<SharedMarkdown content={note.content}/></>}</article></main>;
}

function InlineText({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|~~[^~]+~~|`[^`]+`|\[\[[^\]]+\]\])/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("~~") && part.endsWith("~~")) return <del key={index}>{part.slice(2, -2)}</del>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-surface px-1.5 py-0.5 text-sm text-primary">{part.slice(1, -1)}</code>;
    if (part.startsWith("[[") && part.endsWith("]]")) return <span key={index} className="text-primary underline decoration-primary/40 underline-offset-4">{part.slice(2, -2)}</span>;
    return part;
  });
}

function SharedMarkdown({ content }) {
  if (!content) return <p className="mt-10 text-muted-foreground">This note is empty.</p>;
  let inCode = false;
  return <div className="mt-10 break-words text-[16px] leading-8">{content.split("\n").map((line, index) => {
    if (line.startsWith("```")) { inCode = !inCode; return null; }
    if (inCode) return <pre key={index} className="overflow-x-auto bg-surface px-4 font-mono text-sm"><code>{line}</code></pre>;
    const heading = line.match(/^(#{1,3})\s+(.+)/);
    if (heading) { const Tag = `h${heading[1].length}`; return <Tag key={index} className="mb-2 mt-7 font-bold"><InlineText text={heading[2]}/></Tag>; }
    if (/^---+$/.test(line.trim())) return <hr key={index} className="my-6 border-border"/>;
    if (line.startsWith("> ")) return <blockquote key={index} className="my-2 border-l-2 border-primary pl-4 italic text-muted-foreground"><InlineText text={line.slice(2)}/></blockquote>;
    const task = line.match(/^- \[([ xX])\] (.*)/);
    if (task) return <p key={index} className="flex gap-2"><span>{task[1] === " " ? "☐" : "☑"}</span><InlineText text={task[2]}/></p>;
    const bullet = line.match(/^[-*+] (.*)/);
    if (bullet) return <p key={index} className="flex gap-2 pl-2"><span>•</span><InlineText text={bullet[1]}/></p>;
    return line ? <p key={index}><InlineText text={line}/></p> : <div key={index} className="h-4"/>;
  })}</div>;
}
