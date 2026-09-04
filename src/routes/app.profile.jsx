import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEcho } from "@/store/echo";
import { copyWorkspaceToGuest } from "@/lib/offlineDB";
import { usePreferences } from "@/store/preferences";
import { useEffect, useState } from "react";
import { getBillingOverview } from "@/lib/billing";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const setSyncState = useEcho((s) => s.setSyncState);
  const keepDataAfterLogout = usePreferences((s) => s.keepDataAfterLogout);
  const [billing, setBilling] = useState(null);

  useEffect(() => {
    if (!user) return setBilling(null);
    let cancelled = false;
    void getBillingOverview(user.id).then((overview) => { if (!cancelled) setBilling(overview); }).catch((error) => console.error("Could not load plan", error));
    return () => { cancelled = true; };
  }, [user?.id]);

  async function signOut() {
    if (user && keepDataAfterLogout) await copyWorkspaceToGuest(`user:${user.id}`);
    await supabase.auth.signOut();
    setSyncState("offline");
    void navigate({ to: keepDataAfterLogout ? "/app" : "/login", replace: true });
  }

  const name = user?.user_metadata?.["full_name"] ?? "Your account";

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      <div className="mt-8 max-w-2xl rounded-xl border border-border bg-card p-6">
        {user ? (
          <>
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                {(user.email ?? "U")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <button className="mt-5 w-full rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface">Edit profile</button>
            <div className="mt-5 divide-y divide-border rounded-xl border border-border bg-surface/40 px-4 text-sm">
              <p className="flex justify-between py-3"><span className="text-muted-foreground">Plan</span><span className="capitalize">{billing?.plan ?? "Basic"}</span></p>
              <p className="flex justify-between py-3"><span className="text-muted-foreground">Cloud notes</span><span>{billing?.usage.cloudNotes ?? "—"}{billing?.plan === "pro" ? "" : " / 100"}</span></p>
              <p className="flex justify-between py-3"><span className="text-muted-foreground">Devices</span><span>{billing?.devices.length ?? "—"} / {billing?.plan === "pro" ? 5 : 2}</span></p>
            </div>
            <button
              onClick={signOut}
              className="mt-6 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-destructive/50 hover:text-destructive"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              You're browsing as a guest. Your notes live on this device only.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Sign in to sync
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
