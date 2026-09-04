import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — EchoNotes" },
      { name: "description", content: "Create an EchoNotes account to sync notes across devices." },
      { property: "og:title", content: "Create your account — EchoNotes" },
      { property: "og:description", content: "Sync your notes across every device." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: name },
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    void navigate({ to: "/verify-email", search: { email } });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return setError("Google sign-in failed. Please try again.");
    if (result.redirected) return;
    void navigate({ to: "/app" });
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Keep your notes safe and synced everywhere."
      onGoogle={google}
      error={error}
      footer={
        <>
          <span className="text-muted-foreground">Already have an account? </span>
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="h-11 w-full rounded-lg border border-input bg-surface px-3.5 text-sm outline-none focus:border-ring"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-11 w-full rounded-lg border border-input bg-surface px-3.5 text-sm outline-none focus:border-ring"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min. 6 characters)"
          className="h-11 w-full rounded-lg border border-input bg-surface px-3.5 text-sm outline-none focus:border-ring"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-11 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
