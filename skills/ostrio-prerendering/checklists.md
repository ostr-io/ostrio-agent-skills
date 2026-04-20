# ostr.io Pre-rendering — Checklists

Copy-paste and tick as you go. Each list is self-contained.

---

## Pre-integration checklist

Collect before touching any config. Block on missing items.

- [ ] Production domain (FQDN) identified (e.g. `https://example.com`)
- [ ] Subdomains in scope listed (`www.`, `app.`, `shop.`, etc.)
- [ ] Subdomain coverage plan confirmed — TLD ostr.io key covers subdomains only on PRO/BUSINESS; a separate API key per subdomain is preferred
- [ ] Host added + verified in ostr.io pre-rendering panel (<https://ostr.io/service/prerender>)
- [ ] `OSTR_AUTH` (`Basic ...`) token retrieved for every host in scope
- [ ] Hosting / deployment target identified (Vercel, Netlify, Cloudflare Pages, Supabase, self-hosted Nginx/Apache/Caddy, ECS/Fargate, etc.)
- [ ] Existing reverse proxy / CDN mapped (Cloudflare, Fastly, Akamai, AWS CloudFront, Bunny, etc.)
- [ ] Framework / runtime version recorded (Next.js 15+, Node 20+, Meteor 3+, etc.)
- [ ] Allow-list of page routes defined
- [ ] Deny-list of non-page routes defined (API, admin, auth, health, metrics, webhooks, feeds, sitemaps, websockets, non-`GET`/`HEAD`)
- [ ] Query-string behavior decided (`keepGetQuery` / `{uri}` vs `{path}`)
- [ ] Cache TTL plan decided (default: 24 h; adjust per content velocity)
- [ ] Secret storage chosen (Vercel/Netlify/Cloudflare/Supabase Secrets, systemd `Environment=`, Docker secret, AWS SSM)
- [ ] Previous pre-rendering vendor identified (if any) — keep legacy env-var names for zero-config migration

---

## Integration go-live checklist

Runs in production, after the integration is deployed to the primary domain.

- [ ] Middleware / config file committed (no `Basic ...` hardcoded)
- [ ] Env vars set in every environment (production, preview/staging, development if needed)
- [ ] Static-asset exclusions confirmed (JS, CSS, images, fonts, maps, manifests)
- [ ] API/admin/auth/health/feeds/sitemaps/`.well-known` exclusions confirmed
- [ ] WebSocket upgrade paths excluded (`Connection: Upgrade`)
- [ ] Non-`GET`/`HEAD` methods excluded
- [ ] Smoke test passes (§ smoke-test below)
- [ ] `curl` Googlebot call returns `X-Prerender-Id`
- [ ] `curl` normal UA does **not** return `X-Prerender-Id`
- [ ] `curl` `?_escaped_fragment_=` returns `X-Prerender-Id`
- [ ] `facebookexternalhit` receives correct `og:title` / `og:description` / `og:image`
- [ ] JSON-LD / microdata present in the rendered snapshot (if site uses structured data)
- [ ] ostr.io panel shows successful requests (no spike in `7xx` codes)
- [ ] No increase in origin error rate for human traffic (compare pre/post deploy dashboards)
- [ ] Runbook link pinned in the team wiki / repo `README`

---

## Smoke-test (run every deploy)

Replace `example.com` with your domain.

```shell
DOMAIN="example.com"

echo "--- bot: Googlebot ---"
curl -sI -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' "https://${DOMAIN}/" | grep -iE 'http/|x-prerender|cache-control|content-type'

echo "--- bot: facebookexternalhit ---"
curl -sI -A 'facebookexternalhit/1.1' "https://${DOMAIN}/" | grep -iE 'http/|x-prerender'

echo "--- bot: PerplexityBot (AI) ---"
curl -sI -A 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://docs.perplexity.ai/guides/bots)' "https://${DOMAIN}/" | grep -iE 'http/|x-prerender'

echo "--- human: Chrome ---"
curl -sI -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Chrome/140.0.0.0 Safari/605.1.15' "https://${DOMAIN}/" | grep -iE 'http/|x-prerender'

echo "--- legacy escaped fragment ---"
curl -sI "https://${DOMAIN}/?_escaped_fragment_=" | grep -iE 'http/|x-prerender'

echo "--- API route must NOT render ---"
curl -sI -A 'Googlebot' "https://${DOMAIN}/api/health" | grep -iE 'http/|x-prerender'

echo "--- static asset must NOT render ---"
curl -sI -A 'Googlebot' "https://${DOMAIN}/favicon.ico" | grep -iE 'http/|x-prerender'
```

Pass criteria:

| Section | Expect `X-Prerender-Id`? |
| --- | --- |
| Googlebot | **Yes** |
| facebookexternalhit | **Yes** |
| PerplexityBot | **Yes** |
| Chrome | No |
| `?_escaped_fragment_=` | **Yes** |
| `/api/health` | No |
| `/favicon.ico` | No |

---

## Post-deploy checklist (per release)

- [ ] Smoke test rerun against production
- [ ] Targeted cache purge issued for every page whose rendered HTML changed
- [ ] If layout / nav / meta / shared template changed: full host purge (rate-limit: once per 2 h)
- [ ] ostr.io panel — `7xx` distribution reviewed (no spike in `707` / `708`)
- [ ] DevTools on a randomly-picked page: open in private window, confirm `X-Prerender-Id` is a new UUID (not the old one)

---

## Maintenance checklist (quarterly)

- [ ] Cache TTL revisited vs content velocity (2 h–744 h)
- [ ] Usage / credits reviewed in panel — credits never expire but trend shows growth hotspots
- [ ] `7xx` code distribution reviewed (`703` = add credits; `704` = plan upgrade; `707` = fix origin JS errors; `708` = origin latency)
- [ ] Bot UA regex synced from canonical source (see SKILL.md §11) — only for server-level configs (Nginx/Apache/Caddy/Cloudflare Worker); NPM packages auto-update via `npm upgrade`
- [ ] Static-extensions regex synced from canonical source
- [ ] `OSTR_AUTH` token rotation plan in place (rotate on contributor offboarding)
- [ ] All access to panel audited — remove stale team members
- [ ] ostr.io plan vs scope reviewed (TLD-only vs subdomains; PRO/BUSINESS for subdomain coverage)
- [ ] Runbook link + this skill link in onboarding docs for new engineers

---

## Onboarding a new engineer

- [ ] Share ostr.io panel access (read-only if they don't deploy)
- [ ] Share [this skill's `SKILL.md`](SKILL.md) + [`troubleshooting.md`](troubleshooting.md)
- [ ] Walk through the §9 smoke test on staging
- [ ] Walk through per-URL purge in the panel
- [ ] Demo the `render-bypass.ostr.io` debug switch (one env-var change)
- [ ] Point to the exclusion rules that decide which routes render — any new route family MUST be added here

---

## Debug-mode switch checklist

When the team is actively debugging a rendered-HTML regression:

- [ ] Change `renderingEndpoint` / `PRERENDER_SERVICE_URL` / `SPIDERABLE_SERVICE_URL` / `serviceURL` to `https://render-bypass.ostr.io`
- [ ] Deploy (or set env var without restart if platform supports)
- [ ] Reproduce the bug (bypass cache shortcuts)
- [ ] When fixed, revert to `https://render.ostr.io`
- [ ] Run the full smoke test
- [ ] Purge the affected URLs (their cache was populated by the bypass endpoint's path too)

---

## When to ask the user for input

- [ ] Unsure whether the site is PRO/BUSINESS on ostr.io? — Ask. Subdomain coverage depends on plan.
- [ ] Unsure which proxy layer owns HTTPS termination? — Ask. `Host` header propagation and `X-Forwarded-*` depend on it.
- [ ] Unsure whether a path is "page" or "API"? — Ask. Rendering an API costs credits and corrupts cache.
- [ ] Unsure whether the site handles redirects in SSR vs client? — Ask. 4-redirect cap inside the renderer.
- [ ] Anything not covered by [this skill](SKILL.md) or the [canonical docs](SKILL.md#14-authoritative-sources)? — Verify in current ostr.io dashboard/docs or reach out to support team that usually responds in timely manner.
