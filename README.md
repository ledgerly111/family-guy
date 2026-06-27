
## Family Guy Finance Tracker

Mobile-first family income and expense tracker built with Next.js. The app now
uses authenticated family accounts and can persist shared finance data to a
Cloudflare D1 SQLite database.

## Local Development

```bash
npm install
npm run dev
```

The dev script starts the app on `http://127.0.0.1:3000`.

## Firebase Deployment

This repo is ready for Firebase App Hosting with Next.js server routes. Use the
normal Next build:

```bash
npm run build
```

The app still stores family data in Cloudflare D1, so add these runtime
environment variables in Firebase before using the login and finance APIs:

```bash
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_D1_DATABASE_ID=79a62e72-a3c5-4f62-b6fa-25ed61b6788a
CLOUDFLARE_D1_API_TOKEN=your-cloudflare-d1-api-token
```

Do not commit the API token. Add it in Firebase as a secret or runtime
environment variable.

## Cloudflare D1 Setup

The database id is already configured in `wrangler.toml`:

```bash
79a62e72-a3c5-4f62-b6fa-25ed61b6788a
```

Cloudflare Pages should bind this database as `DB`. The native Pages Functions
under `functions/api/*` read and write through that binding.

Create the D1 tables with Wrangler:

```bash
wrangler d1 execute family-guy-finance --remote --file migrations/0001_family_finance.sql
```

The API also calls the schema setup automatically during auth/state requests,
and you can trigger it manually after adding environment variables:

```bash
curl -X POST http://127.0.0.1:3001/api/admin/setup
```

The API also calls the schema setup automatically during auth/state requests.

## Cloudflare Pages Deployment

This app is configured for Cloudflare Pages hosting and Cloudflare D1 storage.
The mobile UI is exported as static files, and backend routes are native
Cloudflare Pages Functions.

Use these Cloudflare Pages settings:

```bash
Build command: npm run build:cloudflare
Build output directory: out
```

The `build:cloudflare` script runs `next build` with `output: 'export'`, so
Pages serves the app from `out` without a Next adapter worker.

`wrangler.toml` also declares `pages_build_output_dir = "out"`
so Cloudflare no longer treats the config as invalid.

## Features

- Login and create-family flow with secure HTTP-only session cookies.
- Owner-managed family members using email plus generated or custom password.
- Shared family state for transactions, credit cards, settings, and categories.
- AED currency formatting across the app.
- Mobile-first dashboard, transaction history, reports, settings, and PWA install
  controls.
