import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/billing/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const reference = url.searchParams.get("reference") ?? "";
        const requestedReturn = url.searchParams.get("return_to") ?? "";
        const returnUrl = /^(echonotes|exp|exps|exp\+echonotes):\/\//.test(requestedReturn)
          ? new URL(requestedReturn)
          : new URL("echonotes://billing/callback");
        returnUrl.searchParams.set("reference", reference);
        return new Response(null, {
          status: 302,
          headers: {
            Location: returnUrl.toString(),
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
