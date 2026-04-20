# `curl` Cookbook

Ad-hoc commands for verifying, debugging, and operating ostr.io pre-rendering.
All commands are copy-paste; replace `example.com` with your domain.

## Smoke tests

```shell
# Bot UA — must return `x-prerender-id`
curl -sI -A 'Googlebot/2.1' https://example.com/

# Human UA — must NOT return `x-prerender-id`
curl -sI -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/140.0.0.0 Safari/605.1.15' https://example.com/

# Legacy escaped-fragment — must return `x-prerender-id`
curl -sI 'https://example.com/?_escaped_fragment_='
```

## Exclusion confirmation (must NOT return `x-prerender-id`)

```shell
curl -sI -A 'Googlebot' https://example.com/favicon.ico
curl -sI -A 'Googlebot' https://example.com/robots.txt
curl -sI -A 'Googlebot' https://example.com/sitemap.xml
curl -sI -A 'Googlebot' https://example.com/api/health
curl -sI -A 'Googlebot' https://example.com/admin/
curl -sI -A 'Googlebot' https://example.com/.well-known/security.txt
curl -sI -X POST -A 'Googlebot' https://example.com/any
curl -sI -A 'Googlebot' -H 'Connection: Upgrade' -H 'Upgrade: websocket' https://example.com/socket
```

## Social preview UAs

```shell
curl -sI -A 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' https://example.com/
curl -sI -A 'Twitterbot/1.0' https://example.com/
curl -sI -A 'LinkedInBot/1.0 (compatible; Mozilla/5.0; +https://www.linkedin.com)' https://example.com/
curl -sI -A 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)' https://example.com/
curl -sI -A 'WhatsApp/2.22.20.72 A' https://example.com/
curl -sI -A 'TelegramBot (like TwitterBot)' https://example.com/
curl -sI -A 'Discordbot/2.0; +https://discordapp.com' https://example.com/
curl -sI -A 'Pinterest/0.2 (+http://www.pinterest.com/)' https://example.com/
```

## AI agents

```shell
curl -sI -A 'Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)' https://example.com/
curl -sI -A 'ChatGPT-User/1.0 (+https://openai.com/)' https://example.com/
curl -sI -A 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)' https://example.com/
curl -sI -A 'Claude-Web/1.0' https://example.com/
curl -sI -A 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://docs.perplexity.ai/guides/bots)' https://example.com/
curl -sI -A 'Mozilla/5.0 (compatible; Bytespider; bytespider@bytedance.com)' https://example.com/
curl -sI -A 'Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)' https://example.com/
curl -sI -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html; google-extended)' https://example.com/
curl -sI -A 'CCBot/2.0 (https://commoncrawl.org/faq/)' https://example.com/
```

## Connectivity & token diagnostic

```shell
# Prove egress to render-bypass.ostr.io works with test credentials (dummy token).
curl -sS -o /dev/null -w 'HTTP %{http_code}\ntotal %{time_total}s\n' \
  -H 'Authorization: Basic dGVzdDp0ZXN0' \
  'https://render-bypass.ostr.io/?url=https://example.com/'

# With your real token:
curl -sS -o /dev/null -w 'HTTP %{http_code}\ntotal %{time_total}s\n' \
  -H "Authorization: ${OSTR_AUTH}" \
  'https://render-bypass.ostr.io/?url=https://example.com/'
```

## Grab `X-Prerender-Id` for per-URL purge

```shell
curl -sI -A 'Googlebot' https://example.com/products/awesome-widget \
  | awk 'tolower($1) == "x-prerender-id:" { print $2 }'
```

## Diff bot snapshot vs human HTML (meta / og / json-ld parity)

```shell
URL="https://example.com/articles/some-slug"
curl -s -A 'Googlebot' "$URL"                    > /tmp/bot.html
curl -s -A 'Mozilla/5.0 (Macintosh) Safari'  "$URL" > /tmp/human.html

grep -E '<title>|<meta|application/ld\+json' /tmp/bot.html | head -40 > /tmp/bot.meta
grep -E '<title>|<meta|application/ld\+json' /tmp/human.html | head -40 > /tmp/human.meta
diff -u /tmp/human.meta /tmp/bot.meta || true
```

## Confirm meta status code is propagating

```shell
# Rendered 404
curl -sI -A 'Googlebot' https://example.com/intentionally-missing-page | head -1
# Rendered 410 (if you emit <meta name="response:status-code" content="410">)
curl -sI -A 'Googlebot' https://example.com/gone-on-purpose | head -1
```

## Redirect chain sanity (remember: renderer terminates after 4 hops)

```shell
curl -sI -A 'Googlebot' -L -o /dev/null -w '%{num_redirects} redirects -> %{url_effective}\n' \
  https://example.com/legacy-path
```

## Cache verification across regions (one-shot)

```shell
for RESOLVER in 1.1.1.1 8.8.8.8 208.67.222.222; do
  echo "=== resolver=$RESOLVER ==="
  curl -sI -A 'Googlebot' --resolve example.com:443:$(dig +short @$RESOLVER example.com | head -1) \
    https://example.com/ | grep -iE '^(x-prerender-id|cache|server)'
done
```

## Pre-warm sitemap URLs into cache

```shell
# Loops through sitemap.xml and warms each URL as Googlebot (one-off after a launch).
curl -s https://example.com/sitemap.xml \
  | grep -oE 'https?://[^<]+' \
  | while read url; do
      curl -s -o /dev/null -A 'Googlebot' "$url" &
    done
wait
```

> Prefer the ostr.io panel "Pre-render a website" action on `sitemap.xml` — it warms
> cache without burning credits on repeat-URLs and respects your plan's concurrency.
