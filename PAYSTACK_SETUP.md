# EchoNotes Paystack setup

The code is ready for Paystack recurring subscriptions, but checkout remains unavailable until these dashboard settings are completed.

## 1. Apply the Supabase migrations

Run these files in order in the Supabase SQL Editor. If the billing-foundation migration was already applied, run only the second file:

1. `supabase/migrations/20260904120000_billing_foundation.sql`
2. `supabase/migrations/20260905100000_paystack_billing.sql`

## 2. Create two Paystack plans

In Paystack Dashboard, create:

- **EchoNotes Pro Monthly** — NGN 1,500 — monthly interval
- **EchoNotes Pro Annual** — NGN 15,000 — annually interval

Copy both generated plan codes (`PLN_...`). Use test mode first.

## 3. Configure environment variables

Add the server variables from `.env.example` to Vercel → Project Settings → Environment Variables. Never prefix the Paystack secret or Supabase service-role key with `VITE_`.

Required billing variables:

- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PRO_MONTHLY_PLAN_CODE`
- `PAYSTACK_PRO_ANNUAL_PLAN_CODE`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`APP_URL` is optional. When set in production, use `https://echo-note-wine.vercel.app` or the final custom domain, without `/app` and without a trailing slash.

## 4. Add the webhook

In Paystack Dashboard → Settings → API Keys & Webhooks, set the webhook URL to:

`https://YOUR_DOMAIN/api/paystack/webhook`

For the current Vercel deployment:

`https://echo-note-wine.vercel.app/api/paystack/webhook`

The endpoint validates Paystack's `x-paystack-signature` before processing any event.

## 5. Test before going live

1. Keep Paystack in test mode and use an `sk_test_...` secret.
2. Upgrade one Basic account using Paystack's test card.
3. Confirm Settings → Plan & Billing changes to Pro.
4. Confirm the Supabase `subscriptions` row is `plan = pro` and `status = active`.
5. Test monthly and annual checkout separately.
6. Test the Paystack subscription-management page.
7. Only then repeat the plan creation and environment setup with live Paystack keys and plan codes.

The payment callback improves immediate feedback, but the signed webhook remains the authoritative activation path.
