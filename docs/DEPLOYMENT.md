# Deploying Threadline

There are two deployments of the same front end. You can run either or both.

| | Static demo | Full stack |
| --- | --- | --- |
| What runs | The whole ERP in the visitor's browser on demo data | Node API + PostgreSQL, sign-in, role permissions, shared data |
| Host | Vercel (or any static host) | Render (or any Node host) + a PostgreSQL database |
| Who sees what | Everyone gets their own private copy of the demo | Everyone sees the same records; each role sees only what it is allowed to |
| Best for | A public portfolio link | A pilot, a client walkthrough with real accounts |

## 1. Static demo on Vercel

1. Import the GitHub repo in Vercel.
2. **Root Directory:** `prototype`. **Application Preset:** Vite. Leave the build settings at their defaults (`npm run build`, output `dist`). No environment variables.
3. Deploy. Every push to `main` redeploys.

The showcase is at `/`, and the workspace at `/#/app/dashboard`. Changes a visitor makes stay in their browser; the account menu's **Reset demo data** restores them.

## 2. Full stack on Render + PostgreSQL

### Database

Any PostgreSQL works. On first start the server runs the migrations in `server/drizzle/` and seeds the ABC Limited demo workspace if the tables are empty.

**Supabase (the project's database, ref `bvfklogfkajkqirhcpgx`):**

1. Use the **transaction pooler** string (port 6543), `postgresql://postgres.bvfklogfkajkqirhcpgx:<password>@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`. The direct `db.<ref>.supabase.co` host is IPv6-only on the free tier.
2. Supabase signs the pooler's TLS certificate with its own CA, which Node doesn't trust by default. Download it from Project Settings → Database → SSL Configuration and save it as `server/certs/supabase-ca.crt`. The certificate is public, so it is safe to commit. Set `DATABASE_SSL_CA=certs/supabase-ca.crt`. Certificates are always verified; there is no option to switch verification off.
3. Locally, the string lives in `server/.env` (git-ignored). The full credential record is in `docs/DATABASE_CREDENTIALS.local.md`, also git-ignored. On a host, paste the string into that host's environment settings, never into a committed file.
4. Create the tables and demo data once: `cd server` → `npm run db:migrate` → `npm run db:seed`. `npm run db:reset` drops and recreates only Threadline's own tables, so Supabase's roles and grants in `public` survive.

Other options: [Neon](https://neon.tech) or Render Postgres, with their connection string in `DATABASE_URL`.

### Web service

1. In Render choose **New → Blueprint** and pick this repo. Render reads [`render.yaml`](../render.yaml).
2. When asked, paste the connection string into `DATABASE_URL`.
3. Deploy. The build compiles the front end in API mode (`npm run build:api`) and the server serves it, so the site and API share one origin.
4. Open the service URL and sign in with any demo account. The password is `Threadline@2026`.

### Environment variables (server)

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | unset → embedded PGlite in `server/.data/` | PostgreSQL connection string. Always set it in production |
| `DATABASE_SSL` | on for any non-local host | TLS to the database, always certificate-verified |
| `DATABASE_SSL_CA` | unset → Node's standard roots | Path (relative to `server/`) of the provider's CA certificate. Required for Supabase |
| `DB_POOL_MAX` | `10` | Connection pool size. Keep it small on free database tiers |
| `PORT`, `HOST` | `4000`, `127.0.0.1` | Bind address. Use `HOST=0.0.0.0` on a host |
| `COOKIE_SECURE` | `false` | `true` behind HTTPS, so the session cookie is only sent over TLS |
| `SESSION_HOURS` | `12` | Session lifetime |
| `BUSINESS_DATE` | `2026-11-03` | "Today" for business rules. The demo data is written for this date |
| `DEMO_ACCOUNTS` | enabled | `false` hides the demo account list on the sign-in page |
| `AUTO_SEED` | enabled | `false` stops the server seeding an empty database |
| `DEMO_RESET` | enabled (while demo accounts are on) | `false` removes the IT administrator's "Reset demo data" action |
| `SIGNIN_MAX_PER_IP` | `30` | Sign-in attempts allowed per IP address in 10 minutes |
| `ANTHROPIC_API_KEY` | unset | Lets Insights answer questions with Claude; without it, answers are computed locally from the records |
| `ASSIST_MODEL` | see `server/src/assist/` | Claude model for Insights answers |
| `CORS_ORIGIN` | unset | Only needed if the front end is served from a different origin than the API |

### Before real users

- Set `DEMO_ACCOUNTS=false` and replace the seeded accounts. Every demo user shares one known password.
- Set `BUSINESS_DATE` to today's date or remove the override, once the demo data is replaced.
- Use a paid database tier with backups; the free tiers sleep and have no point-in-time restore.

## 3. Running the full stack locally

```powershell
# terminal 1 — API on http://127.0.0.1:4000 (PGlite, no database install needed)
cd server
npm install
npm run dev

# terminal 2 — front end in API mode on http://127.0.0.1:5173 (proxies /api to :4000)
cd prototype
npm install
npm run dev:api
```

`npm run db:reset` in `server` drops and reseeds the local database; stop the API first, because a local PGlite database can be open in only one process. `npm test` in `server` runs the API test suite against a throwaway in-memory database.
