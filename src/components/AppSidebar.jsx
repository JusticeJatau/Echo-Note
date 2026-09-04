import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ChevronDown,
  Folder as FolderIcon,
  FolderPlus,
  NotebookPen,
  Search,
  Star,
  Trash2,
  Wifi,
  Bell,
  CircleHelp,
  Settings,
  Tag,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useEcho } from "@/store/echo";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/store/notifications";

const links = [
  { to: "/app", label: "All Notes", icon: NotebookPen, exact: true },
  { to: "/app/favorites", label: "Favorites", icon: Star, exact: false },
  { to: "/app/trash", label: "Trash", icon: Trash2, exact: false },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { notes, folders, createFolder, setCommandOpen, setPanel, setSearch, sidebarOpen, toggleSidebar, setSidebarOpen } = useEcho();
  const { user } = useAuth();
  const [newFolder, setNewFolder] = useState(false);
  const [name, setName] = useState("");
  const unreadAlerts = useNotifications((state) => state.alerts.filter((alert) => !alert.read).length);

  const counts = {
    "/app": notes.filter((n) => !n.is_deleted).length,
    "/app/favorites": notes.filter((n) => n.is_favorite && !n.is_deleted).length,
    "/app/trash": notes.filter((n) => n.is_deleted).length,
  };
  const tags = [...new Set(notes.flatMap((note) => note.tags ?? []))].sort();

  useEffect(() => {
    const saved = localStorage.getItem("echonotes-sidebar-open");
    if (saved !== null) setSidebarOpen(saved === "true");
  }, [setSidebarOpen]);

  return (
    <aside className={cn("hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex", sidebarOpen ? "w-[264px]" : "w-[72px]")}>
      <div className={cn("flex items-center gap-2.5 py-5", sidebarOpen ? "px-5" : "flex-col px-3")}>
        <img src="/echo8v-logo.png" alt="Echo8V" className="size-9 shrink-0 object-contain" />
        {sidebarOpen && <span className="min-w-0 flex-1 text-[17px] font-semibold tracking-tight">EchoNotes</span>}
        <button type="button" onClick={toggleSidebar} title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground">{sidebarOpen ? <PanelLeftClose className="size-4"/> : <PanelLeftOpen className="size-4"/>}</button>
      </div>

      <div className={sidebarOpen ? "px-4" : "px-3"}>
        <button
          onClick={() => setCommandOpen(true)}
          title="Search notes"
          className={cn("flex w-full items-center rounded-lg border border-sidebar-border bg-surface py-2 text-sm text-muted-foreground transition-colors hover:border-ring/40", sidebarOpen ? "gap-2 px-3" : "justify-center px-2")}
        >
          <Search className="size-4" />
          {sidebarOpen && <><span className="flex-1 text-left">Search notes...</span><kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ⌘K
          </kbd></>}
        </button>
      </div>

      <nav className="mt-4 space-y-0.5 px-3">
        {links.map((link) => {
          const active = link.exact ? pathname === link.to : pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              title={link.label}
              className={cn(
                "flex h-9 items-center rounded-lg text-sm transition-colors",
                sidebarOpen ? "gap-3 px-3" : "justify-center px-2",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              <link.icon className={cn("size-4", active && "text-primary")} />
              {sidebarOpen && <><span className="flex-1">{link.label}</span><span className="text-xs text-muted-foreground">{counts[link.to]}</span></>}
            </Link>
          );
        })}
      </nav>

      {sidebarOpen && <><div className="mt-6 flex items-center justify-between px-5 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Folders
        </span>
        <button
          onClick={() => setNewFolder((v) => !v)}
          className="rounded-md border border-sidebar-border p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="New folder"
        >
          <FolderPlus className="size-3.5" />
        </button>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
        {newFolder && (
          <form
            className="px-2 py-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              createFolder(name.trim());
              setName("");
              setNewFolder(false);
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name"
              className="w-full rounded-md border border-input bg-surface px-2 py-1.5 text-sm outline-none focus:border-ring"
            />
          </form>
        )}
        {folders.map((folder) => {
          const active = pathname === `/app/folders/${folder.id}`;
          const count = notes.filter((n) => n.folder_id === folder.id && !n.is_deleted).length;
          return (
            <Link
              key={folder.id}
              to="/app/folders/$folderId"
              params={{ folderId: folder.id }}
              className={cn(
                "flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              <FolderIcon className="size-4" />
              <span className="flex-1 truncate">{folder.name}</span>
              <span className="text-xs">{count}</span>
            </Link>
          );
        })}
        {folders.length === 0 && !newFolder && (
          <p className="px-3 py-2 text-xs text-muted-foreground">No folders yet.</p>
        )}
        {tags.length > 0 && <div className="mt-5 border-t border-sidebar-border pt-3"><p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</p>{tags.map((tag) => <button key={tag} onClick={() => { setSearch(`#${tag}`); void navigate({ to: "/app" }); }} className="flex h-8 w-full items-center gap-2 rounded-lg px-3 text-xs text-muted-foreground hover:bg-surface hover:text-foreground"><Tag className="size-3.5"/><span className="truncate">{tag}</span><span className="ml-auto">{notes.filter((note) => (note.tags ?? []).includes(tag) && !note.is_deleted).length}</span></button>)}</div>}
      </div></>}

      {!sidebarOpen && <div className="flex-1"/>}

      {sidebarOpen && <div className="mx-4 mb-3 rounded-xl border border-sidebar-border bg-surface p-3.5">
        <div className="flex items-center gap-2">
          <Wifi className="size-4 text-success" />
          <span className="text-sm font-medium">Offline First</span>
          <span className="ml-auto size-2 rounded-full bg-success" />
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Your notes are saved on this device and available offline.
        </p>
      </div>}

      <div className={cn("mb-3 grid gap-1", sidebarOpen ? "grid-cols-4 px-4" : "grid-cols-1 px-3")}>
        {[
          [Settings, "Settings", () => location.assign("/app/settings")],
          [Bell, "Alerts", () => setPanel("notifications")],
          [CircleHelp, "Help", () => setPanel("help")],
          [Upload, "Import", () => setPanel("import")],
        ].map(([Icon, label, action]) => (
          <button key={label} onClick={action} title={label} className="relative flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] text-muted-foreground hover:bg-surface hover:text-foreground">
            <Icon className="size-4" />{sidebarOpen && label}{label === "Alerts" && unreadAlerts > 0 ? <span className="absolute right-2 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] leading-4 text-white">{unreadAlerts > 9 ? "9+" : unreadAlerts}</span> : null}
          </button>
        ))}
      </div>

      <Link
        to={user ? "/app/profile" : "/login"}
        title={user ? user.email : "Sign in"}
        className={cn("mx-4 mb-4 flex items-center rounded-xl border border-sidebar-border bg-surface py-2.5 transition-colors hover:border-ring/40", sidebarOpen ? "gap-3 px-3" : "justify-center px-2")}
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {(user?.email ?? "G")[0].toUpperCase()}
        </div>
        {sidebarOpen && <><div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user ? (user.user_metadata?.full_name ?? "Your account") : "Guest"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {user ? user.email : "Sign in to sync"}
          </p>
        </div><ChevronDown className="size-4 text-muted-foreground" /></>}
      </Link>
    </aside>
  );
}
