// /middleware.js — Vercel Routing Middleware for ostr.io pre-rendering.
//
// Install:
//   npm install @vercel/functions
//
// Env vars:
//   OSTR_AUTH (required): 'Basic xxx...' from the pre-rendering panel
//   SPIDERABLE_SERVICE_URL (optional, default 'https://render.ostr.io')
//   ROOT_URL (recommended when preview URLs differ from the registered domain,
//                     e.g. 'https://example.com' — renderer rejects unregistered hosts)
//
// Docs: https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/vercel-prerendering.md

import { next } from '@vercel/functions';

// Condensed canonical UA list — see full source:
// https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/crawler-ua-regex.md
const BOT_AGENTS = ['googlebot', 'bingbot', 'adsbot-google', 'applebot', 'yandexbot', 'yahoo', 'duckduckbot', 'baiduspider', 'seznambot', 'petalbot','facebookexternalhit', 'facebookbot', 'meta-external', 'twitterbot', 'linkedinbot', 'slackbot', 'slack-imgproxy', 'discordbot', 'telegrambot', 'whatsapp', 'viber', 'skypeuripreview', 'pinterest', 'redditbot', 'embedly', 'flipboard', 'tumblr', 'ahrefsbot', 'mj12bot', 'dotbot', 'semrushbot', 'rogerbot', 'screaming frog seo spider', 'gptbot', 'chatgpt-user', 'oai-searchbot', 'openai.com', 'google-extended', 'gemini', 'bard', 'claudebot', 'claude-web', 'anthropic.com', 'perplexitybot', 'perplexity.ai', 'amazonbot', 'bytespider', 'ccbot', 'cohere-ai', 'deepseek', 'grok', 'xai', 'mistralai', 'duckassistbot', 'youbot', 'diffbot', 'ai2bot'];
const BOT_RE = new RegExp(BOT_AGENTS.join('|'), 'i');

// Canonical static-extensions regex — see:
// https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/static-extensions-regex.md
const STATIC_EXT = /\.(?:3ds|3g2|3gp|3gpp|7z|a|aac|aaf|adp|ai|aif|aiff|alz|ape|apk|appcache|ar|arj|asf|asx|atom|au|avchd|avi|bak|bbaw|bh|bin|bk|bmp|btif|bz2|bzip2|cab|caf|cco|cgm|class|cmx|cpio|cr2|crt|crx|css|csv|cur|dat|deb|der|dex|djvu|dll|dmg|dng|doc|docm|docx|dot|dotm|dra|drc|DS_Store|dsk|dts|dtshd|dvb|dwg|dxf|ear|ecelp4800|ecelp7470|ecelp9600|egg|eol|eot|eps|epub|exe|f4a|f4b|f4p|f4v|fbs|fh|fla|flac|fli|flv|fpx|fst|fvt|g3|geojson|gif|graffle|gz|gzip|h261|h263|h264|hqx|htc|ico|ief|img|ipa|iso|jad|jar|jardiff|jng|jnlp|jpeg|jpg|jpgv|jpm|js|jxr|key|kml|kmz|ktx|less|lha|lvp|lz|lzh|lzma|lzo|m2v|m3u|m4a|m4p|m4v|map|manifest|mar|markdown|md|mdi|mdown|mdwn|mht|mid|midi|mj2|mka|mkd|mkdn|mkdown|mkv|mml|mmr|mng|mobi|mov|movie|mp2|mp3|mp4|mp4a|mpe|mpeg|mpg|mpga|mpv|msi|msm|msp|mxf|mxu|nef|npx|nsv|numbers|o|oex|oga|ogg|ogv|opus|otf|pages|pbm|pcx|pdb|pdf|pea|pem|pgm|pic|pl|pm|png|pnm|pot|potm|potx|ppa|ppam|ppm|pps|ppsm|ppsx|ppt|pptm|pptx|prc|ps|psd|pya|pyc|pyo|pyv|qt|ra|rar|ras|raw|rdf|rgb|rip|rlc|rm|rmf|rmvb|ron|roq|rpm|rss|rtf|run|rz|s3m|s7z|safariextz|scpt|sea|sgi|shar|sil|sit|slk|smv|so|sub|svg|svgz|svi|swf|tar|tbz|tbz2|tcl|tga|tgz|thmx|tif|tiff|tk|tlz|topojson|torrent|ttc|ttf|txt|txz|udf|uvh|uvi|uvm|uvp|uvs|uvu|vcard|vcf|viv|vob|vtt|war|wav|wax|wbmp|wdp|weba|webapp|webm|webmanifest|webp|whl|wim|wm|wma|wml|wmlc|wmv|wmx|woff|woff2|wvx|xbm|xif|xla|xlam|xloc|xls|xlsb|xlsm|xlsx|xlt|xltm|xltx|xm|xmind|xpi|xpm|xsl|xwd|xz|yuv|z|zip|zipx)$/i;

export default async function middleware(request) {
  const url = new URL(request.url);

  if (request.method !== 'GET' && request.method !== 'HEAD') return next();
  if (STATIC_EXT.test(url.pathname)) return next();
  if (url.pathname.includes('/.well-known/')) return next();

  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const isBot = BOT_RE.test(ua);
  const hasEscapedFragment = url.searchParams.has('_escaped_fragment_');
  if (!isBot && !hasEscapedFragment) return next();

  const serviceURL = process.env.SPIDERABLE_SERVICE_URL || process.env.PRERENDER_SERVICE_URL || 'https://render.ostr.io';
  const auth = process.env.OSTR_AUTH || '';
  const canonicalOrigin = process.env.ROOT_URL || url.origin;

  let targetUrl = `${canonicalOrigin}${url.pathname}`;
  if (url.search && url.search.length > 1) {
    const params = new URLSearchParams(url.searchParams);
    params.delete('_escaped_fragment_');
    const qs = params.toString();
    if (qs) targetUrl += `?${qs}`;
  }

  const renderUrl = `${serviceURL}/?url=${encodeURIComponent(targetUrl)}&bot=${encodeURIComponent(ua)}`;

  try {
    const headers = new Headers(request.headers);
    headers.delete('Authorization');
    if (auth) headers.set('Authorization', auth);

    const response = await fetch(renderUrl, { headers, redirect: 'manual' });
    if (response.ok || response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
      return response;
    }
    console.warn(`[ostr-middleware] render.ostr.io returned ${response.status}, falling back to origin`);
    return next();
  } catch (err) {
    console.warn('[ostr-middleware] fetch to render.ostr.io failed, falling back to origin:', err);
    return next();
  }
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|_next/webpack-hmr|\\.well-known|favicon.ico).*)',
};
