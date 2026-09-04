import { Link } from "@tanstack/react-router";
import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEcho } from "@/store/echo";

export function SyncBar() {
  const { user } = useAuth();
  const syncState = useEcho((s) => s.syncState);
  const dirty = useEcho((s) => s.dirty.length);
  const setPanel = useEcho((s) => s.setPanel);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-6">
      {user ? (
        <>
          {syncState === "syncing" ? (
            <Loader2 className="size-4 animate-spin text-primary" />
          ) : syncState === "error" ? (
            <CloudOff className="size-4 text-destructive" />
          ) : (
            <Cloud className="size-4 text-success" />
          )}
          <span className="text-sm text-muted-foreground">
            {syncState === "syncing"
              ? "Syncing…"
              : syncState === "error"
                ? "Sync failed"
                : dirty > 0
                  ? `${dirty} change${dirty === 1 ? "" : "s"} pending`
                  : "All notes synced"}
          </span>
          <button
            onClick={() => setPanel("sync")}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
            Sync now
          </button>
        </>
      ) : (
        <>
          <CloudOff className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Working offline — notes are saved on this device only.
          </span>
          <Link
            to="/login"
            className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Sign in to sync
          </Link>
        </>
      )}
    </header>
  );
}
