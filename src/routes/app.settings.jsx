import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEcho } from "@/store/echo";
import { Bell, ChevronRight, Database, Languages, Lock, Monitor, Palette, SlidersHorizontal, UserRound } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const notes = useEcho((s) => s.notes);
  const folders = useEcho((s) => s.folders);
  const clearLocal = useEcho((s) => s.clearLocal);
  const setPanel = useEcho((s) => s.setPanel);
  const rows = [
    [UserRound, "Account", user ? user.email : "Guest workspace", () => location.assign(user ? "/app/profile" : "/login")],
    [Palette, "Appearance", "Dark theme", null],
    [SlidersHorizontal, "Editor", "Markdown · Autosave", null],
    [Database, "Sync", `${notes.length} notes · ${folders.length} folders`, () => setPanel("sync")],
    [Lock, "Security & Privacy", "Local-first controls", null],
    [Bell, "Notifications", "Activity and reminders", () => setPanel("notifications")],
    [Monitor, "Storage", "Manage local data", null],
    [Languages, "Language", "English", null],
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your workspace, appearance and local data.
      </p>

      <div className="mt-8 max-w-2xl space-y-4">
        <section className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map(([Icon, label, detail, action]) => <button key={label} onClick={action ?? undefined} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface"><Icon className="size-4 text-muted-foreground"/><span className="flex-1 text-sm font-medium">{label}</span><span className="hidden text-xs text-muted-foreground sm:block">{detail}</span><ChevronRight className="size-4 text-muted-foreground"/></button>)}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Local data</h2>
          <p className="mt-1 text-sm text-muted-foreground">Remove the notes and folders currently stored on this device.</p>
          <button
            onClick={() => {
              if (confirm("Remove all notes stored on this device?")) clearLocal();
            }}
            className="mt-3 rounded-lg border border-destructive/50 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
          >
            Clear local data
          </button>
        </section>
      </div>
    </div>
  );
}
