# The Product
The initial product specification is two PRDs (PRD 01: AI interview behavior; PRD 02: end-to-end interview simulation) published in the source repository wiki.

# The Platform

A two-service application used for the Product Engineer case study. It is provided as a single repository so the whole thing clones, runs, and releases as one unit.

```
.
├── api/    # Backend service (Ruby on Rails, PostgreSQL, Redis/Sidekiq)
└── web/    # Frontend web app (React 18 + TypeScript, Vite, Tailwind)
```

The two services run together: the web app talks to the API over REST and WebSocket.

## Running it locally

Each service has its own setup guide. Run the API first, then the web app pointed at it.

1. **API** — see [`api/README.md`](api/README.md). Rails app; needs Ruby (see `api/.ruby-version`), PostgreSQL, and Redis. It serves on `http://localhost:3001`.
2. **Web** — see [`web/README.md`](web/README.md). Vite app; `npm install`, copy `.env.example` to `.env`, point `VITE_API_BASE_URL` at the API, then `npm run dev`. It serves on `http://localhost:5173`.

## Quality net

Every pull request runs three required checks: `Definition of Ready`, `Gate tests` and `API tests`. What they protect and
what they leave out is in [`assessment/02-quality-system.md`](assessment/02-quality-system.md); the audit that motivated
them is in [`assessment/01-audit.md`](assessment/01-audit.md).

Run the API tests (Docker for the services, Ruby 3.3.2, from the repository root):

```bash
docker run -d --name qnet-pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine
docker run -d --name qnet-redis -p 6379:6379 redis:7-alpine

cd api && bundle install
export RAILS_ENV=test CI=true SECRET_KEY_BASE=local-test-secret \
  DB_HOST=localhost DB_PORT=5432 DB_USERNAME=postgres DB_PASSWORD=postgres \
  REDIS_URL=redis://localhost:6379/1 ALLOWED_ORIGINS=http://localhost:5173 \
  GEMINI_API_KEY=not-a-real-key GEMINI_LIVE_MODEL=test GEMINI_FLASH_MODEL=test GEMINI_PRO_MODEL=test
bundle exec rails db:create db:migrate
bundle exec rspec
```

The suite never calls the language model, so the placeholder values above are enough. `CI=true` turns eager loading
on, as in production and in CI.

Run the gate's own tests and the check itself (Node 22 or newer, no install needed):

```bash
node --test tools/dor-check.test.js
PR_BODY="Spec: specs/NNN-name.md" node tools/dor-check.js origin/main
```

Check a version before tagging it (the same decision the release pipeline makes on a tag):

```bash
node tools/release-check.js --tag v1.0.0 --tests passed
```

To add a check: copy a file from `specs/`, write the test first and tag it `[NNN/AC-n]`, run it and read why it fails,
then fix. The steps and the reasons are in section 6 of `assessment/02-quality-system.md`.

## Notes for the case study

- This is the codebase you assess, harden, and release. Treat it as a version about to ship to a client.
- Work in the `/assessment` folder at the repo root for your written deliverables; code changes go in `api/` or `web/`.
- See the case-study brief you were given for what to produce and how it is evaluated.
