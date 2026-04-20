// supabase/functions/<function-name>/index.ts
//
// Plain Deno handler using the shared helpers.
//
// Deploy:
//   supabase secrets set OSTR_AUTH='Basic ...' ROOT_URL='https://example.com'
//   supabase functions deploy <function-name> --no-verify-jwt

import { decide, fetchRendered, proxyToOrigin } from '../_shared/ostr.ts';

Deno.serve(async (req) => {
  const { shouldPrerender, renderTarget, ua } = decide(req);
  if (!shouldPrerender) {
    return proxyToOrigin(req);
  }
  const res = await fetchRendered(req, renderTarget, ua);
  return res ?? proxyToOrigin(req);
});
