import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, ChevronRight, CreditCard, Database, Languages, Lock, Monitor, Palette, SlidersHorizontal, Smartphone, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { syncNow } from "@/lib/sync";
import { useEcho } from "@/store/echo";
import { usePreferences } from "@/store/preferences";
import { formatLimit, getBillingOverview, PLAN_LIMITS, registerCurrentDevice, removeDevice } from "@/lib/billing";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function Switch({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-surface-2"}`}><span className={`absolute left-1 top-1 size-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} /></button>;
}

function Choice({ active, children, onClick }) {
  return <button type="button" onClick={onClick} className={`rounded-lg border px-3 py-2 text-sm ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/40 hover:bg-surface"}`}>{children}</button>;
}

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function UsageRow({ label, used, limit }) {
  const percentage = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return <div className="py-3"><div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><b>{used} / {formatLimit(limit)}</b></div>{limit != null && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-primary" style={{ width: `${percentage}%` }}/></div>}</div>;
}

function BillingSettings({ user, billing, busy, error, onRefresh, onRemoveDevice, onUpgrade }) {
  if (!user) return <><h2 className="font-semibold">Plan & Billing</h2><p className="mt-1 text-sm text-muted-foreground">Sign in to manage cloud limits and synced devices.</p></>;
  if (!billing && busy) return <><h2 className="font-semibold">Plan & Billing</h2><p className="mt-5 text-sm text-muted-foreground">Loading your plan…</p></>;
  const plan = billing?.plan ?? "basic";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.basic;
  return <><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">Plan & Billing</h2><p className="mt-1 text-sm text-muted-foreground">Your current cloud plan and registered sync devices.</p></div><span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">{plan}</span></div>
    {billing?.setupRequired && <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-muted-foreground">Apply the included billing migration in Supabase to activate plan and device tracking.</div>}
    {error && <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
    <div className="mt-5 divide-y divide-border rounded-xl border border-border px-4"><UsageRow label="Cloud notes" used={billing?.usage.cloudNotes ?? 0} limit={limits.cloudNotes}/><UsageRow label="Public share links" used={billing?.usage.shareLinks ?? 0} limit={limits.shareLinks}/><UsageRow label="Sync devices" used={billing?.devices.length ?? 0} limit={limits.devices}/></div>
    <div className="mt-6"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Registered devices</h3><button type="button" disabled={busy} onClick={() => void onRefresh()} className="text-xs text-primary disabled:opacity-50">Refresh</button></div><div className="mt-2 space-y-2">{billing?.devices.map((device) => { const current = device.device_key === billing.currentDeviceKey; return <div key={device.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 p-3"><Smartphone className="size-4 shrink-0 text-muted-foreground"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{device.device_name}{current ? " · This device" : ""}</p><p className="text-[11px] text-muted-foreground">Last used {new Date(device.last_seen_at).toLocaleString()}</p></div>{!current && <button type="button" disabled={busy} onClick={() => void onRemoveDevice(device.id)} title="Remove device" className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"><Trash2 className="size-4"/></button>}</div>; })}{!billing?.devices.length && <p className="rounded-xl border border-border p-4 text-center text-xs text-muted-foreground">No registered sync devices yet.</p>}</div></div>
    {plan === "basic" && <button type="button" onClick={onUpgrade} className="mt-6 h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground">Compare with Pro</button>}
  </>;
}

function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notes = useEcho((s) => s.notes);
  const folders = useEcho((s) => s.folders);
  const clearLocal = useEcho((s) => s.clearLocal);
  const syncState = useEcho((s) => s.syncState);
  const lastSyncedAt = useEcho((s) => s.lastSyncedAt);
  const preferences = usePreferences();
  const setPreference = usePreferences((s) => s.setPreference);
  const [section, setSection] = useState("privacy");
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [billing, setBilling] = useState(null);
  const [billingError, setBillingError] = useState("");
  const [billingBusy, setBillingBusy] = useState(false);

  async function refreshStorage() {
    if (navigator.storage?.estimate) setStorage(await navigator.storage.estimate());
  }

  useEffect(() => { void refreshStorage(); }, [notes.length, folders.length]);

  async function refreshBilling() {
    if (!user) return setBilling(null);
    setBillingBusy(true);
    setBillingError("");
    try {
      await registerCurrentDevice();
      setBilling(await getBillingOverview(user.id));
    } catch (error) {
      console.error("Could not load billing details", error);
      setBillingError("Billing details could not be loaded. Confirm that the billing migration has been applied in Supabase.");
    } finally {
      setBillingBusy(false);
    }
  }

  useEffect(() => { if (user) void refreshBilling(); }, [user?.id]);

  async function disconnectDevice(id) {
    setBillingBusy(true);
    setBillingError("");
    try {
      await removeDevice(id);
      setBilling(await getBillingOverview(user.id));
    } catch (error) {
      console.error("Could not remove device", error);
      setBillingError("That device could not be removed. Please try again while online.");
    } finally {
      setBillingBusy(false);
    }
  }

  async function toggleNotifications(enabled) {
    if (enabled && !("Notification" in window)) {
      setPreference("notifications", false);
      return;
    }
    if (enabled && "Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      setPreference("notifications", permission === "granted");
      return;
    }
    setPreference("notifications", enabled && Notification.permission !== "denied");
  }

  const rows = [
    [UserRound, "account", "Account", user ? user.email : "Guest workspace"],
    [Palette, "appearance", "Appearance", preferences.theme[0].toUpperCase() + preferences.theme.slice(1)],
    [SlidersHorizontal, "editor", "Editor", `${preferences.editorFontSize}px · Autosave`],
    [Database, "sync", "Sync", user ? syncState : "Sign in required"],
    [CreditCard, "billing", "Plan & Billing", user ? `${billing?.plan === "pro" ? "Pro" : "Basic"} plan` : "Sign in required"],
    [Lock, "privacy", "Security & Privacy", preferences.keepDataAfterLogout ? "Available after logout" : "Account data hidden"],
    [Bell, "notifications", "Notifications", preferences.notifications ? "On" : "Off"],
    [Monitor, "storage", "Storage", `${notes.length} notes · ${folders.length} folders`],
    [Languages, "language", "Language", preferences.language === "ha" ? "Hausa" : "English"],
  ];

  function openSection(name) {
    if (name === "account") {
      void navigate({ to: user ? "/app/profile" : "/login" });
      return;
    }
    setSection(name);
  }

  return <div className="flex-1 overflow-y-auto px-4 py-6 md:px-10 md:py-8">
    <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
    <p className="mt-1 text-sm text-muted-foreground">Manage your workspace, appearance and local data.</p>
    <div className="mt-8 grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="h-fit divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {rows.map(([Icon, name, label, detail]) => <button key={name} type="button" onClick={() => openSection(name)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface ${section === name ? "bg-surface" : ""}`}><Icon className="size-4 text-muted-foreground"/><span className="flex-1 text-sm font-medium">{label}</span><span className="hidden max-w-40 truncate text-xs text-muted-foreground sm:block">{detail}</span><ChevronRight className="size-4 text-muted-foreground"/></button>)}
      </section>
      <section className="h-fit rounded-xl border border-border bg-card p-5">
        {section === "appearance" && <><h2 className="font-semibold">Appearance</h2><p className="mt-1 text-sm text-muted-foreground">Choose how EchoNotes looks on this device.</p><div className="mt-5 flex flex-wrap gap-2">{["dark", "light", "system"].map((theme) => <Choice key={theme} active={preferences.theme === theme} onClick={() => setPreference("theme", theme)}>{theme[0].toUpperCase() + theme.slice(1)}</Choice>)}</div></>}
        {section === "editor" && <><h2 className="font-semibold">Editor</h2><div className="mt-5 space-y-5"><div><p className="mb-2 text-sm text-muted-foreground">Writing mode</p><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setPreference("editorMode", "live-preview")} className={`rounded-xl border p-3 text-left ${preferences.editorMode === "live-preview" ? "border-primary bg-primary/10" : "border-border bg-surface/40"}`}><span className="text-sm font-medium">Live Preview</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Hide Markdown symbols except on the line you're editing.</span></button><button type="button" onClick={() => setPreference("editorMode", "source")} className={`rounded-xl border p-3 text-left ${preferences.editorMode === "source" ? "border-primary bg-primary/10" : "border-border bg-surface/40"}`}><span className="text-sm font-medium">Source Mode</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Always display the complete Markdown syntax.</span></button></div></div><label className="block text-sm"><span className="mb-2 block text-muted-foreground">Text size</span><select value={preferences.editorFontSize} onChange={(e) => setPreference("editorFontSize", Number(e.target.value))} className="h-10 w-full rounded-lg border border-input bg-surface px-3"><option value="14">Small — 14px</option><option value="16">Normal — 16px</option><option value="18">Large — 18px</option><option value="20">Extra large — 20px</option></select></label><label className="block text-sm"><span className="mb-2 block text-muted-foreground">Autosave delay</span><select value={preferences.autosaveDelay} onChange={(e) => setPreference("autosaveDelay", Number(e.target.value))} className="h-10 w-full rounded-lg border border-input bg-surface px-3"><option value="300">Fast — 0.3 seconds</option><option value="500">Normal — 0.5 seconds</option><option value="1000">1 second</option><option value="2000">2 seconds</option></select></label><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Spell check</p><p className="text-xs text-muted-foreground">Use your browser's spelling suggestions.</p></div><Switch label="Spell check" checked={preferences.spellCheck} onChange={(value) => setPreference("spellCheck", value)} /></div></div></>}
        {section === "sync" && <><h2 className="font-semibold">Sync</h2><p className="mt-1 text-sm text-muted-foreground">{user ? `Status: ${syncState}. ${lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}.` : "Not synced yet."}` : "Sign in to sync notes across devices."}</p>{user ? <button type="button" disabled={syncState === "syncing"} onClick={() => void syncNow(user.id)} className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{syncState === "syncing" ? "Syncing…" : "Sync now"}</button> : <button type="button" onClick={() => void navigate({ to: "/login" })} className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Sign in</button>}</>}
        {section === "billing" && <BillingSettings user={user} billing={billing} busy={billingBusy} error={billingError} onRefresh={refreshBilling} onRemoveDevice={disconnectDevice} onUpgrade={() => useEcho.getState().setPanel("upgrade")} />}
        {section === "privacy" && <><h2 className="font-semibold">Security & Privacy</h2><div className="mt-5 flex items-start justify-between gap-5"><div><p className="text-sm font-medium">Keep notes available after sign-out</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Copies this account's latest notes into the offline guest workspace when you sign out. Anyone using this browser can then read them.</p></div><Switch label="Keep notes after sign-out" checked={preferences.keepDataAfterLogout} onChange={(value) => setPreference("keepDataAfterLogout", value)} /></div><div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-muted-foreground">When you sign in again, EchoNotes will ask whether to merge the offline copy into your account or keep it separate.</div></>}
        {section === "notifications" && <><h2 className="font-semibold">Notifications</h2><div className="mt-5 flex items-start justify-between gap-5"><div><p className="text-sm font-medium">Sync notifications</p><p className="mt-1 text-xs text-muted-foreground">Notify you when pending offline changes finish syncing.</p></div><Switch label="Sync notifications" checked={preferences.notifications} onChange={(value) => void toggleNotifications(value)} /></div>{typeof Notification !== "undefined" && Notification.permission === "denied" ? <p className="mt-4 text-xs text-destructive">Notifications are blocked in your browser settings.</p> : null}</>}
        {section === "storage" && <><h2 className="font-semibold">Storage</h2><p className="mt-1 text-sm text-muted-foreground">This browser is using approximately {formatBytes(storage.usage)}{storage.quota ? ` of ${formatBytes(storage.quota)} available` : ""}.</p><div className="mt-4 divide-y divide-border rounded-lg border border-border px-3 text-sm"><p className="flex justify-between py-3"><span className="text-muted-foreground">Notes</span><b>{notes.length}</b></p><p className="flex justify-between py-3"><span className="text-muted-foreground">Folders</span><b>{folders.length}</b></p></div><button type="button" onClick={async () => { if (confirm("Remove the active workspace from this device? Cloud data will remain in Supabase.")) { await clearLocal(); await refreshStorage(); } }} className="mt-5 rounded-lg border border-destructive/50 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">Clear this device's workspace</button></>}
        {section === "language" && <><h2 className="font-semibold">Language</h2><p className="mt-1 text-sm text-muted-foreground">Choose the document language used by the browser and editor.</p><select value={preferences.language} onChange={(e) => setPreference("language", e.target.value)} className="mt-5 h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm"><option value="en">English</option><option value="ha">Hausa</option></select></>}
      </section>
    </div>
  </div>;
}
