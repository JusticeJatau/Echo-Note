import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "@/components/AuthShell";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search) => ({
    email: typeof search["email"] === "string" ? search["email"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Verify your email — EchoNotes" },
      { name: "description", content: "Confirm your email address to activate EchoNotes sync." },
      { property: "og:title", content: "Verify your email — EchoNotes" },
      { property: "og:description", content: "Confirm your email to activate sync." },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { email } = Route.useSearch();

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        email
          ? `We sent a confirmation link to ${email}. Click it to activate sync.`
          : "We sent you a confirmation link. Click it to activate sync."
      }
      footer={
        <Link to="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <p className="text-sm text-muted-foreground">
        Your notes keep working offline on this device in the meantime.
      </p>
    </AuthShell>
  );
}
