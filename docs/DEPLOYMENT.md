# Deploying Threadline

Threadline deploys as a full stack: a Node API with PostgreSQL, serving the React front end in API mode. It runs live in two places, both reading and writing the same Supabase database:

- **Render** ([threadline-jlfn.onrender.com](https://threadline-jlfn.onrender.com)) runs the API and serves the front end on one origin.
- **Vercel** ([erp-prakashinfotech.vercel.app](https://erp-prakashinfotech.vercel.app)) hosts the front end, which calls the Render API cross-origin.

The browser-only build (`--mode mock`, fixtures in the browser and no server) is an offline fallback, not a deployment.

## 1. Front end on Vercel

The Vercel deployment serves the front end only; it calls the Render API (section 2) for data and sign-in.

1. Import the GitHub repo in Vercel.
2. **Root Directory:** `prototype`. **Framework Preset:** Vite. **Build command:** `npm run build:api` (API mode), output `dist`.
3. Set `VITE_API_URL` to the Render service URL (`https://threadline-jlfn.onrender.com`), so the front end knows where the API lives.
4. Deploy. Every push to `main` redeploys.

The showcase is at `/`, and the workspace at `/#/app/dashboard`. Because the front end and API sit on different origins, sign-in relies on a cross-site session cookie, which a browser set to block third-party cookies will refuse (the Render URL has no such dependency). An administrator re-seeds the shared data from the account menu (**Reset workspace data**).

## 2. Full stack on Render + PostgreSQL

### Database

Any PostgreSQL works. On first start the server runs the migrations in `server/drizzle/` and seeds the Pinnacle Engineering demo workspace if the tables are empty.

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
| `DEMO_RESET` | enabled (while demo accounts are on) | `false` removes the administrator's "Reset workspace data" action (`POST /api/admin/reset-demo`, which truncates and re-seeds) |
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
# terminal 1: API on http://127.0.0.1:4000 (PGlite, no database install needed)
cd server
npm install
npm run dev

# terminal 2: front end in API mode on http://127.0.0.1:5173 (proxies /api to :4000)
cd prototype
npm install
npm run dev:api
```

`npm run db:reset` in `server` drops and reseeds the local database; stop the API first, because a local PGlite database can be open in only one process. `npm test` in `server` runs the API test suite against a throwaway in-memory database.
