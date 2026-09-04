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
  const { user } = useAuth();
  const setSyncState = useEcho((s) => s.setSyncState);

  useEffect(() => {
    if (user) {
      void syncNow(user.id);
    } else {
      setSyncState("offline");
    }
  }, [user?.id]);

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
