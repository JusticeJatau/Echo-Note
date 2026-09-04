import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, ChevronRight, Database, Languages, Lock, Monitor, Palette, SlidersHorizontal, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { syncNow } from "@/lib/sync";
import { useEcho } from "@/store/echo";
import { usePreferences } from "@/store/preferences";

export const Route = createFileRoute("/app/settings")({ component: SettingsPage });

function Switch({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-surface-2"}`}><span className={`absolute top-1 size-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} /></button>;
}

function Choice({ active, children, onClick }) {
  return <button type="button" onClick={onClick} className={`rounded-lg border px-3 py-2 text-sm ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/40 hover:bg-surface"}`}>{children}</button>;
}

function formatBytes(bytes) {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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

  async function refreshStorage() {
    if (navigator.storage?.estimate) setStorage(await navigator.storage.estimate());
  }

  useEffect(() => { void refreshStorage(); }, [notes.length, folders.length]);

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
        {section === "editor" && <><h2 className="font-semibold">Editor</h2><div className="mt-5 space-y-5"><label className="block text-sm"><span className="mb-2 block text-muted-foreground">Text size</span><select value={preferences.editorFontSize} onChange={(e) => setPreference("editorFontSize", Number(e.target.value))} className="h-10 w-full rounded-lg border border-input bg-surface px-3"><option value="14">Small — 14px</option><option value="16">Normal — 16px</option><option value="18">Large — 18px</option><option value="20">Extra large — 20px</option></select></label><label className="block text-sm"><span className="mb-2 block text-muted-foreground">Autosave delay</span><select value={preferences.autosaveDelay} onChange={(e) => setPreference("autosaveDelay", Number(e.target.value))} className="h-10 w-full rounded-lg border border-input bg-surface px-3"><option value="300">Fast — 0.3 seconds</option><option value="500">Normal — 0.5 seconds</option><option value="1000">1 second</option><option value="2000">2 seconds</option></select></label><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Spell check</p><p className="text-xs text-muted-foreground">Use your browser's spelling suggestions.</p></div><Switch label="Spell check" checked={preferences.spellCheck} onChange={(value) => setPreference("spellCheck", value)} /></div></div></>}
        {section === "sync" && <><h2 className="font-semibold">Sync</h2><p className="mt-1 text-sm text-muted-foreground">{user ? `Status: ${syncState}. ${lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}.` : "Not synced yet."}` : "Sign in to sync notes across devices."}</p>{user ? <button type="button" disabled={syncState === "syncing"} onClick={() => void syncNow(user.id)} className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{syncState === "syncing" ? "Syncing…" : "Sync now"}</button> : <button type="button" onClick={() => void navigate({ to: "/login" })} className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Sign in</button>}</>}
        {section === "privacy" && <><h2 className="font-semibold">Security & Privacy</h2><div className="mt-5 flex items-start justify-between gap-5"><div><p className="text-sm font-medium">Keep notes available after sign-out</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Copies this account's latest notes into the offline guest workspace when you sign out. Anyone using this browser can then read them.</p></div><Switch label="Keep notes after sign-out" checked={preferences.keepDataAfterLogout} onChange={(value) => setPreference("keepDataAfterLogout", value)} /></div><div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-muted-foreground">When you sign in again, EchoNotes will ask whether to merge the offline copy into your account or keep it separate.</div></>}
        {section === "notifications" && <><h2 className="font-semibold">Notifications</h2><div className="mt-5 flex items-start justify-between gap-5"><div><p className="text-sm font-medium">Sync notifications</p><p className="mt-1 text-xs text-muted-foreground">Notify you when pending offline changes finish syncing.</p></div><Switch label="Sync notifications" checked={preferences.notifications} onChange={(value) => void toggleNotifications(value)} /></div>{typeof Notification !== "undefined" && Notification.permission === "denied" ? <p className="mt-4 text-xs text-destructive">Notifications are blocked in your browser settings.</p> : null}</>}
        {section === "storage" && <><h2 className="font-semibold">Storage</h2><p className="mt-1 text-sm text-muted-foreground">This browser is using approximately {formatBytes(storage.usage)}{storage.quota ? ` of ${formatBytes(storage.quota)} available` : ""}.</p><div className="mt-4 divide-y divide-border rounded-lg border border-border px-3 text-sm"><p className="flex justify-between py-3"><span className="text-muted-foreground">Notes</span><b>{notes.length}</b></p><p className="flex justify-between py-3"><span className="text-muted-foreground">Folders</span><b>{folders.length}</b></p></div><button type="button" onClick={async () => { if (confirm("Remove the active workspace from this device? Cloud data will remain in Supabase.")) { await clearLocal(); await refreshStorage(); } }} className="mt-5 rounded-lg border border-destructive/50 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">Clear this device's workspace</button></>}
        {section === "language" && <><h2 className="font-semibold">Language</h2><p className="mt-1 text-sm text-muted-foreground">Choose the document language used by the browser and editor.</p><select value={preferences.language} onChange={(e) => setPreference("language", e.target.value)} className="mt-5 h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm"><option value="en">English</option><option value="ha">Hausa</option></select></>}
      </section>
    </div>
  </div>;
}
