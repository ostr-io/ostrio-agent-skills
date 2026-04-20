// /middleware.ts OR /src/middleware.ts
//
// Maintained Next.js ostr.io middleware via `seo-middleware-nextjs`.
//
// Install:
//   npm install seo-middleware-nextjs
//
// Env vars (any one — checked in order):
//   OSTRIO_AUTH='Basic xxx...'
//   PRERENDER_SERVICE_AUTH='Basic xxx...'
//   SPIDERABLE_SERVICE_AUTH='Basic xxx...'
//
// Docs: https://www.npmjs.com/package/seo-middleware-nextjs

import { SEOMiddleware } from 'seo-middleware-nextjs';

const seoMiddleware = new SEOMiddleware({
  // auth: process.env.OSTRIO_AUTH, // optional — auto-read from OSTRIO_AUTH / PRERENDER_SERVICE_AUTH / SPIDERABLE_SERVICE_AUTH
  rootURL: 'https://example.com', // canonical origin forwarded to renderer
  renderingEndpoint: 'https://render.ostr.io', // switch to 'https://render-bypass.ostr.io' when debugging
  keepGetQuery: true,
  supportEscapedFragment: true,
  retries: 2,
  ignoredPaths: /\/(?:preview|draft)\//, // project-specific exclusions
  debug: false,
});

export const middleware = seoMiddleware.createMiddleware();

// @see https://nextjs.org/docs/app/api-reference/file-conventions/middleware#matcher
export const config = {
  matcher: '/((?!api|_next/static|_next/image|_next/webpack-hmr|\\.well-known|favicon.ico).*)'
};
