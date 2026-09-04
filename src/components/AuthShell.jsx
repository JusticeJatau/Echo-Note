import { Link } from "@tanstack/react-router";
import { NotebookPen } from "lucide-react";

export function AuthShell({ title, subtitle, children, footer, error, notice, onGoogle }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <Link to="/app" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl echo-brand-gradient">
            <NotebookPen className="size-5 text-primary-foreground" />
          </span>
          <span className="text-lg font-semibold tracking-tight">EchoNotes</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

          {error && (
            <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-4 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
              {notice}
            </p>
          )}

          <div className="mt-5">{children}</div>

          {onGoogle && (
            <>
              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <button
                onClick={onGoogle}
                className="h-11 w-full rounded-lg border border-input bg-surface text-sm font-medium transition-colors hover:border-ring/50"
              >
                Continue with Google
              </button>
            </>
          )}
        </div>

        {footer && <p className="mt-5 text-center text-sm">{footer}</p>}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <Link to="/app" className="hover:text-foreground">
            Continue without an account
          </Link>
        </p>
      </div>
    </main>
  );
}
