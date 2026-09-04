import { createFileRoute, Link } from "@tanstack/react-router";
import { Cloud, FileText, Folder, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({ component: WelcomePage });

function WelcomePage() {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setLoading(false), 900); return () => clearTimeout(timer); }, []);
  if (loading) return <main className="flex min-h-screen flex-col items-center justify-center bg-background"><img src="/echo8v-logo.png" alt="Echo8V" className="size-28 animate-pulse object-contain drop-shadow-2xl" /><h1 className="mt-5 text-xl font-semibold">Echo8V Notes</h1><div className="mt-7 h-1 w-40 overflow-hidden rounded-full bg-surface"><div className="h-full w-2/3 animate-pulse rounded-full bg-primary" /></div></main>;

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10">
    <div className="absolute left-1/2 top-1/3 size-[420px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
    <section className="relative w-full max-w-lg text-center">
      <img src="/echo8v-logo.png" alt="Echo8V" className="mx-auto size-24 object-contain drop-shadow-xl" />
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Welcome to Echo8V Notes</h1>
      <p className="mt-3 text-sm text-primary">Your thoughts, organized and always with you.</p>
      <div className="mx-auto mt-8 grid max-w-sm grid-cols-2 gap-3 text-left">
        {[[FileText,"Write freely"],[Folder,"Stay organized"],[Search,"Find anything"],[Cloud,"Work offline"]].map(([Icon,label]) => <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-card/70 p-3 text-sm"><Icon className="size-4 text-primary" />{label}</div>)}
      </div>
      <Link to="/app" className="mt-9 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground"><Sparkles className="size-4" />Get Started</Link>
      <p className="mt-4 text-xs text-muted-foreground">Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></p>
    </section>
  </main>;
}
