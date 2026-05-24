# cobolcaveman.com

Personal site — Hugo static frontend + Cloudflare Worker API aggregating
GitHub, dev.to, and YouTube activity.

```
site/          Hugo project (layouts, CSS, TypeScript)
worker/        Cloudflare Worker (TypeScript, compiled with esbuild)
.github/       CI/CD via GitHub Actions (no Node locally)
Makefile       Local dev commands
```

## Stack

| Layer    | Tool                                   |
|----------|----------------------------------------|
| Frontend | Hugo extended (handles TS via js.Build)|
| CSS      | Tailwind v4 standalone CLI             |
| Worker   | TypeScript → esbuild → Cloudflare      |
| Deploy   | Wrangler + GitHub Actions              |

No npm, no node_modules, no supply chain nightmares.

---

## First-time setup

### 1. Download local binaries
```sh
make setup
```
Grabs Hugo, Tailwind, and esbuild standalone binaries into `./bin/`.

### 2. Cloudflare prerequisites

**Cloudflare Pages project**
```sh
# From the dashboard or:
wrangler pages project create cobolcaveman
```

**Worker route DNS**
In the Cloudflare dashboard for `cobolcaveman.com`, add:
- Type: `CNAME`
- Name: `api`
- Target: `cobolcaveman-worker.<your-cf-account>.workers.dev`
- Proxied: ✅

**YouTube API key**
Get one from [Google Cloud Console](https://console.cloud.google.com/) →
APIs & Services → YouTube Data API v3.

### 3. GitHub repository secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret              | Value                                                    |
|---------------------|----------------------------------------------------------|
| `CF_API_TOKEN`      | Cloudflare API token with Workers + Pages edit perms     |
| `YOUTUBE_API_KEY`   | YouTube Data API v3 key                                  |

### 4. Local dev

```sh
# Terminal 1 — watch CSS
make css-watch

# Terminal 2 — Hugo dev server (http://localhost:1313)
make dev
```

The worker URL in `site/hugo.toml` points to `https://api.cobolcaveman.com`.
For local testing against the worker, either:

a) Run `wrangler dev` in `worker/` and temporarily set `workerURL = "http://localhost:8787"` in `hugo.toml`.
b) Or let it call the live worker — it's just a GET request.

### 5. Deploy

```sh
git push origin main
# GitHub Actions handles the rest
```

Or manually:
```sh
make deploy
```

---

## Architecture

```
Browser → cobolcaveman.com (Cloudflare Pages)
              ↓ fetch /api/activity
          api.cobolcaveman.com (Cloudflare Worker)
            ├── github.com/users/CobolCaveman/repos   (public, no key)
            ├── dev.to/api/articles?username=cobolcaveman (public, no key)
            └── youtube.com/v3/channels + playlistItems  (needs API key)
```

The worker caches responses for 30 minutes using the Cloudflare Cache API —
no KV namespace needed.

---

## Updating binary versions

Edit the version pins at the top of:
- `Makefile` (local)
- `.github/workflows/deploy.yml` (CI)

Then `rm -rf bin/` and `make setup` to refresh locally.

---

## CORS

The worker allows requests from `https://cobolcaveman.com` and
`https://www.cobolcaveman.com`. If you add a staging domain, add it to
`ALLOWED_ORIGINS` in `worker/src/index.ts`.
