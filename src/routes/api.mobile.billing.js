import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/mobile/billing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { jsonResponse, mobileApiError, requireMobileUser } = await import("@/lib/mobile-api.server");
        try {
          const user = await requireMobileUser(request);
          const body = await request.json().catch(() => ({}));
          const { getPaystackManagementLink, initializePaystackCheckout, verifyPaystackCheckout } = await import("@/lib/paystack.server");

          if (body.action === "checkout") {
            if (!['monthly', 'annually'].includes(body.interval)) return jsonResponse({ error: "Choose monthly or annually." }, 400);
            const returnUrl = typeof body.returnUrl === "string" ? body.returnUrl : "";
            if (!/^(echonotes|exp|exps|exp\+echonotes):\/\//.test(returnUrl)) return jsonResponse({ error: "Invalid mobile return URL." }, 400);
            const origin = process.env["APP_URL"] || new URL(request.url).origin;
            const callbackUrl = `${origin}/api/mobile/billing/callback?return_to=${encodeURIComponent(returnUrl)}`;
            return jsonResponse(await initializePaystackCheckout({
              userId: user.id,
              email: user.email,
              interval: body.interval,
              callbackUrl,
            }));
          }

          if (body.action === "verify") {
            if (typeof body.reference !== "string" || body.reference.length < 10 || body.reference.length > 160) {
              return jsonResponse({ error: "Invalid payment reference." }, 400);
            }
            return jsonResponse(await verifyPaystackCheckout({ userId: user.id, reference: body.reference }));
          }

          if (body.action === "manage") {
            return jsonResponse(await getPaystackManagementLink({ userId: user.id, email: user.email }));
          }

          return jsonResponse({ error: "Unsupported billing action." }, 400);
        } catch (error) {
          return mobileApiError(error);
        }
      },
    },
  },
});
