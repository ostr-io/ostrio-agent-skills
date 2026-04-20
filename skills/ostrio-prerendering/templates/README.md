# Templates

Copy-paste-ready snippets for every documented integration. Edit the marked
placeholders only — do not modify the canonical bot / static-extensions regexes
in place. Sync those from the upstream canonical sources linked in each file.

## Application-level

- [`nextjs-middleware.ts`](nextjs-middleware.ts) — self-managed Next.js middleware, zero deps.
- [`nextjs-seo-middleware.ts`](nextjs-seo-middleware.ts) — maintained package (`seo-middleware-nextjs`).
- [`node-express.js`](node-express.js) — Express / Connect / NestJS / vanilla Node via `spiderable-middleware`.
- [`node-http.js`](node-http.js) — vanilla `node:http` server.
- [`meteor-server.js`](meteor-server.js) — Meteor.js via `ostrio:spiderable-middleware` Atmosphere package.

## Edge / platform

- [`cloudflare.worker.js`](cloudflare.worker.js) — Cloudflare Worker (ES Module).
- [`vercel-middleware.js`](vercel-middleware.js) — Vercel Routing Middleware.
- [`supabase-shared.ts`](supabase-shared.ts) — shared helpers for Supabase Edge Functions.
- [`supabase-deno.ts`](supabase-deno.ts) — plain Deno Supabase function using the helpers.
- [`netlify-support-request.md`](netlify-support-request.md) — ticket template for Netlify Support.

## Server-level

- [`nginx-snippets.conf`](nginx-snippets.conf) — maps + location blocks for Nginx.
- [`apache-snippet.htaccess`](apache-snippet.htaccess) — `.htaccess` for Apache.
- [`caddy-snippet.caddyfile`](caddy-snippet.caddyfile) — Caddyfile snippet.

## Frontend

- [`frontend-detect-prerendering.js`](frontend-detect-prerendering.js) — generic `IS_PRERENDERING` / `IS_RENDERED` runtime.
- [`frontend-detect-prerendering.meteor.js`](frontend-detect-prerendering.meteor.js) — reactive variant for Meteor `ReactiveVar`.
- [`frontend-genuine-status-code.html`](frontend-genuine-status-code.html) — meta/comment patterns for non-200 responses.

## More stack-specific examples

Canonical upstream examples (WordPress, Drupal, Magento, Laravel, Joomla, Moodle, Zend, PHP-FPM, Django, Phusion Passenger, Go, Shopify, Hono, Oak, Fresh, static sites) live at:

<https://github.com/ostr-io/ostrio-docs/tree/master/docs/prerendering/examples>
