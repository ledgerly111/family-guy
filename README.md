
## Family Guy Finance Tracker

Mobile-first family income and expense tracker built with Next.js. The app now
uses authenticated family accounts and can persist shared finance data to a
Cloudflare D1 SQLite database.

## Local Development

```bash
npm install
npm run dev
```

The dev script starts the app on `http://127.0.0.1:3001`.

## Cloudflare D1 Setup

Copy `.env.example` to `.env.local` and fill in your Cloudflare values:

```bash
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_D1_DATABASE_ID=79a62e72-a3c5-4f62-b6fa-25ed61b6788a
CLOUDFLARE_D1_API_TOKEN=your_d1_api_token
```

The database id is already set to the Family Guy D1 database. Cloudflare also
requires the account id and an API token with D1 edit access before the app can
write to the remote database.

Create the D1 tables with Wrangler:

```bash
wrangler d1 execute family-guy-finance --remote --file migrations/0001_family_finance.sql
```

The API also calls the schema setup automatically during auth/state requests,
and you can trigger it manually after adding environment variables:

```bash
curl -X POST http://127.0.0.1:3001/api/admin/setup
```

When D1 credentials are missing, local development falls back to an in-memory
store. Production deployments require D1 credentials and will not use the local
fallback.

## Cloudflare Pages Deployment

This app is configured for Cloudflare Pages hosting and Cloudflare D1 storage.
The pasted deploy log failed because Pages ran plain `next build`, which does
not create the `.vercel/output/static` directory Cloudflare was configured to
upload.

Use these Cloudflare Pages settings:

```bash
Build command: npm run build
Build output directory: .vercel/output/static
```

The `build` script runs the pinned Cloudflare Next adapter from `package-lock.json`,
so Pages will create the correct output directory during deployment.

`wrangler.toml` also declares `pages_build_output_dir = ".vercel/output/static"`
so Cloudflare no longer treats the config as invalid.

Set these runtime environment variables in Cloudflare Pages:

```bash
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_D1_DATABASE_ID=79a62e72-a3c5-4f62-b6fa-25ed61b6788a
CLOUDFLARE_D1_API_TOKEN=your_d1_api_token
```

The API token must stay in Cloudflare's environment settings. Do not commit it
to git.

## Features

- Login and create-family flow with secure HTTP-only session cookies.
- Owner-managed family members using email plus generated or custom password.
- Shared family state for transactions, credit cards, settings, and categories.
- AED currency formatting across the app.
- Mobile-first dashboard, transaction history, reports, settings, and PWA install
  controls.
