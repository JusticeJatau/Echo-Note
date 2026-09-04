import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { SyncBar } from "@/components/SyncBar";
import { ProductPanels } from "@/components/ProductPanels";
import { MobileHeader, MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { syncNow } from "@/lib/sync";
import { claimGuestWorkspace, getGuestWorkspaceSummary } from "@/lib/offlineDB";
import { useEcho } from "@/store/echo";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Workspace — EchoNotes" },
      {
        name: "description",
        content: "Write, organize and find your notes. Offline-first, synced when you sign in.",
      },
      { property: "og:title", content: "Workspace — EchoNotes" },
      { property: "og:description", content: "Your notes, organized. Offline-first and fast." },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const setSyncState = useEcho((s) => s.setSyncState);
  const hydrateLocal = useEcho((s) => s.hydrateLocal);
  const hydrated = useEcho((s) => s.hydrated);
  const [guestData, setGuestData] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const ownerId = user ? `user:${user.id}` : "guest";
    void hydrateLocal(ownerId).then((ready) => {
      if (!ready || cancelled) return;
      if (user) {
        void getGuestWorkspaceSummary().then((summary) => {
          if (cancelled) return;
          if (summary.hasData) setGuestData(summary);
          else void syncNow(user.id);
        });
      }
      else setSyncState("offline");
    });
    return () => { cancelled = true; };
  }, [loading, user?.id, hydrateLocal, setSyncState]);

  async function addGuestNotesToAccount() {
    if (!user || claiming) return;
    setClaiming(true);
    setClaimError("");
    try {
      const ownerId = `user:${user.id}`;
      await claimGuestWorkspace(ownerId);
      await hydrateLocal(ownerId);
      setGuestData(null);
      void syncNow(user.id);
    } catch (error) {
      console.error("Could not add guest notes to account", error);
      setClaimError("We couldn't add the notes yet. Your local notes are still safe—please try again.");
    } finally {
      setClaiming(false);
    }
  }

  function keepGuestNotesSeparate() {
    setGuestData(null);
    if (user) void syncNow(user.id);
  }

  if (loading || !hydrated) {
    return <div className="flex h-screen items-center justify-center bg-background text-foreground"><div className="text-center"><img src="/echo8v-logo.png" alt="Echo8V" className="mx-auto size-16 animate-pulse object-contain"/><p className="mt-3 text-sm text-muted-foreground">Opening your local workspace…</p></div></div>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <div className="hidden lg:block"><SyncBar /></div>
        <div className="flex min-h-0 flex-1">
          <Outlet />
        </div>
        <MobileNav />
      </div>
      <CommandPalette />
      <ProductPanels />
      {user && guestData ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-labelledby="guest-notes-title">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <img src="/echo8v-logo.png" alt="" className="size-11 object-contain" />
            <h2 id="guest-notes-title" className="mt-4 text-xl font-semibold">Add your local notes?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              We found {guestData.notes} {guestData.notes === 1 ? "note" : "notes"}
              {guestData.folders ? ` and ${guestData.folders} ${guestData.folders === 1 ? "folder" : "folders"}` : ""} created while you were signed out.
              Add them to this account so they can sync across your devices.
            </p>
            {claimError ? <p className="mt-3 text-sm text-destructive">{claimError}</p> : null}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={claiming} onClick={keepGuestNotesSeparate} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface disabled:opacity-50">
                Keep separate
              </button>
              <button type="button" disabled={claiming} onClick={addGuestNotesToAccount} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {claiming ? "Adding notes…" : "Add to my account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
