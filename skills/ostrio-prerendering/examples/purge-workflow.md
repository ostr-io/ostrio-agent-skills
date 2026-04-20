# Cache purge workflow

Three tasks, three paths. Do not full-purge when a per-URL purge will do — full
purge is rate-limited to **once every 2 hours**, per-URL purge is unlimited.

## 1. Full host purge

Use when a global change landed (layout, nav, meta, shared templates, theme).

1. Open the ostr.io pre-rendering panel: <https://ostr.io/service/prerender>
2. Select the host.
3. Click *Purge Cache*.
4. Wait ~10 s for propagation.
5. Run the smoke test (see [`checklists.md#smoke-test-run-every-deploy`](../checklists.md#smoke-test-run-every-deploy)).

Constraint: once every 2 hours. If the rate limit hits, use per-URL purge for the
urgent pages and schedule the global purge.

## 2. Per-URL purge

Use when only a handful of pages changed (one product, one article, one landing page).

Step 1 — grab `X-Prerender-Id` for each URL:

```shell
for U in \
  "https://example.com/products/awesome-widget" \
  "https://example.com/blog/launch-2026-04" \
  "https://example.com/pricing"
do
  ID=$(curl -sI -A 'Googlebot' "$U" | awk 'tolower($1)=="x-prerender-id:"{print $2}' | tr -d '\r')
  printf '%s  %s\n' "$ID" "$U"
done
```

Step 2 — in the ostr.io panel for the host, paste each ID into the per-URL purge
form and submit. Unlimited — batch through the whole list.

Step 3 — re-pull the headers; `X-Prerender-Id` should be a new UUID.

## 3. Endpoint switch for aggressive debug

If you need to confirm a content fix without touching the cache (deploys are
hot; you want to see what the renderer actually computes from origin right now):

1. Change `serviceURL` / `SPIDERABLE_SERVICE_URL` / `PRERENDER_SERVICE_URL` / `renderingEndpoint` / Nginx proxy target
   to `https://render-bypass.ostr.io`.
2. Deploy (or flip env var without restart on supported platforms).
3. Reproduce.
4. Revert to `https://render.ostr.io`.
5. Purge per URL (those pages have a new snapshot now).

## 4. Warm cache for a new launch

Use the panel's *Pre-Render a website* action with `https://example.com/sitemap.xml`
to iterate every URL in the sitemap. This warms cache in one action and respects
your plan's concurrency cap.

Alternative (CLI):

```shell
curl -s https://example.com/sitemap.xml \
  | grep -oE '<loc>[^<]+</loc>' \
  | sed -E 's/<\/?loc>//g' \
  | xargs -n1 -P4 -I{} curl -s -o /dev/null -A 'Googlebot' '{}'
```

- `-P4` — 4 concurrent warmers. Adjust to your plan.
- Runs in foreground; pipe to `tee` or a log file if you want to capture.

## 5. Routine cadence

| Trigger | Purge scope |
| --- | --- |
| Marketing copy / nav / layout changes | Full host (if not rate-limited), else bulk per-URL on key pages |
| Single article / product update | Per-URL |
| Fixing genuine status code (404/410) | Per-URL (the affected route) |
| Fixing a JSON-LD / OG tag regression | Per-URL |
| After rotating `OSTR_AUTH` | No purge needed — cache is transparent to token changes |
| After toggling ES5 / strip-JS / any panel setting | Full host — engine behavior changes |
| After plan upgrade unlocking new features | Full host — depending on what changed |
| After DNS / hosting cutover | Full host |

## 6. Avoid these anti-patterns

- **Purging after every small edit** — wastes the 2-hour cadence allowance. Batch deploys.
- **Setting Cache TTL to 2 h to avoid purging** — 48–100× more renders + billing; prefer long TTL + purge.
- **Purging CDN without purging ostr.io** — CDN gets the stale snapshot back from ostr.io.
- **Purging ostr.io without purging CDN / SW / browser** — clients still show old copy.
