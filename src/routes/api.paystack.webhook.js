import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const { processPaystackEvent, verifyPaystackSignature } = await import("@/lib/paystack.server");
        if (!(await verifyPaystackSignature(rawBody, signature))) return new Response("Invalid signature", { status: 401 });
        try {
          await processPaystackEvent(JSON.parse(rawBody));
          return new Response("OK", { status: 200 });
        } catch (error) {
          console.error("Paystack webhook failed", error);
          return new Response("Webhook processing failed", { status: 500 });
        }
      },
    },
  },
});
