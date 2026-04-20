---
name: ostrio-prerendering
description: Integrate, operate, debug, and maintain ostr.io pre-rendering — an HTML CDN + pre-rendering SEO middleware that returns fully-rendered HTML to crawlers, social preview bots, and AI agents (Googlebot, Bingbot, facebookexternalhit, Slackbot, GPTBot, ClaudeBot, PerplexityBot, Gemini, Grok, etc.) while humans still get the SPA/JS bundle. Use when the user asks to set up, configure, debug, purge cache for, validate, or troubleshoot ostr.io pre-rendering on Next.js, Node/Express/Koa/Fastify, Meteor.js, Nginx, Apache, Caddy, Cloudflare Workers, Netlify, Vercel, Supabase Edge Functions, Shopify/Webflow/Framer/Wix/Ghost, WordPress, or any SPA/PWA/SSR/static site. Also use for TTFB/LCP/INP/CLS improvements tied to crawler rendering, social link previews, AEO/GEO indexation, cache purge workflows, subdomain vs TLD setup, AMP, `X-Prerender-Id` debugging, `_escaped_fragment_` handling, `IS_PRERENDERING`/`IS_RENDERED` runtime signals, or genuine status-code emission from SPAs.
disable-model-invocation: true
---

# ostr.io Pre-rendering

Operational skill for integrating and maintaining [ostr.io pre-rendering](https://ostr.io/info/prerendering) — a technology-agnostic **HTML CDN + SEO middleware** that detects crawler / social-preview / AI-agent `User-Agent`s, forwards those requests to an ostr.io rendering endpoint, and returns fully-rendered HTML. Humans still receive the original SPA/SSR response.

This skill is agent-agnostic (Cursor, Codex, Claude, Antigravity, and others). Read top-to-bottom on first invocation; after that, jump directly to the relevant section.

## Contents

- [1. Purpose and scope](#1-purpose-and-scope)
- [2. Inputs to gather first](#2-inputs-to-gather-first)
- [3. Integration decision tree](#3-integration-decision-tree)
- [4. Setup workflows by stack](#4-setup-workflows-by-stack)
- [5. Configuration reference](#5-configuration-reference)
- [6. Rendering endpoints](#6-rendering-endpoints)
- [7. Runtime behavior and frontend signals](#7-runtime-behavior-and-frontend-signals)
- [8. Cache, purge, and deploy workflow](#8-cache-purge-and-deploy-workflow)
- [9. Validation](#9-validation)
- [10. Troubleshooting](#10-troubleshooting)
- [11. Maintenance runbook](#11-maintenance-runbook)
- [12. Agent behavior contract](#12-agent-behavior-contract)
- [13. Supporting files](#13-supporting-files)
- [14. Authoritative sources](#14-authoritative-sources)

---

## 1. Purpose and scope

### What ostr.io pre-rendering is

- **HTML CDN first.** ostr.io caches fully-rendered HTML globally. Even static stacks (WordPress, Shopify, plain PHP, Jekyll, Hugo) benefit from faster TTFB/LCP for crawlers and better link previews.
- **Pre-rendering second.** For JS-heavy sites (SPA/PWA/hybrid-SSR), ostr.io executes JS server-side and returns rendered HTML — equivalent to SSR without adding an SSR layer to the app.
- **SEO/AEO/GEO impact.** Improves TTFB, LCP, INP, CLS, Lighthouse scores, crawl budget, indexation, rich-result eligibility, AI-answer grounding (ChatGPT, Claude, Perplexity, Gemini, Grok), and social preview (iMessage, Slack, WhatsApp, Telegram, Facebook, LinkedIn, X/Twitter, Discord).

### When to use this skill

- User explicitly mentions ostr.io, `render.ostr.io`, `spiderable-middleware`, `seo-middleware-nextjs`, `ostrio:spiderable-middleware`, `X-Prerender-Id`, `IS_PRERENDERING`, `_escaped_fragment_`, or "pre-rendering SEO middleware".
- User reports symptoms: "Google/Bing/ChatGPT can't see our SPA content", broken Slack/iMessage/LinkedIn previews, empty `view-source:`, slow bot TTFB, low Lighthouse for crawlers, AI agents answering with outdated/missing content.
- User asks to integrate, debug, purge, validate, or upgrade ostr.io pre-rendering on any supported stack.

### When NOT to use this skill

- User wants privacy analytics, uptime monitoring, DNS/SSL monitoring, domain Whois alerts, or serverless CRON — those are separate ostr.io services; this skill does not cover them.
- Non-HTML content (RSS feeds, JSON APIs, sitemaps, robots.txt) — never route through pre-rendering.

### Outcomes this skill should produce

1. The **least invasive correct integration** for the detected stack.
2. Auth/token handled safely (env var, never committed).
3. Static assets, APIs, admin routes, health checks, feeds, sitemaps, websocket upgrades, and non-`GET`/`HEAD` methods excluded from rendering.
4. A reproducible **smoke test** that proves bot traffic returns `X-Prerender-Id` and human traffic does not.
5. A cache-purge playbook for deploys.
6. Website optimization suggestions when "visited by bot" and detected during JavaScript runtime via `window.IS_PRERENDERING`

---

## 2. Inputs to gather first

Before touching any file, collect (ask the user if not evident from the repo):

| Input | Why it matters | Typical source |
| --- | --- | --- |
| Production domain (FQDN) | Registered in ostr.io; renderer rejects unregistered hosts | `README`, `package.json`, `next.config.*`, `vercel.json`, `netlify.toml`, `Caddyfile`, Nginx `server_name`, DNS |
| Subdomains in scope (`www`, `app.`, `shop.`, etc.) | TLD token vs subdomain token differ; mismatch → `domain mismatch` error | Same as above |
| `OSTR_AUTH` / `Basic ...` token | Authenticates calls to renderer | [ostr.io pre-rendering panel](https://ostr.io/service/prerender) → Integration Guide |
| Hosting / deployment target | Drives integration choice | `vercel.json`, `netlify.toml`, `wrangler.toml`, `fly.toml`, `Dockerfile`, server SSH access |
| Reverse proxy / CDN in front | Must not double-route or strip `X-Prerender-Id` | Nginx/Apache/Caddy config, Cloudflare dashboard, Fastly/Akamai config |
| Framework / runtime | Selects middleware package | `package.json`, `.meteor/`, `composer.json`, `requirements.txt`, `Gemfile` |
| Routes to include | Avoid over-broad rendering | App routing config, sitemap |
| Routes to exclude | APIs, admin, auth, health, feeds, sitemaps, `.well-known`, websockets | App routing config, framework defaults |
| Query-string behavior | `keepGetQuery` / `{uri}` vs `{path}` decision | App routing logic |
| Expected Cache TTL | 2h–744h per host; affects cache-purge workflow | ostr.io dashboard per host |
| Existing pre-rendering vendor? | Migration needs env-var compatibility (see §5.3) | Previous vendor docs |

If any of the above is unknown, ask the user — do not assume. Never hardcode secrets.

---

## 3. Integration decision tree

**Rule of thumb:** pick the **highest tier the user controls** — less invasive = easier review.

```
┌─ Does the user control DNS/CDN but no server or app code? (Webflow, Framer, Wix,
│  Squarespace, Ghost(Pro), Substack, Notion-proxied, Carrd, Bubble, etc.)
│    → Cloudflare Worker (see §4.1)
│    → Shopify → Cloudflare Worker for Shopify (see §4.1)
│
├─ Is the site deployed on Netlify (PRO/ENTERPRISE)?
│    → Netlify support request (see §4.2)
│
├─ Is the site deployed on Vercel?
│    → Vercel Routing Middleware (`middleware.js` at project root) (see §4.3)
│
├─ Is HTML served from a Supabase Edge Function (Deno/Hono/Oak/Fresh)?
│    → Supabase Edge Function middleware (see §4.4)
│    (If Supabase is only backend, choose a layer above the HTML origin instead.)
│
├─ Is the app a Next.js app with access to `middleware.ts`?
│    ├─ Prefer a maintained package? → `seo-middleware-nextjs` (see §4.5b)
│    └─ Prefer no extra dep, one file? → Self-managed `middleware.ts` (see §4.5a)
│
├─ Is there a reverse proxy the user controls?
│    ├─ Nginx → server-level (see §4.6)
│    ├─ Apache → `.htaccess` + vhost (see §4.7)
│    └─ Caddy → Caddyfile (see §4.8)
│
├─ Is the app a Meteor.js app?
│    → `ostrio:spiderable-middleware` Atmosphere package (see §4.9)
│
└─ Any other Node.js server (Express/Connect/Koa/Fastify/NestJS/h3/vanilla http)?
     → `spiderable-middleware` NPM package (see §4.10)
```

### Which path avoids app-code changes?

- **Cloud / Edge** (§4.1): Cloudflare Worker — zero app/server changes.
- **Managed platform** (§4.2–§4.4): Netlify, Vercel, Supabase — one config file or one support ticket.
- **Server-level** (§4.6–§4.8): Nginx / Apache / Caddy — reverse-proxy rule, no app changes.
- **Application-level** (§4.5, §4.9, §4.10): Next.js / Meteor / generic Node — edits application code.

### Clarifying questions to pick the best path

Ask the user **only what's not already evident**:

1. "Do you manage DNS on Cloudflare, and can you add a Worker?"
2. "Is your app behind Nginx, Apache, or Caddy that you can edit?"
3. "Is your deploy on Vercel, Netlify, or a container/VPS?"
4. "Is the HTML entry point Next.js, Meteor, plain Node, a Deno Edge Function, or static hosting?"
5. "Do you prefer a one-line NPM package (maintained bot list) or a single file you own (zero extra deps)?"
6. "Is the site on a TLD (`example.com`) only, or also on subdomains (`www.`, `shop.`, etc.)? Note: subdomain coverage requires PRO/BUSINESS on ostr.io — prefer a separate API key per subdomain."

---

## 4. Setup workflows by stack

Every setup workflow ends with **§9 Validation**. Run the smoke test after every change — no exceptions.

### 4.1 Cloudflare Worker (Edge)

**Use for:** Webflow, Framer, Squarespace, Wix, Carrd, Ghost(Pro), Substack, Notion-proxied, Bubble, BigCommerce, WordPress.com (Business+), self-hosted WordPress/Ghost behind Cloudflare, static-site hosts proxied through Cloudflare, Shopify (dedicated flow).

**Prerequisites:**
- Domain on Cloudflare with orange-cloud proxy enabled on the DNS record.
- `OSTR_AUTH` token from the [pre-rendering panel](https://ostr.io/service/prerender).

**Steps:**
1. Cloudflare Dashboard → Workers & Pages → **Create** → "Hello World" template.
2. Replace the code with [`templates/cloudflare.worker.js`](templates/cloudflare.worker.js) (ES Module Worker — recommended).
3. Worker → Settings → Variables and Secrets → add `OSTR_AUTH` = `Basic xxx...`.
4. Worker → Settings → Triggers → bind route `https://example.com/*` (or `*example.com/*` for TLD + subdomains on PRO/BUSINESS Cloudflare).
5. Cloudflare → Caching → Configuration → **Purge Everything** once.
6. Run §9 validation.

**Shopify stores:** follow the step-by-step Shopify flow (DNS transfer if Shopify-managed, `A` + `CNAME` with orange-cloud, Shopify Worker code). Canonical guide: [`shopify-seo-integration.md`](https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shopify-seo-integration.md).

### 4.2 Netlify (PRO/ENTERPRISE only)

**Use for:** Netlify-hosted sites where you cannot or prefer not to ship `middleware.js` yourself.

**Steps:**
1. Confirm the site is on **PRO** or **ENTERPRISE** plan.
2. Add + verify the domain in ostr.io; copy the `Basic ...` token.
3. Open a ticket with Netlify Support using [`templates/netlify-support-request.md`](templates/netlify-support-request.md).
4. Netlify enables the integration (typically within 24 h) and replies.
5. Run §9 validation.

**Disable:** open another Netlify Support ticket requesting removal.

> Prefer Vercel Routing Middleware (§4.3), a Cloudflare Worker (§4.1), or Next.js middleware (§4.5) if you need faster iteration or you are not on PRO/ENTERPRISE.

### 4.3 Vercel (Routing Middleware)

**Use for:** any framework deployed to Vercel (Astro, Next.js, SvelteKit, Nuxt, Remix, plain static). Runs on Vercel edge before the CDN cache.

**Steps:**
1. `npm install @vercel/functions`
2. Copy [`templates/vercel-middleware.js`](templates/vercel-middleware.js) to the project root as `middleware.js`.
3. In the Vercel dashboard → Project → Settings → Environment Variables:
   - `OSTR_AUTH` = `Basic xxx...` (required)
   - `PRERENDER_SERVICE_URL` = `https://render.ostr.io` (default; override only for debug)
   - `ROOT_URL` = `https://example.com` (required when preview URLs differ from the registered domain — renderer only accepts registered domains)
4. `vercel deploy`
5. Run §9 validation.

> For **Next.js specifically**, prefer §4.5 (Next.js middleware); it runs in the same Vercel edge runtime but keeps routing concerns in the app where your team already edits.

### 4.4 Supabase Edge Functions (Deno / Hono / Oak / Fresh)

**Use only when** HTML is served from a Supabase Edge Function. If Supabase is only the backend (Postgres/Auth/Storage) and the frontend lives on Vercel/Netlify/Cloudflare, integrate at the frontend layer instead.

**Steps:**
1. Copy the shared helpers to `supabase/functions/_shared/ostr.ts` (see [`templates/supabase-shared.ts`](templates/supabase-shared.ts)).
2. Copy the framework variant (`deno.ts` / `hono.ts` / `oak.ts` / `fresh-middleware.ts`) into the function entry point.
3. `supabase secrets set OSTR_AUTH='Basic ...' ROOT_URL='https://example.com'`.
4. `supabase functions deploy <function-name> --no-verify-jwt` (public traffic must reach the function).
5. Route the domain (Supabase custom domain + URL rewrite, or Cloudflare Transform Rule). If Cloudflare is already in the path, reconsider §4.1 instead.
6. Run §9 validation.

### 4.5 Next.js

#### 4.5a Self-managed `middleware.ts` (zero extra deps)

**Steps:**
1. Copy [`templates/nextjs-middleware.ts`](templates/nextjs-middleware.ts) to project root or `/src/middleware.ts`.
2. Set env: `PRERENDER_SERVICE_AUTH` / `SPIDERABLE_SERVICE_AUTH` / `OSTR_AUTH` (any of the three is read).
3. Review `config.matcher` — default excludes `api`, `_next/static`, `_next/image`, `_next/webpack-hmr`, `.well-known`, `favicon.ico`. Add project-specific exclusions.
4. Deploy.
5. Run §9 validation.

#### 4.5b `seo-middleware-nextjs` NPM package (maintained)

**Steps:**
1. `npm install seo-middleware-nextjs`
2. Create `middleware.ts` per [`templates/nextjs-seo-middleware.ts`](templates/nextjs-seo-middleware.ts).
3. Set env: `OSTRIO_AUTH` / `PRERENDER_SERVICE_AUTH` / `SPIDERABLE_SERVICE_AUTH` (any).
4. Review `config.matcher`.
5. Deploy.
6. Run §9 validation.

Full option reference: §5 below. Package README: <https://www.npmjs.com/package/seo-middleware-nextjs>.

### 4.6 Nginx (reverse proxy)

**Use for:** self-hosted Node/PHP/Python/Go/Ruby apps behind Nginx, WordPress/Laravel/Django, static sites.

**Steps:**
1. Add `map $http_user_agent $is_webbot { ... }`, `$fragment`, `$filtered_args` blocks to the **`http` context** — see [`templates/nginx-snippets.conf`](templates/nginx-snippets.conf) for the full block. Regex is canonical; **do not edit in place**, copy byte-for-byte from [the canonical source](https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/crawler-ua-regex.md).
2. Add `recursive_error_pages on;` and `error_page 454 = @prerendering;` to the `server` block.
3. Add `location @prerendering { ... }` with the ostr.io proxy — see [`templates/nginx-snippets.conf`](templates/nginx-snippets.conf).
4. Replace `_YOUR_AUTH_TOKEN_` with your token (prefer `include /etc/nginx/snippets/ostr-auth.conf;` for token hygiene).
5. Exclude APIs, admin, auth, health, feeds, sitemaps, websocket upgrades, non-`GET`/`HEAD` methods, static assets. Pick the matching stack example from [ostr.io Nginx examples](https://github.com/ostr-io/ostrio-docs/tree/master/docs/prerendering/examples/nginx).
6. `nginx -t && systemctl reload nginx`.
7. Run §9 validation.

### 4.7 Apache (`.htaccess` + vhost)

**Steps:**
1. Ensure modules loaded: `a2enmod headers proxy proxy_http ssl rewrite`.
2. In server config / vhost (not `.htaccess`): `SSLProxyEngine On`, `ProxyPreserveHost Off`, `AllowOverride FileInfo Indexes Options=Indexes,MultiViews`.
3. In `.htaccess` (under the public root), add the pre-rendering block before the framework front-controller fallback — see [`templates/apache-snippet.htaccess`](templates/apache-snippet.htaccess). Canonical regex: copy byte-for-byte from [the source](https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/crawler-ua-regex.md).
4. Replace `_YOUR_AUTH_TOKEN_`.
5. Pick stack-specific `.htaccess` from [ostr.io Apache examples](https://github.com/ostr-io/ostrio-docs/tree/master/docs/prerendering/examples/apache) (WordPress, Drupal, Joomla, Magento, Laravel, Zend, plain PHP).
6. `apachectl -t && systemctl reload apache2` (or `httpd`).
7. Run §9 validation.

### 4.8 Caddy (Caddyfile)

**Steps:**
1. Set `OSTR_AUTH` in the Caddy runtime environment (systemd `Environment=` or environment file). Prefer env over inline — Caddyfile commits to version control.
2. In the site block, declare `vars OSTR_SCHEME "https"` and `vars OSTR_HOST "example.com"`.
3. Add the `@read_methods`, `@query_fragment`, `@websockets`, `@is_bot`, `@static_assets` matchers and the `route` with the rewrite + `reverse_proxy https://render.ostr.io { header_up Authorization "{env.OSTR_AUTH}" }` block — see [`templates/caddy-snippet.caddyfile`](templates/caddy-snippet.caddyfile).
4. `caddy validate && systemctl reload caddy`.
5. Run §9 validation.

**`{uri}` vs `{path}`:** default is `{uri}` (path + query string). Swap to `{path}` if the app does not rely on query strings for routing — cleaner cache keys.

### 4.9 Meteor.js (`ostrio:spiderable-middleware`)

**Steps:**
1. `meteor add ostrio:spiderable-middleware`
2. Configure (server only) — see [`templates/meteor-server.js`](templates/meteor-server.js). Key options: `rootURL`, `auth`, `serviceURL`, `only` / `onlyRE`, `ignore`.
3. Deploy.
4. Run §9 validation.

Meteor-specific runtime detection (reactive `ReactiveVar`): see [`templates/frontend-detect-prerendering.meteor.js`](templates/frontend-detect-prerendering.meteor.js).

### 4.10 Generic Node.js (Express / Connect / Koa / Fastify / vanilla http)

**Steps:**
1. `npm install spiderable-middleware`
2. Wire middleware as the **topmost** handler — see [`templates/node-express.js`](templates/node-express.js) or [`templates/node-http.js`](templates/node-http.js).
3. Set env: `SPIDERABLE_SERVICE_AUTH` / `PRERENDER_SERVICE_AUTH` and `ROOT_URL` / `SPIDERABLE_SERVICE_URL` / `PRERENDER_SERVICE_URL`.
4. Set `only` / `onlyRE` (recommended) to avoid rendering random bot-requested paths. `ignore` for `/account/*`, `/billing/*`, etc.
5. Deploy.
6. Run §9 validation.

---

## 5. Configuration reference

### 5.1 Authentication

- Always `Basic <base64(user:password)>` — a single token string that starts with `Basic `.
- Source of truth: ostr.io [pre-rendering panel](https://ostr.io/service/prerender) → Integration Guide per host.
- **Secret hygiene:**
  - Set via environment variable; never commit to repo.
  - Different tokens per host. **Prefer a separate API key per subdomain** (subdomain coverage on the TLD key requires PRO/BUSINESS ostr.io plan; a dedicated key eliminates `domain mismatch` ambiguity).
  - Rotate if leaked; cache purge is not required after rotation.
- Accepted env-var names (any one — checked in order):
  - Primary: `OSTR_AUTH`
  - Next.js self-managed: `PRERENDER_SERVICE_AUTH`, `SPIDERABLE_SERVICE_AUTH`, `OSTR_AUTH`
  - `seo-middleware-nextjs`: `OSTRIO_AUTH`, `PRERENDER_SERVICE_AUTH`, `SPIDERABLE_SERVICE_AUTH`
  - `spiderable-middleware`: `SPIDERABLE_SERVICE_AUTH`, `PRERENDER_SERVICE_AUTH`
- **Test credentials:** `Basic dGVzdDp0ZXN0` (base64 of `test:test`). Use only to prove connectivity end-to-end; never leave in production.

### 5.2 Key options (per package / config)

| Option | Used in | Meaning |
| --- | --- | --- |
| `auth` | all packages, headers | `Basic xxx...` string; required |
| `ROOT_URL` | `spiderable-middleware`, Vercel, Supabase | Canonical origin forwarded to renderer; required when preview URLs differ from registered domain |
| `rootURL` | `spiderable-middleware`, `seo-middleware-nextjs` | Canonical origin forwarded to renderer; required when preview URLs differ from registered domain |
| `serviceURL` | `spiderable-middleware` | Renderer endpoint, default `https://render.ostr.io` — see §6 |
| `renderingEndpoint` | `seo-middleware-nextjs` | Renderer endpoint, default `https://render.ostr.io` — see §6 |
| `SPIDERABLE_SERVICE_URL`, `PRERENDER_SERVICE_URL` | vercel, Cloudflare, `spiderable-middleware` | Renderer endpoint, default `https://render.ostr.io` — see §6 |
| `matcher` | Next.js | Next.js middleware matcher string/regex; exclude `api`, `_next/static`, `_next/image`, `_next/webpack-hmr`, `.well-known`, `favicon.ico` |
| `only` / `onlyRE` | `spiderable-middleware` | Exclusive allow-list of routes — **strongly recommended** to avoid rendering random paths |
| `ignore` | `spiderable-middleware` | Deny-list of routes (admin, billing, uploads) |
| `ignoredPaths` | `seo-middleware-nextjs` | Deny-list of routes (admin, billing, uploads) |
| `IGNORED_PATHS_RE` | Cloudflare Worker, Next.js middleware | Deny-list of routes (admin, billing, uploads) |
| `ignoredExtensions` | `seo-middleware-nextjs`, packages | Static-asset extensions skipped before UA check (canonical list shipped; extend for custom extensions) |
| `botAgents` | `seo-middleware-nextjs` | Extra UA substrings to intercept; default already covers 200+ crawlers including all modern AI agents |
| `botsUA` | `spiderable-middleware` | Extra UA substrings to intercept; default already covers 200+ crawlers including all modern AI agents |
| `SUPPORT_ESCAPED_FRAGMENT` | Cloudflare Worker, next.js middleware.ts | Honor legacy `?_escaped_fragment_=` signal (default `true`; deprecated by Google 2015 but still used by non-Google crawlers) |
| `PRERENDER_WITH_QUERY` | Cloudflare Worker, next.js middleware.ts | Forward query string to renderer; set `false` if routing doesn't use query strings (cleaner cache keys) |
| `keepGetQuery` | `seo-middleware-nextjs` | Forward query string to renderer; set `false` if routing doesn't use query strings (cleaner cache keys) |
| `retries` | `seo-middleware-nextjs` | Retry count on renderer network error, default `2` |
| `timeout` / `requestOptions.timeout` | `spiderable-middleware` | Proxy-request timeout (ms); default `180000` (180 s) |
| `sanitizeUrls` | `spiderable-middleware` | Fix badly composed URLs before sending to renderer; default `false` |
| `ignoredHeaders` | `spiderable-middleware` | HTTP headers to drop from renderer response |
| `debug`, `DEBUG` | `seo-middleware-nextjs` and `spiderable-middleware` packages | Extra logs; pair with `render-bypass` endpoint |
| `logger` | `seo-middleware-nextjs` | `console`, Winston, Pino — any `Pick<Console, 'debug'\|'info'\|'warn'\|'error'\|'log'>` |

### 5.3 Migrating from another pre-rendering vendor

Both NPM packages accept legacy env-var names for zero-config migration:

```shell
PRERENDER_SERVICE_AUTH='Basic xxxxx'
```

Keep the existing names; only change the values.

---

## 6. Rendering endpoints

Three endpoints are available. Switch by changing `serviceURL` / `renderingEndpoint` / `PRERENDER_SERVICE_URL` / the Nginx `set $renderer_domain` / the Caddy `reverse_proxy` target.

| Endpoint | URL | Intermediate cache | Use when |
| --- | --- | --- | --- |
| **Default** | `https://render.ostr.io` | Respects crawler + origin cache headers | Production. Fits 98% of cases. |
| **Bypass / debug** | `https://render-bypass.ostr.io` | Almost none | Debugging, development, ruling out stale intermediate caches. Safe in production but higher usage + latency. |
| **Aggressive cache** | `https://render-cache.ostr.io` | Heavy | Under-attack / traffic spikes. Accept 6–12 h staleness for fastest responses. |

> The `Cache-Control` header is always set from the per-host **Cache TTL** (§8), regardless of endpoint. Endpoint choice only affects **intermediate proxy caches**. Rendered snapshots at the ostr.io engine can always be purged (§8).

---

## 7. Runtime behavior and frontend signals

### 7.1 Detecting pre-rendering in the browser runtime

When a request is served by the pre-rendering engine, the engine sets globals before snapshotting the DOM:

- `window.IS_PRERENDERING` → `true` (boolean)
- `window.IS_PRERENDERING_TYPE` → `'desktop'` or `'mobile'`

`IS_PRERENDERING` can be `undefined` on initial load and may flip during runtime — always wire a setter. See [`templates/frontend-detect-prerendering.js`](templates/frontend-detect-prerendering.js) and, for Meteor, [`templates/frontend-detect-prerendering.meteor.js`](templates/frontend-detect-prerendering.meteor.js).

### 7.2 When `IS_PRERENDERING` is true, optimize crawler-visible DOM

Crawlers read the rendered snapshot top-down. When the engine is detected, suggest the following changes (guarded by `if (window.IS_PRERENDERING)`):

1. **Expand all accordions** (FAQ sections, collapsed `<details>`, tabbed content) so content is visible in the rendered HTML.
2. **Hide all overlays** — modal dialogs, cookie banners, CAPTCHAs, newsletter popups, exit-intent overlays. Content-blocking elements hurt crawler visibility and Core Web Vitals on the rendered snapshot.
3. **Disable carousels / sliders** and render them as vertical lists so all slides are indexable, not just the first.
4. **Move above-the-fold anything important** that the app lazy-loads or pushes below the viewport. Crawlers do not scroll. Remove virtualization / windowing of lists.

Example pattern: [`templates/frontend-detect-prerendering.js`](templates/frontend-detect-prerendering.js).

### 7.3 `IS_RENDERED` — tell the engine when the page is ready

Pre-renderer waits for `window.IS_RENDERED = true` (or a safety timeout) before snapshotting. Set it false early, flip true when data + DOM are settled:

```html
<head>
  <script>window.IS_RENDERED = false;</script>
</head>
```

Flip it after route + data hydrate:

```js
// after last async route hook / data fetch / DOM paint
window.IS_RENDERED = true;
// safety net — never leave the engine waiting
setTimeout(() => { window.IS_RENDERED = true; }, 6000);
```

### 7.4 Genuine status codes from SPAs

Front-end frameworks default to `200 OK` on every route, including 404s — that kills indexing. Emit the real status via **meta tag** or **HTML comment** anywhere in the page:

```html
<meta name="response:status-code" content="404">
<!-- response:status-code=404 -->
```

Works for any standard or custom code (`401`, `403`, `404`, `410`, `500`, `503`, `514`, etc.). See `templates/frontend-genuine-status-code.html`.

### 7.5 `X-Prerender-Id` header (cache identifier)

Every rendered response carries `X-Prerender-Id` — used for:
- Proving the bot hit the renderer (§9).
- Selectively purging a single page from cache (§8).
- Debugging which snapshot is being served.

If the header is missing from DevTools on a page you know is cached, the local browser / Service Worker / AppCache is intercepting — see §8.2 for the private-window workflow.

### 7.6 JavaScript redirects

Up to **4 redirects per request** are allowed. Beyond that the pre-renderer terminates the session. Prefer emitting the real status + `Location` via SSR or a genuine `302` from the origin; use `window.location.replace()` / `History.pushState()` / router push inside app code — the renderer follows those.

### 7.7 AMP support

AMP pages are supported on two URL patterns:

- **Prefix**: `https://example.com/amp/articles/slug`
- **Extension**: `https://example.com/articles/slug.amp.html`

No extra config needed — the engine detects either pattern.

### 7.8 ES5 legacy runtime

Default renderer runtime is current V8 (ES6/7+). Toggle the per-host **"ES6/7 (Modern JavaScript)"** setting off **only** for legacy sites that:
- Ship ES5-transpiled bundles with conflicting polyfills, or
- Depend on pre-ES6 `Array`/`String` semantics or `with` statements, or
- Have not been verified against current Chromium and pre-date ~2018.

Modern frameworks (React, Vue, Svelte, Angular, Astro, Next.js, Nuxt, SvelteKit, Remix, any Vite/Webpack/Rollup/esbuild/Turbopack output) must stay on the default. Purge cache after toggling (§8) so snapshots regenerate on the chosen engine.

### 7.9 Strip-JavaScript (default on)

The renderer strips `<script>` blocks and file references from the final snapshot by default — avoids unpredictable re-rendering on the crawler side. Keep it on unless you have a measured reason to disable. If you disable, use `IS_PRERENDERING` detection (§7.1) to change behavior accordingly.

### 7.10 Custom status codes (observability)

The ostr.io pre-rendering panel shows **origin** response codes plus custom `7xx` debug codes emitted by the engine:

| Code | Meaning |
| --- | --- |
| `701`, `702` | Credentials error (auth token invalid or rejected) |
| `703` | Insufficient credits — origin served, rendering bypassed |
| `704` | Plan does not include requested feature (subdomains, load-images, etc.) |
| `705` | Unexpected error |
| `707` | Too many errors on the original page — origin served, rendering bypassed |
| `708` | Origin took >90 s to respond — origin served, rendering bypassed |

If the panel shows high `703`/`704`/`707`/`708` rates after a deploy, treat as a regression (credits, plan, JS errors, or origin slowness).

---

## 8. Cache, purge, and deploy workflow

### 8.1 Cache model

- Every rendered result is cached at the engine.
- **Per-host Cache TTL**: 2 h–744 h (31 days), set in the pre-rendering panel.
- Cached responses are **not billed** — higher TTL = lower cost, staler content.
- Non-rendered responses (non-`GET`/`HEAD`, static assets, `.well-known`, matched ignore rules) are never cached by the engine.

### 8.2 Finding `X-Prerender-Id`

Normal path: DevTools → Network tab → reload → select document → Response Headers → `x-prerender-id`.

If missing despite a cached page (Service Worker, AppCache, or aggressive browser cache intercepts):

1. New Private/Incognito window.
2. Open URL with `?_escaped_fragment_=` appended.
3. DevTools → Network → **Disable Cache**.
4. Reload.
5. First document entry → Headers → `x-prerender-id`.

### 8.3 Purge workflows

| Action | Limit | How |
| --- | --- | --- |
| **Full host purge** | Once per 2 hours | ostr.io panel → host → *Purge Cache* |
| **Single-page purge** | Unlimited | ostr.io panel → enter `X-Prerender-Id` → *Purge* |

### 8.4 Deploy playbook

After every deploy that changes rendered HTML:

1. If changes are global (layout, nav, meta, templates): full host purge.
2. If changes are localized (one article, one product page): grab `X-Prerender-Id` from each affected page and single-purge.
3. Re-run the smoke test from §9 to confirm the new snapshot is served.
4. Note: when purged, intermediate proxy caches may still serve stale content for minutes–hours depending on Cache TTL and the chosen endpoint (§6). If debugging urgency is high, temporarily switch to `render-bypass.ostr.io`.

### 8.5 Pre-rendering a full sitemap

Tip from the panel: To warm up cache pass `https://example.com/sitemap.xml` into **Pre-Render** (*Pre-render a website*) to warm cache for every URL in the sitemap in one action. Useful after a major launch.

### 8.6 Pricing model

- No subscription — credits-based.
- **Credits never expire.**
- Cached (non-billed) responses → pre-rendering becomes cheaper the more it is used.
- Aggressive cache endpoint (§6) further reduces billable requests.

---

## 9. Validation

Copy the checklist from [`checklists.md`](checklists.md). The minimal smoke test is three `curl`s:

```shell
curl -sI -A 'Googlebot/2.1' https://example.com/
curl -sI -A 'Mozilla/5.0' https://example.com/
curl -sI 'https://example.com/?_escaped_fragment_='
```

Expected:

1. **Googlebot UA** → response includes `X-Prerender-Id`.
2. **Normal/Browser UA** → response has **no** `X-Prerender-Id`, body is the SPA/origin.
3. **`_escaped_fragment_`** → response includes `X-Prerender-Id`.

Additional tests (run at least once per integration):

| Test | Command | Expected |
| --- | --- | --- |
| Static asset should skip renderer | `curl -sI -A 'Googlebot' https://example.com/app.js` | No `X-Prerender-Id` |
| API route should skip renderer | `curl -sI -A 'Googlebot' https://example.com/api/health` | No `X-Prerender-Id` |
| `facebookexternalhit` preview | `curl -sI -A 'facebookexternalhit/1.1' https://example.com/` | `X-Prerender-Id` + correct `og:*` tags in body |
| AI crawler (Perplexity) | `curl -sI -A 'PerplexityBot/1.0' https://example.com/` | `X-Prerender-Id` |
| Connectivity end-to-end | `curl -v -H 'Authorization: Basic dGVzdDp0ZXN0' https://render-bypass.ostr.io/?url=https://example.com` | Renders (proves your egress can reach ostr.io) |
| Source view includes meta / JSON-LD | `curl -s -A 'Googlebot' https://example.com/ \| grep -E '(og:|json-ld)'` | Rendered tags present |

Full matrix with 14 scenarios: [`validation.md`](validation.md).

---

## 10. Troubleshooting

Symptom → Cause → Verify → Fix matrix for every documented failure mode: [`troubleshooting.md`](troubleshooting.md).

Fastest first-pass triage:

1. **Bot response missing `X-Prerender-Id`:**
   - Run `curl -v -H 'Authorization: Basic dGVzdDp0ZXN0' https://render-bypass.ostr.io/?url=https://example.com`. If it renders → your integration never forwards to ostr.io. If it fails → your host/firewall/WAF blocks egress to `*.ostr.io`.
2. **Bot response returns `401`/`403`:** auth token missing, not substituted, or belongs to another domain (TLD vs subdomain — see §5.1).
3. **Bot response returns `707`/`708` in the panel:** origin JS errors or >90 s response — fix origin first.
4. **Random browser traffic renders:** custom `botAgents` list too permissive, or CDN cache serving a stale rendered snapshot to humans — purge cache (§8) and narrow bot list.
5. **Feed/sitemap rendered as HTML:** matcher missing exclusions for `*.xml`, `/feed`, `/rss`. Add them.
6. **Service Worker / AppCache intercepts:** `X-Prerender-Id` hidden locally; use private window + `?_escaped_fragment_=` (§8.2).

---

## 11. Maintenance runbook

Durable operational checklist: [`checklists.md#maintenance`](checklists.md).

Key recurring tasks:

- **Every deploy:** smoke test + targeted cache purge (§8).
- **Every new route family:** add route to validation matrix; confirm bot UA returns `X-Prerender-Id`.
- **Every framework upgrade:** re-test matcher rules for `_next/*`, `app/*`, `pages/*`, new lazy-loaded segments.
- **Quarterly:** review ostr.io panel — usage trends, Cache TTL vs content freshness, `7xx` custom codes distribution, bot mix.
- **Auth audit:** confirm `OSTR_AUTH` comes from env or secret manager, not inline config. Rotate on any contributor offboarding that had secret access.
- **Bot list updates:** the NPM packages maintain the list upstream. For server-level configs (Nginx/Apache/Caddy/Cloudflare Worker), sync the regex byte-for-byte from [the canonical source](https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/crawler-ua-regex.md) whenever new AI agents emerge.
- **Endpoint switching for debug:** temporarily point `serviceURL` / `PRERENDER_SERVICE_URL` / `SPIDERABLE_SERVICE_URL` at `render-bypass.ostr.io`, reproduce, then revert.
- **New engineer onboarding:** share this skill + link to the ostr.io panel + §9 validation script.

---

## 12. Agent behavior contract

When applying this skill, the agent MUST:

1. **Detect the stack first.** Inspect `package.json`, `next.config.*`, `vercel.json`, `netlify.toml`, `Caddyfile`, `.htaccess`, Nginx config, `wrangler.toml`, `supabase/config.toml`, `.meteor/release`, `composer.json` before proposing integration code.
2. **Pick the least invasive correct tier** per §3 decision tree. Cloud/Edge > Platform > Server > Application. Justify in one sentence if escalating up the tiers.
3. **Preserve existing infra patterns.** If Nginx is already in front, use Nginx integration — don't add a Cloudflare Worker "because it's easier".
4. **Affect only crawler traffic.** Never change logic that runs for human visitors unless explicitly asked. Preserve existing middleware order, rewrite rules, and auth flows.
5. **Exclude non-page routes.** APIs, admin, auth, health, metrics, webhooks, websockets, static assets, feeds, sitemaps, `.well-known`, non-`GET`/`HEAD` methods — must never reach the renderer. Add the exclusions in the integration code, not later.
6. **Prefer minimal, reversible changes.** One middleware file or one proxy block. Diffs small enough to revert.
7. **Explain tradeoffs before larger infra edits.** Adding a Cloudflare Worker changes the serving path; adding middleware changes cold-start and cost. Surface it.
8. **Provide patch-ready examples** for the detected stack from [`templates/`](templates/).
9. **Emit the verification commands from §9** after every change — not as a suggestion, as part of the completion output.
10. **Flag unknowns rather than hallucinate.** When a setting is not in this skill and not in [the official docs](https://github.com/ostr-io/ostrio-docs/tree/master/docs/prerendering), say: *"Verify in current ostr.io dashboard/docs or reach out to support team that usually responds in timely manner."*
11. **Keep secrets out of committed files.** Always `OSTR_AUTH` / equivalent via env var, Vercel/Netlify/Cloudflare Secrets, Supabase Secrets, or systemd `Environment=`. If you see a hardcoded `Basic ...` in a diff, flag it.
12. **Use exact ostr.io terminology.** "Pre-rendering" (hyphen) in prose; "prerendering" (one word) only in identifiers — headers (`X-Prerender-Id`), env vars (`OSTR_AUTH`), package names (`spiderable-middleware`). "Crawler" in prose; "bot" only when quoting a server variable or public API.
13. **Do not invent options.** Every option used must appear in §5 or [the linked official docs](#14-authoritative-sources).

### Output contract per task

When the user asks the agent to **integrate**:

1. Restate the detected stack, deployment target, and chosen integration tier.
2. Ask clarifying questions from §2 that are genuinely unknown.
3. Propose diffs/files.
4. Provide the §9 smoke test tailored to the user's domain.
5. Outline the cache-purge step for the next deploy (§8).

When the user asks the agent to **debug**:

1. Ask for the failing URL and the bot UA it's seeing (or simulate Googlebot).
2. Run / suggest the `curl` triage from §10.
3. Map symptom → [`troubleshooting.md`](troubleshooting.md) row.
4. Propose the smallest fix.
5. Verify with §9.

When the user asks to **purge / redeploy**:

1. Ask whether global or per-URL purge is needed (§8).
2. Provide `X-Prerender-Id` extraction command (§8.2).
3. Re-validate (§9).

---

## 13. Supporting files

- [`checklists.md`](checklists.md) — pre-integration, go-live, validation, and maintenance checklists.
- [`troubleshooting.md`](troubleshooting.md) — 25+ symptom → cause → verify → fix rows.
- [`validation.md`](validation.md) — full 14-scenario validation matrix with commands and expected output.
- [`templates/`](templates/) — copy-paste-ready middleware and config for every integration tier.
- [`examples/`](examples/) — ad-hoc `curl` cookbook, route-exclusion examples, `IS_PRERENDERING` runtime patterns.

---

## 14. Authoritative sources

Always defer to these canonical sources when this skill is silent or ambiguous:

- **Pre-rendering overview & integration matrix:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/README.md>
- **Rendering endpoints:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/rendering-endpoints.md>
- **Next.js:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/nextjs-prerendering.md>
- **Nginx:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/nginx.md>
- **Apache:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/apache.md>
- **Caddy:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/caddy-prerendering.md>
- **Cloudflare Worker:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/cloudflare-worker.md>
- **Shopify:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shopify-seo-integration.md>
- **Netlify:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/netlify-prerendering.md>
- **Vercel:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/vercel-prerendering.md>
- **Supabase:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/supabase-prerendering.md>
- **Meteor.js:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/meteor-atmosphere.md>
- **Node.js NPM:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/node-npm.md>
- **Cache & TTL:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/cache.md>
- **Cache purge:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/cache-purge.md>
- **Detect at runtime:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/detect-prerendering.md>
- **Detect at runtime (Meteor):** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/detect-prerendering-meteor.md>
- **Genuine status code:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/genuine-status-code.md>
- **Custom status codes (7xx):** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/prerendering-custom-status-codes.md>
- **AMP:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/amp-support.md>
- **ES5 / legacy:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/es5-legacy-support.md>
- **Strip JavaScript:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/strip-javascript.md>
- **Optimization / `IS_RENDERED`:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/optimization.md>
- **Canonical crawler UA regex:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/crawler-ua-regex.md>
- **Canonical static-extensions regex:** <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/static-extensions-regex.md>
- **NPM — `spiderable-middleware`:** <https://www.npmjs.com/package/spiderable-middleware>
- **NPM — `seo-middleware-nextjs`:** <https://www.npmjs.com/package/seo-middleware-nextjs>
- **Atmosphere — `ostrio:spiderable-middleware`:** <https://atmospherejs.com/ostrio/spiderable-middleware>
- **Pre-rendering panel:** <https://ostr.io/service/prerender>
- **Marketing / info:** <https://ostr.io/info/prerendering> · <https://prerendering.com>
- **Support:** <https://ostr.io/support>

If any setting referenced by the user is not present in the sources above, respond: *"Verify in current ostr.io dashboard/docs or reach out to support team that usually responds in timely manner."* — never invent.
