import { Link, useRouterState } from "@tanstack/react-router";
import { Folder, Menu, NotebookPen, Plus, Search, Star, Trash2 } from "lucide-react";
import { useEcho } from "@/store/echo";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const setCommandOpen = useEcho((s) => s.setCommandOpen);
  return <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-sidebar px-4 lg:hidden"><button className="rounded-lg p-2 text-muted-foreground"><Menu className="size-5" /></button><div className="flex items-center gap-2"><span className="echo-brand-gradient flex size-7 items-center justify-center rounded-lg text-xs font-bold">E</span><b className="text-sm">Echo8V Notes</b></div><button onClick={() => setCommandOpen(true)} className="rounded-lg p-2 text-muted-foreground"><Search className="size-5" /></button></header>;
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const createNote = useEcho((s) => s.createNote);
  const setActiveNote = useEcho((s) => s.setActiveNote);
  const setPanel = useEcho((s) => s.setPanel);
  const items = [["/app/favorites", "Favorites", Star], ["/app/trash", "Trash", Trash2]];
  return <><button onClick={() => { const note = createNote(); setActiveNote(note.id); }} className="fixed bottom-20 right-5 z-30 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl lg:hidden"><Plus className="size-6" /></button><nav className="grid h-16 shrink-0 grid-cols-4 border-t border-border bg-sidebar lg:hidden"><Link to="/app" className={cn("flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground", pathname === "/app" && "text-primary")}><NotebookPen className="size-5"/>Notes</Link><button onClick={() => setPanel("folders")} className="flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground"><Folder className="size-5"/>Folders</button>{items.map(([to, label, Icon]) => { const active = pathname.startsWith(to); return <Link key={to} to={to} className={cn("flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground", active && "text-primary")}><Icon className={cn("size-5", active && "fill-primary/20")} />{label}</Link>; })}</nav></>;
}
