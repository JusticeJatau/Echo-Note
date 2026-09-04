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
  Link2,
  Lock,
  MessageSquare,
  Radio,
  RefreshCw,
  Share2,
  Sparkles,
  X,
  Folder,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { useEcho } from "@/store/echo";

const panelInfo = {
  sync: { title: "Sync Status", icon: RefreshCw },
  history: { title: "Note History", icon: History },
  share: { title: "Share Note", icon: Share2 },
  export: { title: "Export / Download", icon: Download },
  notifications: { title: "Notifications", icon: Bell },
  help: { title: "Help & Feedback", icon: HelpCircle },
  upgrade: { title: "Upgrade to Pro", icon: Crown },
  folders: { title: "Folders", icon: Folder },
};

function Modal({ title, icon: Icon, children, wide = false }) {
  const setPanel = useEcho((s) => s.setPanel);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={() => setPanel(null)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-hidden rounded-2xl border border-border bg-card shadow-2xl`}
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
  const notes = useEcho((s) => s.notes);
  const dirty = useEcho((s) => s.dirty.length);
  const last = useEcho((s) => s.lastSyncedAt);
  return <div className="p-6">
    <div className="py-4 text-center"><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success"><Check className="size-6" /></span><h3 className="mt-4 text-lg font-semibold text-success">Everything is up to date</h3><p className="mt-1 text-sm text-muted-foreground">Last synced {last ? new Date(last).toLocaleString() : "just now"}</p></div>
    <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface/50 px-4 text-sm"><p className="flex justify-between py-3"><span className="text-muted-foreground">Total notes</span><b>{notes.length}</b></p><p className="flex justify-between py-3"><span className="text-muted-foreground">Pending changes</span><b>{dirty}</b></p><p className="flex justify-between py-3"><span className="text-muted-foreground">Status</span><b className="text-success">Connected</b></p></div>
    <button className="mt-5 h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground">Sync Now</button>
  </div>;
}

function HistoryPanel() {
  const versions = ["Today, 10:30 AM", "Today, 9:15 AM", "Yesterday, 8:45 PM", "May 20, 10:00 AM", "May 19, 6:30 PM"];
  return <div className="p-3"><div className="divide-y divide-border overflow-hidden rounded-xl border border-border">{versions.map((version, index) => <button key={version} className="flex w-full items-center gap-3 bg-surface/30 px-4 py-3 text-left hover:bg-surface"><Clock3 className="size-4 text-muted-foreground" /><span className="flex-1 text-sm">{version}</span><span className="text-xs text-muted-foreground">{index === 0 ? "Current" : "Preview"}</span></button>)}</div><button className="mt-4 w-full py-2 text-sm font-medium text-primary">Restore selected version</button></div>;
}

function SharePanel() {
  const [copied, setCopied] = useState(false);
  return <div className="space-y-5 p-5"><div><p className="text-sm font-medium">Who can access this note?</p><div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-surface p-4"><Link2 className="size-5 text-primary" /><div className="flex-1"><p className="text-sm font-medium">Anyone with the link</p><p className="text-xs text-muted-foreground">Can view only</p></div><button className="text-xs text-primary">Change</button></div></div><div><label className="text-xs text-muted-foreground">Share link</label><div className="mt-2 flex gap-2"><input readOnly value="https://echo8v.app/share/abc123" className="min-w-0 flex-1 rounded-lg border border-input bg-surface px-3 text-sm text-muted-foreground"/><button onClick={() => setCopied(true)} className="flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"><Copy className="size-4" />{copied ? "Copied" : "Copy"}</button></div></div><div className="flex items-center gap-3 border-t border-border pt-4"><Lock className="size-4 text-muted-foreground"/><p className="text-xs text-muted-foreground">Only you can edit this note. Sharing controls will be connected in the backend phase.</p></div></div>;
}

function ExportPanel() {
  const [format, setFormat] = useState("Markdown (.md)");
  return <div className="p-5"><p className="text-sm text-muted-foreground">Choose a format for your note.</p><div className="mt-4 space-y-2">{["Markdown (.md)", "PDF (.pdf)", "Text (.txt)"].map((item) => <button key={item} onClick={() => setFormat(item)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-sm ${format === item ? "border-primary bg-primary/10" : "border-border bg-surface/40"}`}><span className={`size-4 rounded-full border ${format === item ? "border-[5px] border-primary" : "border-muted-foreground"}`} />{item}</button>)}</div><button className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground"><Download className="size-4" />Export Note</button></div>;
}

function NotificationsPanel() {
  const notices = [[Check, "Note synced successfully", "Just now", "text-success"], [Radio, "Note updated on another device", "5m ago", "text-primary"], [Bell, "Reminder: Daily Journal", "1d ago", "text-warning"], [Sparkles, "EchoNotes product update", "2d ago", "text-primary"]];
  return <div className="p-3"><div className="divide-y divide-border overflow-hidden rounded-xl border border-border">{notices.map(([Icon, text, time, color]) => <div key={text} className="flex items-center gap-3 bg-surface/30 px-4 py-3"><Icon className={`size-4 ${color}`} /><p className="flex-1 text-sm">{text}</p><span className="text-xs text-muted-foreground">{time}</span></div>)}</div><button className="mt-3 w-full py-2 text-sm text-primary">Mark all as read</button></div>;
}

function HelpPanel() {
  const items = [[BookOpen, "Documentation"], [FileText, "Keyboard shortcuts"], [MessageSquare, "Report a bug"], [Sparkles, "Request a feature"], [HelpCircle, "About Echo8V Notes"]];
  return <div className="p-3">{items.map(([Icon, label]) => <button key={label} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm hover:bg-surface"><Icon className="size-4 text-muted-foreground"/><span className="flex-1 text-left">{label}</span><span className="text-muted-foreground">›</span></button>)}</div>;
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
  const content = { sync: <SyncPanel />, history: <HistoryPanel />, share: <SharePanel />, export: <ExportPanel />, notifications: <NotificationsPanel />, help: <HelpPanel />, upgrade: <UpgradePanel />, folders: <FoldersPanel /> }[panel];
  return <Modal title={info.title} icon={info.icon} wide={panel === "upgrade"}>{content}</Modal>;
}
