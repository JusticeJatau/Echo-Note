import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { SyncBar } from "@/components/SyncBar";
import { ProductPanels } from "@/components/ProductPanels";
import { MobileHeader, MobileNav } from "@/components/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { syncNow } from "@/lib/sync";
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

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const ownerId = user ? `user:${user.id}` : "guest";
    void hydrateLocal(ownerId).then((ready) => {
      if (!ready || cancelled) return;
      if (user) void syncNow(user.id);
      else setSyncState("offline");
    });
    return () => { cancelled = true; };
  }, [loading, user?.id, hydrateLocal, setSyncState]);

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
    </div>
  );
}
