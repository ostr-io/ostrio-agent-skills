# ostr.io Pre-rendering — Troubleshooting Matrix

Symptom → likely cause → how to verify → how to fix.

Use this table in order: the most common failure modes appear first.

---

## 1. Auth / domain / plan

### 1.1 Bot response returns `401 Unauthorized` or `403 Forbidden`
- **Likely cause:** `OSTR_AUTH` missing, not passed to the request, or does not start with `Basic `.
- **Verify:**
  - `echo $OSTR_AUTH` in the deploy environment — must start with `Basic `.
  - In middleware logs, confirm `Authorization` header is attached to the request to `render.ostr.io`.
  - In ostr.io panel, confirm the token matches this host's Integration Guide.
- **Fix:** set the secret via env var (Vercel / Netlify / Cloudflare / Supabase Secret / systemd `Environment=` / Docker secret). Never inline in committed config.

### 1.2 Panel shows custom status code `701` or `702` (credentials error)
- **Likely cause:** token is syntactically valid but belongs to another host, or the host is not yet verified.
- **Verify:** ostr.io panel → Pre-rendering → host → Integration Guide → compare token byte-for-byte.
- **Fix:** use the correct host's token. If the host is unverified, complete verification in the panel.

### 1.3 `domain mismatch` errors or `451`/`403` on specific subdomains
- **Likely cause:** using the TLD token for a subdomain on a plan that doesn't cover subdomains, or the subdomain is not registered in ostr.io.
- **Verify:** panel → hosts list → is `app.example.com` / `www.example.com` registered?
- **Fix:** Prefer a separate API key per subdomain. If you want one key for TLD + subdomains, upgrade to PRO/BUSINESS on ostr.io. Then update the middleware env for the subdomain.

### 1.4 Panel shows `703 insufficient credits`
- **Likely cause:** credit balance hit zero.
- **Verify:** panel → Billing.
- **Fix:** top up credits. Credits never expire. While the balance is zero, origin is served directly (no rendering) — traffic is not broken, only SEO optimizations are paused.

### 1.5 Panel shows `704 plan limit` for a feature
- **Likely cause:** requesting a feature the current plan does not include (subdomain coverage, load-images-on, higher render concurrency, etc.).
- **Fix:** upgrade plan or disable the feature.

### 1.6 Panel shows `707 too many errors on origin`
- **Likely cause:** the origin keeps returning JS runtime errors / 5xx / broken HTML for this URL.
- **Verify:** open the URL in a regular browser with DevTools → Console. Is there an uncaught exception? Any `5xx` in Network tab?
- **Fix:** stabilize origin first. The pre-renderer backs off and serves origin as-is while errors persist.

### 1.7 Panel shows `708 origin timeout`
- **Likely cause:** origin took >90 s to respond.
- **Verify:** `time curl -A 'Googlebot' https://example.com/slow-route`.
- **Fix:** optimize origin or set a shorter client-side timeout on data fetches; use `window.IS_RENDERED = true` at the right moment (§7.3 of `SKILL.md`).

---

## 2. Integration wiring

### 2.1 Bot UA returns a `200` from origin without `X-Prerender-Id`
- **Likely cause:** middleware isn't triggering. Most frequent root causes:
  1. Matcher excludes the URL (Next.js `config.matcher`, Vercel middleware path, Nginx `location` miss).
  2. Middleware not registered as top-most handler (Express/Connect — order matters).
  3. Build artifact didn't include the middleware (stale deploy).
  4. `config.matcher` variable is computed at runtime — Next.js requires it statically.
- **Verify:**
  - Inspect the deployed bundle / config for the middleware.
  - Add temporary `logger.info` at middleware entry.
  - `curl -sI -A Googlebot https://example.com/` — also check for a custom response header you added in the middleware.
- **Fix:** move middleware to the correct matcher/position; redeploy.

### 2.2 Normal browser traffic returns `X-Prerender-Id` (human traffic being rendered)
- **Likely cause:** bot UA regex is too broad, or `config.matcher` is too permissive, or a stale CDN cache is serving the bot snapshot to humans.
- **Verify:**
  - `curl -sI -A 'Mozilla/5.0' https://example.com/` — if the header is still present, a CDN cache miss served the wrong variant.
  - Check CDN cache-key configuration: it must vary by `User-Agent` or by the path being rendered.
- **Fix:**
  - Narrow the bot regex back to the canonical list.
  - Configure CDN to vary on `User-Agent`, OR avoid double-caching by using ostr.io cache only.
  - Purge the human cache (CDN) and the ostr.io host cache.

### 2.3 Redirect loop on all traffic
- **Likely cause:** middleware forwards to renderer; renderer fetches origin; origin's middleware re-intercepts the renderer's request (which is coming from `ostr.io` with a canonical UA) and forwards it again.
- **Verify:** in middleware logs, count middleware entry per single user request — should be exactly 1.
- **Fix:** exclude ostr.io renderer IP/host from the middleware. Mostly handled by:
  - UA check — the renderer does not re-fire crawler UAs back at origin.
  - Excluding the renderer's specific subnet (very last-resort).
  - **Most common real fix:** the middleware forwards to `https://render.ostr.io/?url=https://example.com/...` using the **same hostname** → renderer fetches `https://example.com/` → site's middleware intercepts again. Ensure the middleware recognizes its own upstream fetch and skips. Canonical templates already do this by checking `url.hostname === 'render.ostr.io'` or `endsWith('.ostr.io')`.

### 2.4 Static assets (JS/CSS/images/fonts) being rendered
- **Likely cause:** static-extensions regex missing or not matching the actual extension.
- **Verify:** `curl -sI -A Googlebot https://example.com/app.js | grep -i x-prerender` — should be empty.
- **Fix:** sync the static-extensions regex byte-for-byte from [the canonical source](https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/static-extensions-regex.md). Add any site-specific extensions (`.webmanifest`, `.map`, `.wasm`, etc.).

### 2.5 APIs / webhooks / auth endpoints being rendered
- **Likely cause:** matcher / ignore list missing those paths.
- **Verify:** `curl -sI -A Googlebot https://example.com/api/health | grep -i x-prerender` — should be empty.
- **Fix:** add `/api/*`, `/webhooks/*`, `/oauth/*`, `/auth/*`, health/metrics paths to the ignore list / Next.js matcher.

### 2.6 Feeds, sitemaps, robots.txt being rendered
- **Likely cause:** feed/sitemap ends in `.xml` but the static-extensions regex is stripped; or the feed path doesn't match the extension filter.
- **Fix:** extend the ignore-paths regex to include `^/sitemap.*\.xml$`, `^/feed/?`, `^/.+/feed/?$`, `^/rss/?$`, `^/atom/?$`, `^/robots\.txt$`. Template examples include these.

### 2.7 Websocket upgrade requests being broken by middleware
- **Likely cause:** middleware intercepts the upgrade before the WS handler.
- **Verify:** client reports "WS connection failed" from the bot-check window; ostr.io receives a WS upgrade.
- **Fix:** exclude `Connection: Upgrade` requests from the middleware. Templates already exclude them.

### 2.8 Non-`GET`/`HEAD` methods being proxied
- **Likely cause:** matcher missing method filter.
- **Verify:** `curl -sI -X POST -A Googlebot https://example.com/ | grep -i x-prerender` — should be empty.
- **Fix:** templates already guard on `req.method in { GET, HEAD }`. Add it if missing.

---

## 3. Platform-specific

### 3.1 Next.js — `middleware.ts` deployed but nothing happens
- Most common: `config.matcher` mis-typed (e.g. `matcher: /((?!api...).*)` with a slash prefix missing), or the matcher evaluates to `false` for every route.
- Also: middleware in `src/middleware.ts` while the app uses `/middleware.ts` (or vice versa) — Next.js picks only one.
- **Fix:** use the ready-to-paste `matcher` from [`templates/nextjs-middleware.ts`](templates/nextjs-middleware.ts). Deploy, redeploy fresh (no incremental cache).

### 3.2 Next.js — `seo-middleware-nextjs` logs "redirecting" but response is the SPA
- Likely: `rootURL` not set and `NextRequest.url` resolves to a Vercel preview URL the renderer rejects (domain mismatch).
- **Fix:** set `rootURL: 'https://example.com'` so every preview forwards canonical production URLs to the renderer.

### 3.3 Vercel — preview deploys fail but production works
- **Likely cause:** preview URL (`*.vercel.app`) is not registered in ostr.io; renderer rejects.
- **Fix:** either set `ROOT_URL=https://example.com` (recommended — makes previews pre-render as production URLs), or add each preview domain in ostr.io (not scalable).

### 3.4 Netlify — setup request submitted but bots still get the SPA
- **Likely cause:** Netlify hasn't enabled the integration yet, or it was enabled on a branch/env the request isn't hitting.
- **Verify:** check Netlify Support ticket status. Run smoke test; if `X-Prerender-Id` still missing after 48 h, escalate.
- **Fix:** follow up with Netlify Support citing the original ticket.

### 3.5 Cloudflare Worker — script deployed but `X-Prerender-Id` missing for bot UAs
- **Likely cause:**
  - Route binding incorrect (`*example.com/*` needed for subdomains; `example.com/*` only matches apex).
  - `OSTR_AUTH` set as a plain variable, not a secret — some deploys unset plain vars on redeploy.
  - Orange-cloud proxy disabled on the DNS record.
  - Cloudflare is caching the original origin response aggressively (before Workers). Not typical but occurs with "Cache Everything" page rules.
- **Verify:** Workers → Deployments → check if the last version was deployed. Route bindings → confirm pattern. DNS → confirm orange cloud on the record.
- **Fix:** redeploy the Worker, set secret via Workers → Variables and Secrets, enable orange cloud, purge Cloudflare cache.

### 3.6 Cloudflare Worker — human traffic getting `x-prerender-id`
- **Likely cause:** Cloudflare edge cache stored the bot response under a key that also matches humans (no UA variation in cache key). Cloudflare default cache key is path+query — not UA.
- **Fix:** purge cache, then either:
  - Add a Cache Rule to bypass Worker output for bot UAs (the Worker already handles that logic);
  - Or use the `Vary: User-Agent` header / a per-UA cache key configuration (requires Enterprise).

### 3.7 Nginx — `454` → `@prerendering` fails with `502 Bad Gateway`
- **Likely cause:** Nginx egress to `render.ostr.io` blocked (no DNS resolver, no TLS upstream, firewall).
- **Verify:** `curl -sI https://render.ostr.io` from the Nginx host.
- **Fix:** add `resolver 1.1.1.1 8.8.8.8 valid=60s;` in the `http` context; ensure outbound TLS to `*.ostr.io:443` allowed by firewall/SELinux.

### 3.8 Apache — `.htaccess` bypass rule triggers `500 Internal Server Error`
- **Likely cause:** `mod_proxy` / `mod_proxy_http` / `mod_headers` / `mod_rewrite` not loaded; or `AllowOverride` too restrictive to honor `.htaccess`.
- **Verify:** `apachectl -M | grep -E 'proxy|rewrite|headers'`.
- **Fix:** `a2enmod headers proxy proxy_http ssl rewrite && systemctl restart apache2`.

### 3.9 Apache — proxy returns `Permission denied`
- **Likely cause:** SELinux blocks outbound HTTP.
- **Fix:** `setsebool -P httpd_can_network_connect 1`.

### 3.10 Caddy — `{env.OSTR_AUTH}` resolves to empty string
- **Likely cause:** systemd unit runs Caddy with a clean env; `OSTR_AUTH` not exported in the unit.
- **Verify:** `systemctl show caddy -p Environment`.
- **Fix:** add `Environment=OSTR_AUTH=Basic\ xxx` to the unit, or use `EnvironmentFile=/etc/default/caddy`. `systemctl daemon-reload && systemctl restart caddy`.

### 3.11 Supabase Edge — cold-start adds 1–3 s on first bot hit
- **Likely cause:** expected cold-start for Deno Edge Functions.
- **Fix:** ignore; the pre-rendered response is cached at ostr.io. Alternatively, warm the function with a cron ping.

### 3.12 Supabase Edge — renderer returns empty body
- **Likely cause:** `ROOT_URL` not set; Supabase function URL (`*.supabase.co`) being forwarded; renderer rejects domain.
- **Fix:** `supabase secrets set ROOT_URL=https://example.com`, redeploy.

### 3.13 Shopify — Worker not firing on `/products/*`
- **Likely cause:** Shopify routes `/products/*` through its own caching; Worker binding missing.
- **Fix:** follow the canonical [Shopify integration](https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shopify-seo-integration.md) — DNS configuration must point at Cloudflare before Shopify, Worker bound on `example.com/*`.

---

## 4. Cache / freshness

### 4.1 After deploy, crawlers still see the old HTML
- **Likely cause:** ostr.io host cache still has the pre-deploy snapshot.
- **Verify:** check `X-Prerender-Id` — if it matches a pre-deploy ID, cache is stale.
- **Fix:** full purge (once per 2 h) or per-URL purge with that `X-Prerender-Id`.

### 4.2 Full purge available but panel rejects "Rate limit"
- **Likely cause:** full purge has been used in the last 2 hours.
- **Fix:** use per-URL purges by `X-Prerender-Id` (unlimited) for the pages that must refresh immediately.

### 4.3 After full purge, old snapshot still served to some POPs
- **Likely cause:** intermediate proxies in front of the renderer (especially the regular `render.ostr.io`) still cache.
- **Fix:** temporarily switch `serviceURL` to `render-bypass.ostr.io`, validate, revert.

### 4.4 `X-Prerender-Id` missing from DevTools Network tab on a cached page
- **Likely cause:** Service Worker, AppCache, aggressive browser HTTP cache, or CDN stripping response headers.
- **Verify:** new private window → DevTools → Network → Disable Cache → load `https://example.com/?_escaped_fragment_=` → Response Headers.
- **Fix:** if CDN is stripping, allow-list `X-Prerender-Id` in the CDN's "hide" or "allow response headers" settings.

---

## 5. Runtime / content

### 5.1 Renderer snapshot missing content that appears in a real browser
- **Likely cause:** app awaits data but never sets `window.IS_RENDERED = true`; renderer snapshots too early or waits the safety timeout before the data arrives.
- **Verify:** load the page in a browser, check whether critical content appears after 2–3 s; inspect code for `window.IS_RENDERED`.
- **Fix:** wire `window.IS_RENDERED = true` after the last critical data fetch + DOM paint. See `SKILL.md §7.3`.

### 5.2 404 pages indexed as 200
- **Likely cause:** SPA always returns `200` because the 404 is rendered client-side.
- **Fix:** emit a genuine status code via `<meta name="response:status-code" content="404">` or `<!-- response:status-code=404 -->`. See `SKILL.md §7.4`.

### 5.3 Renderer follows too many redirects and fails
- **Likely cause:** >4 JS redirects in a single request.
- **Fix:** collapse the redirect chain. Prefer one SSR-level 301/302. 4 is the hard cap.

### 5.4 Modal / cookie banner / overlay blocks indexable content in snapshots
- **Likely cause:** overlay renders server-side or pre-render-side; SEO-important content is behind it.
- **Fix:** guard overlays with `if (!window.IS_PRERENDERING) { ... }`. Template: [`templates/frontend-detect-prerendering.js`](templates/frontend-detect-prerendering.js).

### 5.5 FAQ / accordion content missing from snapshot
- **Likely cause:** accordion collapsed by default.
- **Fix:** when `window.IS_PRERENDERING` is true, expand all accordions (open every `<details>` / set `aria-expanded="true"` / force-render the panel).

### 5.6 Carousel only shows slide 1 in snapshot
- **Likely cause:** carousel virtualization / lazy rendering.
- **Fix:** when `window.IS_PRERENDERING` is true, render as vertical list (no virtualization).

### 5.7 Images missing in snapshot
- **Likely cause:** lazy-load via JS (`IntersectionObserver`) — crawler doesn't scroll.
- **Fix:** when `window.IS_PRERENDERING` is true, opt out of lazy-load that implemented via JavaScript, fallback to native `loadlazyloading="lazy"` attgibute. Or enable ostr.io's "Load images" setting for crawler fidelity (plan-gated — available on PRO and BUSINESS plans).

### 5.8 OG/Twitter preview broken
- **Likely cause:** `og:*` / `twitter:*` tags injected client-side after hydration, which is usually OK because the renderer waits — but if `IS_RENDERED` fires too early, the tags are missing.
- **Verify:** `curl -s -A 'facebookexternalhit/1.1' https://example.com/page | grep -E 'og:|twitter:'`.
- **Fix:** inject meta tags before flipping `IS_RENDERED`.

### 5.9 JSON-LD missing in snapshot
- Same root cause as 5.8 (`IS_RENDERED` too early) or SPA injects JSON-LD in an effect that doesn't run before the snapshot.
- **Fix:** flip `IS_RENDERED` after the JSON-LD `<script>` is in the DOM.

### 5.10 Inconsistent bot detection (some crawlers pre-rendered, some not)
- **Likely cause:** local bot regex forked from an outdated copy.
- **Fix:** sync the canonical regex from [the source](https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/crawler-ua-regex.md) byte-for-byte. If using NPM packages, `npm upgrade seo-middleware-nextjs` / `spiderable-middleware`.

---

## 6. CSP / security / headers

### 6.1 CSP violation in rendered HTML
- **Likely cause:** origin CSP allows scripts, but the renderer strips scripts (§7.9) — fine. Issue usually: an `og:image` host or `<link rel="preconnect">` domain is disallowed by CSP.
- **Fix:** widen CSP `connect-src` / `img-src` / `font-src` for the specific third-party origins you use.

### 6.2 WAF blocks requests from `render.ostr.io`
- **Likely cause:** WAF (Cloudflare Super Bot Fight Mode, AWS WAF, Imperva, Sucuri) classifies the renderer's User-Agent / IP as a bot and blocks.
- **Fix:** allow-list the renderer's User-Agent and IP ranges. ostr.io provides the current UA string and IP info on request — verify in current ostr.io dashboard/docs or reach out to support team that usually responds in timely manner.

### 6.3 Basic auth on origin (staging) returns `401` to the renderer
- **Likely cause:** renderer does not carry your staging basic-auth.
- **Fix:** disable basic auth for the renderer's UA/IP range on staging (documented by ostr.io support), or integrate only after staging is public.

---

## 7. Edge cases

### 7.1 `Host` header wrong at origin (renderer sees correct, origin sees `render.ostr.io`)
- **Likely cause:** Apache `ProxyPreserveHost` is `On` (default per template off), or Caddy `header_up Host` is unset.
- **Fix:** template Apache sets `ProxyPreserveHost Off`; template Caddy sets `header_up Host render.ostr.io`. Double-check.

### 7.2 Renderer snapshot has `about:blank` or generic loader page
- **Likely cause:** `IS_RENDERED` never flips true; safety timeout fires while the loader is still shown.
- **Fix:** (a) wire `IS_RENDERED` correctly; (b) until fixed, increase time-to-render on the renderer side — not configurable from outside, but the built-in waits handle most cases once `IS_RENDERED` is wired.

### 7.3 AMP pages not rendered / not marked as AMP
- **Likely cause:** URL pattern doesn't match (`/amp/` prefix or `.amp.` extension).
- **Fix:** adjust URL scheme. See `SKILL.md §7.7`.

### 7.4 Legacy ES5 site renders blank
- **Likely cause:** ES6/7 engine (default) fails on ancient polyfill conflicts.
- **Fix:** panel → host → disable "ES6/7 (Modern JavaScript)". Purge cache after flipping.

### 7.5 Site behind Cloudflare + Netlify: which does the pre-rendering?
- **Likely cause:** confused ownership — if both are configured, both may rewrite.
- **Fix:** choose one layer (usually Cloudflare Worker at the edge if DNS is on Cloudflare). Disable the other.

---

## First-pass triage script

When nothing works, run this and read the diff:

```shell
DOMAIN="example.com"
URL="https://${DOMAIN}/"

echo "=== 1. Egress to ostr.io with test creds ==="
curl -sS -o /dev/null -w '%{http_code}\n' -H 'Authorization: Basic dGVzdDp0ZXN0' "https://render-bypass.ostr.io/?url=${URL}"

echo "=== 2. Origin with human UA ==="
curl -sSI "${URL}" | grep -iE '^(http|server|x-prerender|cache|cf-)'

echo "=== 3. Origin with Googlebot UA ==="
curl -sSI -A 'Googlebot/2.1' "${URL}" | grep -iE '^(http|server|x-prerender|cache|cf-)'

echo "=== 4. Legacy escaped-fragment ==="
curl -sSI "${URL}?_escaped_fragment_=" | grep -iE '^(http|x-prerender)'

echo "=== 5. Static asset (must not render) ==="
curl -sSI -A 'Googlebot' "https://${DOMAIN}/favicon.ico" | grep -iE '^(http|x-prerender)'

echo "=== 6. API path (must not render) ==="
curl -sSI -A 'Googlebot' "https://${DOMAIN}/api/health" | grep -iE '^(http|x-prerender)'
```

If (1) returns `200` but (3) has no `X-Prerender-Id` → integration not wired.
If (1) fails → host/firewall/WAF blocks egress, or token issue.
If (5) or (6) has `X-Prerender-Id` → exclusion rules misconfigured.

---

## When this document is silent

Verify in current ostr.io dashboard/docs or reach out to support team at <https://ostr.io/support> — they usually respond in a timely manner.
