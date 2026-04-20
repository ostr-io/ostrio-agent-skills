# Route inclusion / exclusion examples

Rules of thumb:

- **Include**: canonical, public, indexable pages with rendered DOM (home, product/list/detail, blog, docs, marketing pages, SEO landing pages, public profiles).
- **Exclude**: APIs, auth, admin, health, metrics, webhooks, billing, account, uploads, draft/preview, `.well-known`, feeds, sitemaps, robots.txt, static assets, non-`GET`/`HEAD` methods, websocket upgrades.

## Next.js `config.matcher`

```ts
// Default (covers common exclusions; start here)
export const config = {
  matcher: '/((?!api|_next/static|_next/image|_next/webpack-hmr|\\.well-known|favicon.ico).*)',
};

// Stricter: allow-list only page families
export const config = {
  matcher: [
    '/',
    '/(articles|blog|docs|pricing|about|contact|legal|changelog)(/.*)?',
    '/products(/.*)?',
    '/u/:username',
  ],
};
```

## `seo-middleware-nextjs` `ignoredPaths`

```ts
new SEOMiddleware({
  ignoredPaths: /^\/(?:admin|account|billing|settings|preview|draft|uploads|_internal)(?:\/|$)/i,
});
```

## `spiderable-middleware` (Node.js) `only` / `onlyRE` / `ignore`

```js
new Spiderable({
  only: [
    /^\/$/,
    /^\/blog\/?$/,
    /^\/blog\/[a-z0-9-]{3,64}\/?$/,
    /^\/products\/?$/,
    /^\/products\/[a-z0-9-]{3,64}\/?$/,
    /^\/docs\//,
  ],
  ignore: [
    '/api/',
    '/admin/',
    '/auth/',
    '/account/',
    '/billing/',
    '/checkout/',
    '/health',
    '/metrics',
    '/webhooks/',
    '/.well-known/',
    '/feed',
    '/rss',
    '/atom',
    '/sitemap.xml',
  ],
});
```

## Nginx `map $uri $is_page_route`

```nginx
map $uri $is_page_route {
    default 1;

    # API / admin / auth / webhooks — never
    ~*^/api/                0;
    ~*^/admin(/|$)          0;
    ~*^/auth(/|$)           0;
    ~*^/oauth(/|$)          0;
    ~*^/webhooks/           0;
    ~*^/graphql/?           0;
    ~*^/health/?            0;
    ~*^/metrics/?           0;

    # Feeds / sitemaps / well-known — never
    ~*^/\.well-known/       0;
    ~*^/sitemap.*\.xml$     0;
    ~*^/robots\.txt$        0;
    ~*^/feed/?              0;
    ~*^/.+/feed/?           0;
    ~*^/rss/?               0;
    ~*^/atom/?              0;

    # Uploads & assets that happen to lack extensions — never
    ~*^/uploads/            0;
    ~*^/media/              0;
}
```

## Cloudflare Worker `IGNORED_PATHS_RE`

```js
const IGNORED_PATHS_RE = /^\/(?:api|admin|auth|oauth|webhooks|graphql|health|metrics|account|billing|checkout|uploads|media|preview|draft)(?:\/|$)/i;
```

## WordPress — canonical ignore patterns

When using the Apache template on WordPress, in addition to generic rules add:

```apache
RewriteCond %{REQUEST_URI} !^/(?:wp-admin|wp-json|wp-content|wp-includes)(?:/|$) [NC]
RewriteCond %{REQUEST_URI} !^/(?:wp-login|wp-cron|wp-comments-post|xmlrpc)\.php$ [NC]
RewriteCond %{REQUEST_URI} !^/wp-sitemap.*\.xml$ [NC]
```

## Shopify (via Cloudflare Worker) — include only storefront

```js
// In the Worker, allow-list Shopify storefront routes only
const STOREFRONT_RE = /^\/(?:|products(?:\/|$)|collections(?:\/|$)|pages(?:\/|$)|blogs(?:\/|$)|blog(?:\/|$))/i;
if (!STOREFRONT_RE.test(url.pathname)) return fetch(request);
```

## Meta / Next.js — RSC streaming endpoints

Next.js issues requests to `_next/data/*`, `_next/image`, `_next/static`, `_next/webpack-hmr`,
and RSC chunk paths. **Always** exclude these (the default `matcher` does). If you
have a custom `matcher`, preserve these exclusions.

## Edge cases worth ignoring

- `/api/**` — obvious, but include any custom API prefix you use (`/graphql`, `/rpc`, `/trpc`).
- `/health`, `/healthz`, `/ready`, `/live`, `/ping` — load-balancer probes.
- `/metrics`, `/__prometheus`, `/__stats` — observability scrapes.
- `/_vercel/*`, `/_netlify/*` — platform-internal probes.
- `/_next/data/*` — Next.js RSC payload.
- `/.git/*`, `/.env*` — never leak; do not route to renderer (origin should 404).
- `/preview`, `/draft`, `/staging` — non-public content.

## Debugging: temporarily allow everything

In `spiderable-middleware`:

```js
// Intentional: render ALL routes for a short debug window
const spiderable = new Spiderable({ botsUA: ['.*'] });
```

> Never leave this in production — it renders traffic for every user agent, including
> humans, and burns credits.
