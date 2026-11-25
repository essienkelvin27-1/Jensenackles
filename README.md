# TourTickets

TourTickets is a Next.js App Router ticketing application backed by Supabase. It was created from the repository's original three-line fan-support-page README; no application, authentication, deployment, or database implementation existed before this work.

## Local development

1. Use Node.js 20.9 or later.
2. Copy `.env.example` to `.env.local` in the repository root and fill in the values below. Keep `.env.local` private; it is ignored by Git.
3. Apply `supabase/migrations/202611240001_initial_schema.sql` to a new Supabase project (for example, in the Supabase SQL editor).
4. Configure Supabase Auth email confirmation, SMTP, the project Site URL, and the `/auth/callback` redirect URL.
5. Start with `npm run dev`.

The application intentionally does not need a Supabase service-role key. It uses authenticated Supabase clients and database row-level security, including for short-lived payment-evidence links.

## Environment variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-backed features | Project URL from Supabase settings. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase-backed features | Public/anon key; database access is constrained by RLS. |
| `NEXT_PUBLIC_SITE_URL` | Auth redirects and production links | Set to the deployed canonical URL in Vercel. |
| `NEXT_PUBLIC_BANK_TRANSFER_INSTRUCTIONS` | Bank-transfer checkout | Public deposit instructions shown to customers; do not enter bank login credentials. |
| `SMTP_HOST` | Transactional notifications | Gmail: `smtp.gmail.com`. Server-only. |
| `SMTP_PORT` | Transactional notifications | Gmail SSL: `465`; Gmail STARTTLS: `587`. |
| `SMTP_USER` | Transactional notifications | Your Gmail address. Server-only. |
| `SMTP_PASSWORD` | Transactional notifications | A Google App Password, not your normal account password. Server-only. |
| `EMAIL_FROM` | Transactional notifications | The sender address and optional display name, e.g. `Tour tickets <donotreply@tourtickets.com>`. Gmail requires this address to be configured and verified as a send-as alias for the authenticated account. |

The application sends payment-review and administrator support-reply notifications through the configured SMTP server. Missing email settings or SMTP delivery failures are reported in the admin settings page and notification result; they do not prevent payment review from being saved. Supabase Auth confirmation and password-reset emails are sent separately: configure the same Gmail SMTP host, port, username, and Google App Password in your Supabase project's Authentication SMTP settings.

For Gmail, enable 2-Step Verification and create an App Password in your Google Account. Put it in `SMTP_PASSWORD` in local `.env.local` and in your hosting provider's server-side environment variables (for example, Vercel Project Settings > Environment Variables). Never commit it, expose it with a `NEXT_PUBLIC_` prefix, or send it in chat. Gmail sending limits apply; for higher-volume production mail, use a transactional email provider.

## Implemented flows

- Public upcoming-event listing and ticket selection.
- Supabase email/password registration, email verification callback, sign-in, sign-out, password reset, and profile editing.
- Database-priced ticket orders with a 30-minute unpaid reservation, payment submission, and customer order history.
- Bank-transfer reference/optional receipt submission and multiple gift-card submissions with private image uploads.
- Administrator payment review; approval is the only application path that issues tickets.
- Customer-owned digital tickets with QR codes and downloadable PDF tickets.
- Admin-only QR token validation and one-time check-in.
- Customer support conversations, administrator replies/status updates, and email notifications.
- Administrator dashboard, customer contact management, event creation/publishing, payment/evidence review, analytics, support inbox, and deployment settings.
- Supabase row-level security, private evidence storage, validated server actions, database-side order pricing/inventory checks, and server-only notification credentials.

Bank transfers and gift cards are **manually verified**; this app does not connect to a bank, redeem gift cards, or process card payments. Admins must verify funds independently before approving an order. Event image URLs are administrator-supplied; image uploads/hosting for event artwork are not currently included. QR validation accepts a QR token; it does not request camera access for live scanning.

## First administrator

Register and verify the first account, then promote it using the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

The account can then sign in at `/login`; its role routes it to `/admin`. Never expose database credentials or private keys in browser code.

## Vercel deployment

Import the repository into Vercel and set the environment variables above for the appropriate deployment environments. Apply the migration to the connected Supabase project and configure Supabase Auth URLs/SMTP. The payment evidence bucket and RLS policies are created by the migration. Configure the Supabase Auth Site URL and allowed redirect URL to include `https://your-domain/auth/callback`.

Run the project checks before deployment:

```sh
npm run type-check
npm run lint
npm run build
npm audit --omit=dev
```

Supabase credentials and a deployed project are required to exercise real authentication, database, storage, email, and end-to-end flows. Without them, the public site shows an explicit setup state and account/admin routes cannot complete.
