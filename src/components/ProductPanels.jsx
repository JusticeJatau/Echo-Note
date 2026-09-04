import {
  Bell,
  BookOpen,
  Check,
  Clock3,
  Copy,
  Crown,
  Download,
  FileText,
  HelpCircle,
  History,
  Lock,
  MessageSquare,
  RefreshCw,
  Share2,
  X,
  Folder,
  Plus,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Lightbulb,
  Upload,
  Globe2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useEcho } from "@/store/echo";
import { useAuth } from "@/hooks/useAuth";
import { syncNow } from "@/lib/sync";
import { useNotifications } from "@/store/notifications";
import { supabase } from "@/integrations/supabase/client";
import { downloadText, noteAsMarkdown, parseImportedNote, printNoteAsPdf, safeFilename } from "@/lib/noteTools";

const panelInfo = {
  sync: { title: "Sync Status", icon: RefreshCw },
  history: { title: "Note History", icon: History },
  share: { title: "Share Note", icon: Share2 },
  export: { title: "Export / Download", icon: Download },
  notifications: { title: "Notifications", icon: Bell },
  help: { title: "Help & Feedback", icon: HelpCircle },
  upgrade: { title: "Upgrade to Pro", icon: Crown },
  folders: { title: "Folders", icon: Folder },
  import: { title: "Import Notes", icon: Upload },
};

function Modal({ title, icon: Icon, children, wide = false }) {
  const setPanel = useEcho((s) => s.setPanel);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={() => setPanel(null)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[85vh] w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-hidden rounded-2xl border border-border bg-card shadow-2xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="size-4.5" /></span>
          <h2 className="flex-1 text-base font-semibold">{title}</h2>
          <button onClick={() => setPanel(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-surface hover:text-foreground" aria-label="Close"><X className="size-4" /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function SyncPanel() {
  const { user } = useAuth();
  const notes = useEcho((s) => s.notes);
  const dirty = useEcho((s) => s.dirty.length);
  const last = useEcho((s) => s.lastSyncedAt);
  const syncState = useEcho((s) => s.syncState);
  const headline = !user ? "Sign in to sync" : syncState === "syncing" ? "Syncing your changes…" : syncState === "error" ? "Sync needs another try" : syncState === "offline" ? "Waiting for internet" : dirty ? `${dirty} change${dirty === 1 ? "" : "s"} pending` : "Everything is up to date";
  const statusColor = syncState === "error" ? "text-destructive" : syncState === "offline" ? "text-warning" : "text-success";
  return <div className="p-6">
    <div className="py-4 text-center"><span className={`mx-auto flex size-14 items-center justify-center rounded-full bg-surface ${statusColor}`}><Check className="size-6" /></span><h3 className={`mt-4 text-lg font-semibold ${statusColor}`}>{headline}</h3><p className="mt-1 text-sm text-muted-foreground">{last ? `Last synced ${new Date(last).toLocaleString()}` : "No completed sync yet"}</p></div>
    <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface/50 px-4 text-sm"><p className="flex justify-between py-3"><span className="text-muted-foreground">Total notes</span><b>{notes.length}</b></p><p className="flex justify-between py-3"><span className="text-muted-foreground">Pending changes</span><b>{dirty}</b></p><p className="flex justify-between py-3"><span className="text-muted-foreground">Status</span><b className={statusColor}>{syncState}</b></p></div>
    <button disabled={!user || syncState === "syncing"} onClick={() => user && void syncNow(user.id)} className="mt-5 h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">{!user ? "Sign in to sync" : syncState === "syncing" ? "Syncing…" : "Sync Now"}</button>
  </div>;
}

function HistoryPanel() {
  const versions = ["Today, 10:30 AM", "Today, 9:15 AM", "Yesterday, 8:45 PM", "May 20, 10:00 AM", "May 19, 6:30 PM"];
  return <div className="p-3"><div className="divide-y divide-border overflow-hidden rounded-xl border border-border">{versions.map((version, index) => <button key={version} className="flex w-full items-center gap-3 bg-surface/30 px-4 py-3 text-left hover:bg-surface"><Clock3 className="size-4 text-muted-foreground" /><span className="flex-1 text-sm">{version}</span><span className="text-xs text-muted-foreground">{index === 0 ? "Current" : "Preview"}</span></button>)}</div><button className="mt-4 w-full py-2 text-sm font-medium text-primary">Restore selected version</button></div>;
}

function SharePanel() {
  const { user } = useAuth();
  const notes = useEcho((state) => state.notes);
  const activeNoteId = useEcho((state) => state.activeNoteId);
  const note = notes.find((item) => item.id === activeNoteId);
  const [copied, setCopied] = useState(false);
  const [shareId, setShareId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !note) return;
    let cancelled = false;
    void supabase.from("note_shares").select("share_id").eq("note_id", note.id).maybeSingle().then(({ data }) => {
      if (!cancelled) setShareId(data?.share_id ?? null);
    });
    return () => { cancelled = true; };
  }, [user?.id, note?.id]);

  async function enableSharing() {
    if (!user || !note || !navigator.onLine) return setError("Connect to the internet and sign in before sharing.");
    setBusy(true); setError("");
    const syncResult = await syncNow(user.id);
    if (!syncResult.ok) { setBusy(false); return setError("The note must finish syncing before a share link can be created."); }
    const id = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
    const { error: shareError } = await supabase.from("note_shares").upsert({ share_id: id, note_id: note.id, user_id: user.id, title: note.title, content: note.content, tags: note.tags ?? [] });
    setBusy(false);
    if (shareError) return setError(shareError.message);
    setShareId(id);
  }

  async function disableSharing() {
    if (!user || !note) return;
    setBusy(true); setError("");
    const { error: shareError } = await supabase.from("note_shares").delete().eq("note_id", note.id).eq("user_id", user.id);
    setBusy(false);
    if (shareError) return setError(shareError.message);
    setShareId(null);
  }

  const link = shareId && typeof window !== "undefined" ? `${window.location.origin}/share/${shareId}` : "";
  if (!note) return <div className="p-6 text-center text-sm text-muted-foreground">Open a note before sharing.</div>;
  if (!user) return <div className="p-6 text-center"><Lock className="mx-auto size-8 text-muted-foreground"/><p className="mt-3 text-sm font-medium">Sign in to share notes</p><p className="mt-1 text-xs text-muted-foreground">Your private local notes remain available without an account.</p></div>;

  return <div className="space-y-5 p-5"><div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"><Globe2 className="size-5 text-primary"/><div className="flex-1"><p className="text-sm font-medium">Public read-only link</p><p className="text-xs text-muted-foreground">Only people with the link can view this note.</p></div><span className={`size-2 rounded-full ${shareId ? "bg-success" : "bg-muted-foreground"}`}/></div>{shareId ? <><div><label className="text-xs text-muted-foreground">Share link</label><div className="mt-2 flex gap-2"><input readOnly value={link} className="min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-sm text-muted-foreground"/><button onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); }} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"><Copy className="size-4"/>{copied ? "Copied" : "Copy"}</button></div></div><button disabled={busy} onClick={() => void disableSharing()} className="w-full rounded-lg border border-destructive/40 py-2.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50">Stop sharing</button></> : <button disabled={busy} onClick={() => void enableSharing()} className="h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "Creating link…" : "Create share link"}</button>}{error && <p className="text-xs text-destructive">{error}</p>}<div className="flex items-center gap-3 border-t border-border pt-4"><Lock className="size-4 text-muted-foreground"/><p className="text-xs text-muted-foreground">Viewers cannot edit your note. Disable the link at any time.</p></div></div>;
}

function ExportPanel() {
  const notes = useEcho((state) => state.notes);
  const activeNoteId = useEcho((state) => state.activeNoteId);
  const note = notes.find((item) => item.id === activeNoteId);
  const [format, setFormat] = useState("md");
  const exportNote = () => {
    if (!note) return;
    if (format === "pdf") { printNoteAsPdf(note); return; }
    const markdown = noteAsMarkdown(note);
    downloadText(`${safeFilename(note.title)}.${format}`, format === "md" ? markdown : `${note.title}\n\n${note.content}`, format === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8");
  };
  const exportBackup = () => downloadText(`echonotes-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ version: 1, exported_at: new Date().toISOString(), notes: notes.filter((item) => !item.is_deleted) }, null, 2), "application/json");
  return <div className="p-5"><p className="text-sm text-muted-foreground">Download the current note or back up your complete workspace.</p><div className="mt-4 space-y-2">{[["pdf", "PDF (.pdf)"], ["md", "Markdown (.md)"], ["txt", "Text (.txt)"]].map(([value, label]) => <button key={value} onClick={() => setFormat(value)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-sm ${format === value ? "border-primary bg-primary/10" : "border-border bg-surface/40"}`}><span className={`size-4 rounded-full border ${format === value ? "border-[5px] border-primary" : "border-muted-foreground"}`}/>{label}</button>)}</div><button disabled={!note} onClick={exportNote} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"><Download className="size-4"/>{format === "pdf" ? "Open PDF export" : "Export current note"}</button><button onClick={exportBackup} className="mt-2 h-10 w-full rounded-lg border border-border text-sm hover:bg-surface">Back up all notes (.json)</button>{format === "pdf" && <p className="mt-2 text-center text-xs text-muted-foreground">Choose “Save as PDF” in the print window.</p>}</div>;
}

function ImportPanel() {
  const createNote = useEcho((state) => state.createNote);
  const updateNote = useEcho((state) => state.updateNote);
  const setPanel = useEcho((state) => state.setPanel);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function importFiles(files) {
    const accepted = [...files].filter((file) => /\.(md|markdown|txt)$/i.test(file.name));
    if (!accepted.length) return setMessage("Choose a Markdown or text file.");
    setBusy(true);
    for (const file of accepted) {
      const parsed = parseImportedNote(file.name, await file.text());
      const note = createNote(null);
      updateNote(note.id, parsed);
    }
    setBusy(false);
    setMessage(`${accepted.length} ${accepted.length === 1 ? "note" : "notes"} imported successfully.`);
    window.setTimeout(() => setPanel(null), 900);
  }
  return <div className="p-5"><label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-primary/40 bg-primary/5 px-5 py-10 text-center hover:bg-primary/10"><Upload className="size-8 text-primary"/><span className="mt-3 text-sm font-medium">Choose Markdown or text files</span><span className="mt-1 text-xs text-muted-foreground">You can select several .md or .txt files.</span><input type="file" multiple accept=".md,.markdown,.txt,text/markdown,text/plain" className="hidden" onChange={(event) => void importFiles(event.target.files ?? [])}/></label>{busy && <p className="mt-3 text-center text-xs text-muted-foreground">Importing…</p>}{message && <p className="mt-3 text-center text-xs text-success">{message}</p>}</div>;
}

function NotificationsPanel() {
  const alerts = useNotifications((state) => state.alerts);
  const markAllRead = useNotifications((state) => state.markAllRead);
  const markRead = useNotifications((state) => state.markRead);
  const removeAlert = useNotifications((state) => state.removeAlert);
  const clearAlerts = useNotifications((state) => state.clearAlerts);
  const unread = alerts.filter((alert) => !alert.read).length;
  const iconFor = { success: CheckCircle2, error: AlertCircle, info: Info };
  const colorFor = { success: "text-success", error: "text-destructive", info: "text-primary" };
  const when = (iso) => {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  return <div className="flex max-h-[68vh] flex-col">
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-xs"><span className="text-muted-foreground">{unread ? `${unread} unread` : "You're all caught up"}</span><div className="ml-auto flex gap-3">{unread > 0 && <button onClick={markAllRead} className="text-primary hover:underline">Mark all read</button>}{alerts.length > 0 && <button onClick={() => confirm("Clear all alerts?") && clearAlerts()} className="text-muted-foreground hover:text-destructive">Clear all</button>}</div></div>
    <div className="overflow-y-auto p-3">{alerts.length === 0 ? <div className="py-12 text-center"><Bell className="mx-auto size-9 text-muted-foreground"/><p className="mt-3 text-sm font-medium">No alerts yet</p><p className="mt-1 text-xs text-muted-foreground">Sync and account activity will appear here.</p></div> : <div className="space-y-2">{alerts.map((alert) => { const Icon = iconFor[alert.type] ?? Info; return <div key={alert.id} onMouseEnter={() => !alert.read && markRead(alert.id)} className={`group flex gap-3 rounded-xl border p-3 ${alert.read ? "border-border bg-surface/30" : "border-primary/30 bg-primary/5"}`}><Icon className={`mt-0.5 size-4 shrink-0 ${colorFor[alert.type] ?? "text-primary"}`}/><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-medium">{alert.title}</p>{!alert.read && <span className="size-1.5 rounded-full bg-primary"/>}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{alert.message}</p><p className="mt-1 text-[10px] text-muted-foreground">{when(alert.createdAt)}</p></div><button onClick={() => removeAlert(alert.id)} aria-label="Dismiss alert" className="h-fit rounded-md p-1 text-muted-foreground opacity-0 hover:bg-surface hover:text-destructive group-hover:opacity-100"><X className="size-3.5"/></button></div>; })}</div>}</div>
  </div>;
}

function HelpPanel() {
  const [view, setView] = useState("menu");
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const items = [[BookOpen, "docs", "Getting started"], [FileText, "shortcuts", "Keyboard shortcuts"], [MessageSquare, "bug", "Report a problem"], [Lightbulb, "feature", "Request a feature"], [HelpCircle, "about", "About Echo8V Notes"]];
  const copyReport = async (kind) => {
    if (!text.trim()) return;
    const report = `${kind}\n\n${text.trim()}\n\nApp: Echo8V Notes\nPlatform: ${navigator.userAgent}\nGenerated: ${new Date().toISOString()}`;
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(report);
    else {
      const field = document.createElement("textarea");
      field.value = report;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
  };

  if (view === "menu") return <div className="p-3">{items.map(([Icon, name, label]) => <button key={name} onClick={() => { setView(name); setText(""); setCopied(false); }} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-surface"><Icon className="size-4 text-muted-foreground"/><span className="flex-1 text-left">{label}</span><span className="text-muted-foreground">›</span></button>)}</div>;

  return <div className="max-h-[68vh] overflow-y-auto p-5"><button onClick={() => setView("menu")} className="mb-5 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4"/>Back to Help</button>
    {view === "docs" && <div><h3 className="font-semibold">Getting started</h3><div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground"><p><b className="text-foreground">Create:</b> Select New Note, add a title, then start writing. Changes save automatically to this device.</p><p><b className="text-foreground">Format:</b> Highlight text to open the formatting menu, or use the editor toolbar.</p><p><b className="text-foreground">Tags:</b> Add tags below a note title and select a sidebar tag to filter your notes.</p><p><b className="text-foreground">Link:</b> Type <code>[[Note Title]]</code> to connect notes. Links and backlinks appear below the editor.</p><p><b className="text-foreground">Import:</b> Use Import in the sidebar or command menu for Markdown and text files.</p><p><b className="text-foreground">Sync:</b> Sign in and choose Sync Now. Offline changes remain queued until your connection returns.</p><p><b className="text-foreground">Recover:</b> Deleted notes remain in Trash until you permanently remove them.</p></div></div>}
    {view === "shortcuts" && <div><h3 className="font-semibold">Keyboard shortcuts</h3><div className="mt-4 divide-y divide-border rounded-xl border border-border px-4 text-sm">{[["Ctrl / ⌘ + K", "Open command search"], ["Ctrl / ⌘ + F", "Find and replace in editor"], ["Ctrl / ⌘ + B", "Bold selected text"], ["Ctrl / ⌘ + I", "Italicize selected text"], ["Ctrl / ⌘ + S", "Save immediately"], ["Ctrl / ⌘ + Z", "Undo editing"], ["Escape", "Close a menu or dialog"]].map(([keys, action]) => <p key={keys} className="flex items-center justify-between gap-4 py-3"><span className="text-muted-foreground">{action}</span><kbd className="rounded border border-border bg-surface px-2 py-1 text-xs">{keys}</kbd></p>)}</div></div>}
    {(view === "bug" || view === "feature") && <div><h3 className="font-semibold">{view === "bug" ? "Report a problem" : "Request a feature"}</h3><p className="mt-1 text-sm text-muted-foreground">{view === "bug" ? "Describe what happened, what you expected, and how to reproduce it." : "Explain what you want to do and why it would help."}</p><textarea value={text} onChange={(event) => { setText(event.target.value); setCopied(false); }} rows={7} placeholder={view === "bug" ? "Example: I was editing a note when…" : "It would be useful if EchoNotes could…"} className="mt-4 w-full resize-none rounded-xl border border-input bg-surface p-3 text-sm outline-none focus:border-ring"/><button disabled={!text.trim()} onClick={() => void copyReport(view === "bug" ? "EchoNotes bug report" : "EchoNotes feature request")} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"><Copy className="size-4"/>{copied ? "Copied — ready to share" : "Copy report"}</button><p className="mt-2 text-center text-xs text-muted-foreground">The report stays on your device until you choose where to send it.</p></div>}
    {view === "about" && <div className="text-center"><img src="/echo8v-logo.png" alt="Echo8V" className="mx-auto size-20 object-contain"/><h3 className="mt-4 text-lg font-semibold">Echo8V Notes</h3><p className="mt-1 text-xs text-muted-foreground">Offline-first beta</p><p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-muted-foreground">A focused personal notes workspace built by Echo8V. Your notes are written locally first and can sync securely when you sign in.</p><div className="mt-5 rounded-xl border border-border bg-surface/40 p-4 text-left text-xs text-muted-foreground"><p className="flex justify-between"><span>Local storage</span><span className="text-success">Enabled</span></p><p className="mt-3 flex justify-between"><span>Markdown editor</span><span className="text-success">Enabled</span></p><p className="mt-3 flex justify-between"><span>Cloud sync</span><span>Supabase</span></p></div></div>}
  </div>;
}

function UpgradePanel() {
  return <div className="p-6 text-center"><span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Crown className="size-8" /></span><h3 className="mt-5 text-xl font-semibold">Unlock more with Pro</h3><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">More storage, unlimited devices, advanced history and priority support.</p><div className="mx-auto mt-6 max-w-xs space-y-3 text-left text-sm">{["Unlimited notes", "Unlimited devices", "10 GB storage", "Advanced note history", "Priority support"].map((item) => <p key={item} className="flex items-center gap-3"><Check className="size-4 text-success" />{item}</p>)}</div><button className="mt-7 h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground">Upgrade Now</button></div>;
}

function FoldersPanel() {
  const folders = useEcho((s) => s.folders);
  const notes = useEcho((s) => s.notes);
  const createFolder = useEcho((s) => s.createFolder);
  const [name, setName] = useState("");
  return <div className="p-4"><form onSubmit={(event) => { event.preventDefault(); if (!name.trim()) return; createFolder(name.trim()); setName(""); }} className="mb-4 flex gap-2"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="New folder name" className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-sm outline-none focus:border-ring"/><button className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Plus className="size-4"/></button></form><div className="space-y-2">{folders.map((folder) => <a key={folder.id} href={`/app/folders/${folder.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-4 hover:border-primary/40"><Folder className="size-5 text-primary"/><div className="flex-1"><p className="text-sm font-medium">{folder.name}</p><p className="text-xs text-muted-foreground">{notes.filter((note) => note.folder_id === folder.id && !note.is_deleted).length} notes</p></div><span className="text-muted-foreground">›</span></a>)}{folders.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No folders yet. Create your first folder above.</p>}</div></div>;
}

export function ProductPanels() {
  const panel = useEcho((s) => s.panel);
  if (!panel || !panelInfo[panel]) return null;
  const info = panelInfo[panel];
  const content = { sync: <SyncPanel />, history: <HistoryPanel />, share: <SharePanel />, export: <ExportPanel />, import: <ImportPanel />, notifications: <NotificationsPanel />, help: <HelpPanel />, upgrade: <UpgradePanel />, folders: <FoldersPanel /> }[panel];
  return <Modal title={info.title} icon={info.icon} wide={panel === "upgrade"}>{content}</Modal>;
}
