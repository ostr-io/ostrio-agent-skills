# ostr.io Pre-rendering — Validation Matrix

14 scenarios. Run every one on first integration. Run the smoke subset (scenarios 1, 2, 5, 7) on every deploy.

Replace `example.com` with your production domain throughout.

---

## Environment setup

```shell
export DOMAIN="example.com"
export UA_GOOGLEBOT='Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
export UA_BINGBOT='Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'
export UA_FACEBOOK='facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
export UA_TWITTERBOT='Twitterbot/1.0'
export UA_SLACKBOT='Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)'
export UA_LINKEDIN='LinkedInBot/1.0 (compatible; Mozilla/5.0; +https://www.linkedin.com)'
export UA_GPTBOT='Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)'
export UA_CLAUDEBOT='Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)'
export UA_PERPLEXITY='Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://docs.perplexity.ai/guides/bots)'
export UA_CHROME='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Chrome/140.0.0.0 Safari/605.1.15'
```

---

## Scenario 1 — Googlebot receives a pre-rendered response

```shell
curl -sI -A "$UA_GOOGLEBOT" "https://${DOMAIN}/"
```

Expected:

- `HTTP/2 200` (or `301`/`302` if the origin normally redirects — the renderer preserves status codes).
- Header `x-prerender-id: <uuid>` present.
- `content-type: text/html; charset=utf-8`.
- `cache-control` reflects the per-host Cache TTL.

---

## Scenario 2 — Normal browser traffic is NOT pre-rendered

```shell
curl -sI -A "$UA_CHROME" "https://${DOMAIN}/"
```

Expected:

- `HTTP/2 200`.
- **No** `x-prerender-id` header.
- `content-type: text/html; charset=utf-8`.
- Cache/CDN/`server` headers consistent with the origin.

---

## Scenario 3 — `facebookexternalhit` returns snapshot with correct `og:*` tags

```shell
curl -s -A "$UA_FACEBOOK" "https://${DOMAIN}/" | grep -iE '(og:title|og:description|og:image|og:url|twitter:card)'
```

Expected: all four `og:*` tags present, matching the product/marketing copy.

Also verify headers:

```shell
curl -sI -A "$UA_FACEBOOK" "https://${DOMAIN}/" | grep -i x-prerender-id
```

---

## Scenario 4 — Twitter/X + LinkedIn + Slack previews

```shell
for UA in "$UA_TWITTERBOT" "$UA_LINKEDIN" "$UA_SLACKBOT"; do
  echo "=== $UA ==="
  curl -sI -A "$UA" "https://${DOMAIN}/" | grep -iE '^(http|x-prerender-id)'
done
```

Expected: every UA returns `x-prerender-id`.

---

## Scenario 5 — Legacy `_escaped_fragment_` still works

```shell
curl -sI "https://${DOMAIN}/?_escaped_fragment_="
```

Expected: `x-prerender-id` present. (Non-Google crawlers still send this; supporting it is cheap insurance.)

---

## Scenario 6 — AI agents receive snapshots

```shell
for UA in "$UA_GPTBOT" "$UA_CLAUDEBOT" "$UA_PERPLEXITY"; do
  echo "=== $UA ==="
  curl -sI -A "$UA" "https://${DOMAIN}/" | grep -iE '^(http|x-prerender-id)'
done
```

Expected: all three return `x-prerender-id`. Add `Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)`, `Googlebot-Image/1.0`, `Bytespider`, `DuckDuckBot/1.1`, etc. to the matrix if the site depends on those surfaces.

---

## Scenario 7 — Static assets bypass the renderer

```shell
for PATH_ in '/favicon.ico' '/robots.txt' '/sitemap.xml' '/assets/app.js' '/styles/main.css' '/fonts/roboto.woff2' '/static/image.png' '/.well-known/security.txt'; do
  HDR=$(curl -sI -A "$UA_GOOGLEBOT" "https://${DOMAIN}${PATH_}" | grep -i x-prerender-id)
  echo "${PATH_}: ${HDR:-OK (no x-prerender-id)}"
done
```

Expected: **no** `x-prerender-id` for any path.

If any asset shows a prerender header, the static-extensions regex or path-ignore regex is incomplete — sync from [the canonical source](https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/static-extensions-regex.md).

---

## Scenario 8 — APIs / admin / auth / webhooks bypass the renderer

```shell
for PATH_ in '/api/health' '/api/v1/users' '/admin' '/auth/login' '/oauth/callback' '/webhooks/stripe' '/graphql'; do
  HDR=$(curl -sI -A "$UA_GOOGLEBOT" "https://${DOMAIN}${PATH_}" | grep -i x-prerender-id)
  echo "${PATH_}: ${HDR:-OK (no x-prerender-id)}"
done
```

Expected: **no** `x-prerender-id` on any path.

If the path doesn't exist on the site, substitute real paths. What matters: confirm the matcher excludes non-page routes.

---

## Scenario 9 — `POST` / `PUT` / `DELETE` are never rendered

```shell
curl -sI -X POST -A "$UA_GOOGLEBOT" "https://${DOMAIN}/api/v1/echo" | grep -i x-prerender-id
curl -sI -X PUT  -A "$UA_GOOGLEBOT" "https://${DOMAIN}/api/v1/echo" | grep -i x-prerender-id
curl -sI -X DELETE -A "$UA_GOOGLEBOT" "https://${DOMAIN}/api/v1/echo" | grep -i x-prerender-id
```

Expected: no output (header absent). `POST`/`PUT`/`PATCH`/`DELETE` must never be proxied.

---

## Scenario 10 — WebSocket upgrade passes through

```shell
curl -sI -A "$UA_GOOGLEBOT" \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  "https://${DOMAIN}/socket" | grep -iE '^(http|x-prerender-id)'
```

Expected: origin handles the upgrade (`101 Switching Protocols` or origin-specific). **No** `x-prerender-id`.

---

## Scenario 11 — Source-view parity for a dynamic page

```shell
curl -s -A "$UA_GOOGLEBOT" "https://${DOMAIN}/articles/some-slug" > /tmp/bot.html
curl -s -A "$UA_CHROME"    "https://${DOMAIN}/articles/some-slug" > /tmp/human.html
diff -u <(grep -E '<title>|<meta|json-ld|application/ld\+json' /tmp/bot.html) \
        <(grep -E '<title>|<meta|json-ld|application/ld\+json' /tmp/human.html)
```

Expected:

- Bot HTML includes the rendered `<title>`, `<meta name="description">`, Open Graph / Twitter cards, and any `application/ld+json` blocks.
- Human HTML may have placeholder `<title>`, empty meta, or rely on hydration — that's fine.
- Goal: confirm the bot snapshot contains the fully populated head.

---

## Scenario 12 — Genuine status codes propagate

For routes that should return a non-`200`:

```shell
curl -sI -A "$UA_GOOGLEBOT" "https://${DOMAIN}/intentionally-missing-page"
```

Expected: `HTTP/2 404` with `x-prerender-id`.

If it returns `200` instead: the SPA is not emitting `<meta name="response:status-code" content="404">` — fix per `SKILL.md §7.4`.

---

## Scenario 13 — `X-Prerender-Id` can be retrieved for per-URL purge

Steps:

1. Run Scenario 1 — capture the `x-prerender-id` value from the header.
2. Log into the ostr.io pre-rendering panel.
3. Select the host.
4. Paste the ID into the single-page purge form.
5. Click *Purge*.
6. Re-run Scenario 1; confirm the ID has changed.

Expected: a new UUID in the response — proves the single-page purge succeeded.

---

## Scenario 14 — Connectivity diagnostic with test credentials

```shell
curl -sS -o /dev/null -w '%{http_code}\n' \
  -H 'Authorization: Basic dGVzdDp0ZXN0' \
  "https://render-bypass.ostr.io/?url=https://${DOMAIN}/"
```

Expected: `200`.

This test proves:

- The host network can reach `render-bypass.ostr.io` (egress OK).
- TLS handshake works.
- Auth format is accepted.

If this fails but production traffic also fails, the problem is egress (WAF, firewall, CA trust). If this succeeds but production fails, the problem is inside your integration (matcher/ignore/auth plumbing).

> Never ship `Basic dGVzdDp0ZXN0` to production. Revert to the real `OSTR_AUTH` immediately after the diagnostic.

---

## Automated regression script

```shell
#!/usr/bin/env bash
# scripts/validate-prerender.sh
set -euo pipefail

DOMAIN="${DOMAIN:-example.com}"
UA_BOT='Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
UA_HUMAN='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Chrome/140.0.0.0 Safari/605.1.15'

has_prerender() {
  curl -sI "${2:-}" -A "$1" "https://${DOMAIN}${3:-/}" | grep -qi '^x-prerender-id:'
}

fail=0
pass=0

assert() {
  local what="$1"; local expect="$2"; local got="$3"
  if [[ "$got" == "$expect" ]]; then
    printf '  PASS  %s\n' "$what"; pass=$((pass+1))
  else
    printf '  FAIL  %s  expected=%s got=%s\n' "$what" "$expect" "$got"; fail=$((fail+1))
  fi
}

echo "=== $DOMAIN ==="

has_prerender "$UA_BOT"   "" "/"                && assert "bot: /"          "present" "present" || assert "bot: /"          "present" "absent"
has_prerender "$UA_HUMAN" "" "/"                && assert "human: /"        "absent"  "present" || assert "human: /"        "absent"  "absent"
has_prerender "$UA_BOT"   "" "/?_escaped_fragment_=" && assert "escaped fragment" "present" "present" || assert "escaped fragment" "present" "absent"
has_prerender "$UA_BOT"   "" "/favicon.ico"     && assert "bot: favicon"    "absent"  "present" || assert "bot: favicon"    "absent"  "absent"
has_prerender "$UA_BOT"   "" "/api/health"      && assert "bot: /api"       "absent"  "present" || assert "bot: /api"       "absent"  "absent"
has_prerender "$UA_BOT"   "" "/robots.txt"      && assert "bot: robots.txt" "absent"  "present" || assert "bot: robots.txt" "absent"  "absent"
has_prerender "$UA_BOT"   "" "/sitemap.xml"     && assert "bot: sitemap.xml" "absent" "present" || assert "bot: sitemap.xml" "absent" "absent"

echo
echo "PASS=$pass FAIL=$fail"
[[ $fail -eq 0 ]]
```

Run in CI after every deploy; fail the pipeline on regression.

---

## Pass criteria summary

| # | Scenario | Expect `X-Prerender-Id`? |
| --- | --- | --- |
| 1 | Googlebot on `/` | Yes |
| 2 | Chrome on `/` | **No** |
| 3 | `facebookexternalhit` on `/` | Yes + OG tags |
| 4 | Twitter/LinkedIn/Slack on `/` | Yes |
| 5 | `?_escaped_fragment_=` on `/` | Yes |
| 6 | GPTBot/ClaudeBot/Perplexity on `/` | Yes |
| 7 | Static assets (favicon/robots/sitemap/js/css/png/woff2) | **No** |
| 8 | API/admin/auth/webhooks paths | **No** |
| 9 | `POST`/`PUT`/`DELETE` | **No** |
| 10 | WebSocket upgrade | **No** |
| 11 | Bot snapshot contains meta/OG/JSON-LD | Content parity vs rendered DOM |
| 12 | Bot 404 page returns `HTTP 404` | Yes (404 + prerender) |
| 13 | Per-URL purge changes `X-Prerender-Id` | New UUID after purge |
| 14 | Connectivity probe to `render-bypass.ostr.io` | `HTTP 200` |
