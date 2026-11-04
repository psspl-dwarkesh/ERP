# Open questions and blockers

Things that need you, gathered while you were away. I kept working on everything else; nothing below blocks the rest of the build.

## Needs you to act

### 1. Supabase password is rejected (4 Nov)

- TLS to Supabase now works: the CA certificate is at `server/certs/supabase-ca.crt` and is verified.
- Sign-in fails: `password authentication failed for user "postgres"` (code `28P01`) with the password recorded in `docs/DATABASE_CREDENTIALS.local.md`. A `dwarkesh` database user doesn't exist on the pooler.
- **Fix:** in Supabase → Project Settings → Database → **Reset database password**, set a password, and put it in `server/.env` line 5 (uncomment the `DATABASE_URL=` line) and in `docs/DATABASE_CREDENTIALS.local.md`. Both files are git-ignored.
- Then run, in `server/`: `npm run db:migrate`, then `npm run db:seed`. Each creates the tables and demo data in Supabase once.
- I stopped after two attempts, because Supabase bans an IP after repeated failed logins.

### 2. GitHub push needs your sign-in

`git push` from this session stops at "could not read Username for https://github.com" (no interactive credential prompt available). Your commits are safe locally on `main`. When you're back, run `git push origin main` in a terminal where you are signed in to GitHub. Vercel then redeploys automatically.

## Decisions I made without asking (change any of them)

| Decision | What I did | How to undo |
| --- | --- | --- |
| Live full-stack host | Render blueprint (`render.yaml`) + Supabase. Vercel hosts the front end in API mode, calling the Render API | Tell me to build a Vercel serverless adapter instead |
| AI features | Built as **Threadline Assist**: deterministic analysis on the ERP data, plus Claude answers when `ANTHROPIC_API_KEY` is set on the server. No key means no external calls | Remove the key or the module |
| Unfinished features | Shown as a clear "Coming soon" with what it will do, instead of buttons that do nothing | n/a |
| Footer credit | "Designed and engineered by Prakash Infotech" on the showcase | Edit `prototype/src/showcase/Showcase.tsx` |

## Questions for later

- Should the demo stay on fixed business date 3 Nov 2026 (so the story always reads the same), or roll with the real date?
- Is "Threadline" final as the product name?
- For the public demo, do you want the role-picker sign-in or an open demo with no login? Currently both deployments use the API-mode role picker.
- Insights → Ask Threadline: with `ANTHROPIC_API_KEY` set, the API sends the signed-in user's visible records (no emails/phones) to Anthropic to answer free-form questions. The SoW lists AI as outside the baseline (scope line 625, coverage "AI/OCR/RPA" exclusion), so: show it to Pinnacle Engineering as an optional add-on, and does their data policy allow records to leave the server? Should each question also go on the audit trail (today it is only in the server log)? Cost is roughly ₹5–7 per uncached question on Claude Opus 5.5, much less when the context is cached.
