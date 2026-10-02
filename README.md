# Streamline — Hulu Web Platform (portfolio build)

A full-stack subscription video-on-demand platform built end to end: **authentication with rotating refresh tokens, per-segment entitlement, signed playback URLs, hybrid recommendations, and Stripe (with a mock fallback) billing.** It leads with an Ethiopian slate — locally produced originals on the front page and the Ethiopian broadcasters live — over an acquired international catalogue.

> This is an original, self-contained implementation inspired by the architecture of a streaming platform. All titles, artwork and copy are fictional: the Ethiopian originals are invented, with key art drawn in CSS/SVG, and media previews are public-domain sample clips (Google's open test bucket). Live TV embeds each broadcaster's own public stream. No Hulu branding or licensed content is used.

**Stack:** React · Vite · Node.js · Express · MongoDB (Mongoose) · JWT · Stripe

---

## Architecture

```
React client (Vercel, static/CDN)
   │  auth (access + rotating refresh)   catalogue / rows / playback
   ▼                                      ▼
Express API (Render) ── entitlement guard ── signed playback URL
   │                                            │
   ▼                                            ▼
MongoDB (Atlas)  ◄──── nightly batch ────  media segments (origin/CDN)
                     (recommender)
```

Three tiers. The only non-obvious component is the **recommendation service**, which runs *offline* over watch events and writes a materialized `similarTitles` list onto each catalogue document — a browse request never triggers a model run.

### Request flow highlights
- **Sign in / subscribe** — email/password issues a 15-minute access token and a rotating refresh token; checkout creates a subscription record that entitlement middleware reads.
- **Browse** — rows are server-composed (`Ethiopian Originals`, `Continue Watching`, `Trending`, `Because You Watched`, `New Releases`), each with its own resolver and short-TTL cache. The two global rows skip the local slate so nothing repeats, and the front page's live strip is the broadcasters' own feed — no entitlement, because we host nothing.
- **Play** — the player requests a short-lived, title-scoped signed URL. Entitlement is checked at issue time **and again on every segment request**.
- **Learn** — progress is buffered client-side and flushed every 10s (plus on pause/seek/`visibilitychange`/`beforeunload`); the server keeps the **furthest** position.

---

## Repository layout

```
hulu-web-platform/
├─ server/            Express API (auth, catalogue, player, billing, recommender)
│  ├─ src/models/     User, Subscription, Title, WatchEvent, RefreshToken, Channel
│  ├─ src/middleware/ auth, entitlement, rate-limit, error
│  ├─ src/routes/     auth, catalog, player, subscription, webhook
│  ├─ src/services/   tokenService, recommendation, billingService, rowCache
│  ├─ src/data/       channels.js (Live TV line-up) · originals.js (Ethiopian slate)
│  ├─ src/jobs/       recomputeSimilarity (nightly batch)
│  ├─ src/seed/       fictional catalogue + demo users + watch history
│  └─ tests/          entitlement states, refresh rotation/reuse, recs fixture
├─ client/            React + Vite SPA
│  └─ src/            api client, auth context, pages, components
├─ render.yaml        Render blueprint (API + nightly cron)
├─ vercel.json        Build config for a Vercel project rooted at the repo root
└─ README.md
```

---

## Run locally

Prerequisites: **Node ≥ 20** and a running **MongoDB** (local or Atlas).

### 1. API

```bash
cd server
cp .env.example .env      # defaults work for local dev; secrets have dev fallbacks
npm install
npm run seed              # loads the fictional catalogue + demo accounts + history
npm run dev               # http://localhost:4000  (nodemon)
```

### 2. Client

```bash
cd client
npm install
npm run dev               # http://localhost:5173  (proxies /api -> :4000)
```

Open http://localhost:5173 and sign in with a seeded account:

| Account | Password | State |
|---|---|---|
| `demo@hulu.test` | `password123` | premium, has watch history |
| `maya@hulu.test` | `password123` | basic, has watch history |
| `sam@hulu.test` | `password123` | **no subscription** — exercises the 402 entitlement path + cold-start rows |

### Tests

```bash
cd server
npm test   # 18 tests: entitlement across plan states, refresh rotation + reuse detection, recommendation fixture
```

### Recompute recommendations manually

```bash
cd server
npm run recompute
```

---

## Security model

| Control | Where | Why |
|---|---|---|
| **Rotating refresh tokens + reuse detection** | `services/tokenService.js` | A replayed (already-rotated) token invalidates its entire family and forces re-auth, instead of silently accepting a stolen token forever. Refresh values are stored **hashed**. |
| **Entitlement middleware** | `middleware/entitlement.js` | One guard reads the subscription record and decorates the request — "is this user allowed?" lives in one place, not 20 handlers. A signed-in user is not necessarily a paying user. |
| **Per-segment signed playback URLs** | `utils/playbackSign.js`, `routes/player.routes.js` | HMAC, time-boxed and title-scoped. Content links can't be hotlinked beyond their window or replayed against another title. |
| **Webhook signature verification** | `routes/webhook.routes.js` (raw body) | Subscription state changes only from Stripe-signed events, never from a client request. |
| **Password policy + throttling** | `models/User.js`, `middleware/rateLimit.js` | bcrypt (cost 12, per-user salt), rate limit per IP and per account, exponential lockout on repeated failures. |

**Renewal race:** a signed playback URL carries its own expiry independent of subscription status, so renewal state is re-checked at the *next title*, not mid-stream — an expiring subscription never abruptly locks out a viewer mid-episode.

### A deliberate, documented trade-off
The client stores the **access token in memory** and the **refresh token in `localStorage`**, because the API and client deploy to different origins (Render + Vercel) and cross-site cookies would need `SameSite=None; Secure`. The access token is never persisted and is re-minted on every load via `/auth/refresh`. For a stricter posture, move the refresh token into an httpOnly cookie scoped to the API domain — the rotation/reuse logic is already isolated in `tokenService.js` to make that swap contained.

---

## Deployment

### MongoDB Atlas (shared by both services)
1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user + allow network access (`0.0.0.0/0` for a quick start).
3. Copy the **connection string** → use as `MONGODB_URI`.
4. After the API is live, seed it once: `MONGODB_URI=<atlas-uri> npm run seed` from `server/`.

### API → Render
Use the included `render.yaml` (New → Blueprint) or create a **Web Service** manually:
- Root directory: `server` · Build: `npm install` · Start: `npm start` · Health check: `/health`
- Env vars: `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PLAYBACK_SECRET`, `CORS_ORIGIN` + `FRONTEND_URL` (your Vercel URL), `API_PUBLIC_URL` (the Render URL — used to build playback URLs).
- Leave `STRIPE_SECRET_KEY` empty to run **mock billing** (fully usable). Add test keys to switch to real Stripe checkout + webhook.
- The `hulu-recommender-nightly` cron service runs `npm run recompute` at 03:00 daily.

> **Stripe webhook (real mode only):** point `https://<api>/webhooks/stripe` at the events `checkout.session.completed` and `customer.subscription.*`, then set `STRIPE_WEBHOOK_SECRET`.

### Client → Vercel
This repo is a monorepo: `client/` and `server/` each own their `package.json`, and there is no root one.

- **Root Directory = `client`** (recommended). `client/vercel.json` builds Vite and adds the SPA rewrites.
- **Root Directory = repo root** (what importing the repo without changing the setting gives you). The root
  `vercel.json` installs and builds inside `client/` and publishes `client/dist`, so the build still works.
  Without that file Vercel runs `npm run build` at the root and fails with
  `ENOENT: no such file or directory, open '/vercel/path0/package.json'`.

Either way:
- Env var: `VITE_API_BASE = https://<your-render-api-url>` (no trailing slash).
- Deploy. Add the resulting `https://<app>.vercel.app` origin to the API's `CORS_ORIGIN` and `FRONTEND_URL`, then redeploy the API.

---

## Notes on scope
This is a portfolio build focused on the *interesting* backend problems (session continuity, entitlement, cold-start recommendations) rather than licensed content or a production CDN. The player uses HTML5 `<video>` behind signed redirect URLs; a production system would serve HLS segments through the same entitlement-checked origin.
