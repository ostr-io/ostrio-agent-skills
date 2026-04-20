// Express / Connect / NestJS / Fastify(-with-connect) / vanilla http integration
// via `spiderable-middleware`.
//
// Install:
//   npm install spiderable-middleware
//
// Env vars (any one):
//   ROOT_URL='https://example.com'
//   SPIDERABLE_SERVICE_URL='https://render.ostr.io'
//   SPIDERABLE_SERVICE_AUTH='Basic xxx...'   OR   PRERENDER_SERVICE_AUTH='Basic xxx...'
//
// Docs: https://github.com/veliovgroup/spiderable-middleware

import express from 'express';
import Spiderable from 'spiderable-middleware';

const spiderable = new Spiderable({
  rootURL: process.env.ROOT_URL || 'https://example.com',
  serviceURL: process.env.SPIDERABLE_SERVICE_URL || 'https://render.ostr.io',
  // auth — auto-read from SPIDERABLE_SERVICE_AUTH / PRERENDER_SERVICE_AUTH env vars
  timeout: 180000,
  debug: false,

  // Strongly recommended: exclusive allow-list of page routes.
  // Without these, random bot-hit paths get rendered and cost credits.
  onlyRE: /^\/(?:$|articles\/?|article\/[A-Za-z0-9-]+\/?$|products\/?|product\/[A-Za-z0-9-]+\/?$|blog\/?|blog\/[A-Za-z0-9-]+\/?$|docs\/.*|about\/?|contact\/?|pricing\/?)/,

  // Deny-list — these never reach the renderer.
  ignore: [
    '/api/',
    '/admin/',
    '/auth/',
    '/oauth/',
    '/webhooks/',
    '/graphql',
    '/health',
    '/metrics',
    '/.well-known/',
    '/account/',
    '/billing/',
    '/checkout/',
    '/cart/',
    '/feed',
    '/rss',
    '/atom',
    '/sitemap.xml',
    '/robots.txt',
  ],
});

const app = express();

// Must be the topmost handler so bot traffic short-circuits before other middleware runs.
app.use(spiderable.handle);

app.get('/', (_req, res) => res.send('<html><head><title>Home</title></head><body>Hello</body></html>'));

app.listen(process.env.PORT || 3000);
