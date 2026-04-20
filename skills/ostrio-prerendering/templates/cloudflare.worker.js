// Cloudflare Worker for ostr.io pre-rendering (ES Module Worker).
//
// Deploy:
//   1. Cloudflare Dashboard → Workers & Pages → Create → "Hello World"
//   2. Paste this file
//   3. Variables and Secrets → add OSTR_AUTH = 'Basic xxx...'
//   4. Triggers → Custom Domain or Route: example.com/* (add *example.com/* for subdomains)
//   5. Caching → Purge Everything once
//
// Canonical source:
//   https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/examples/cloudflare-worker/cloudflare.worker.js

const SUPPORT_ESCAPED_FRAGMENT = true;
const PRERENDER_WITH_QUERY = true;
const IGNORED_PATHS_RE = false; // project-specific, e.g. /^\/(admin|preview)\//i

// Canonical static-extensions set — sync from:
// https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/static-extensions-regex.md
const IGNORE_EXTENSIONS = new Set(['3ds','3g2','3gp','3gpp','7z','a','aac','aaf','adp','ai','aif','aiff','alz','ape','apk','appcache','ar','arj','asf','asx','atom','au','avchd','avi','bak','bbaw','bh','bin','bk','bmp','btif','bz2','bzip2','cab','caf','cco','cgm','class','cmx','cpio','cr2','crt','crx','css','csv','cur','dat','deb','der','dex','djvu','dll','dmg','dng','doc','docm','docx','dot','dotm','dra','drc','DS_Store','dsk','dts','dtshd','dvb','dwg','dxf','ear','ecelp4800','ecelp7470','ecelp9600','egg','eol','eot','eps','epub','exe','f4a','f4b','f4p','f4v','fbs','fh','fla','flac','fli','flv','fpx','fst','fvt','g3','geojson','gif','graffle','gz','gzip','h261','h263','h264','hqx','htc','ico','ief','img','ipa','iso','jad','jar','jardiff','jng','jnlp','jpeg','jpg','jpgv','jpm','js','jxr','key','kml','kmz','ktx','less','lha','lvp','lz','lzh','lzma','lzo','m2v','m3u','m4a','m4p','m4v','map','manifest','mar','markdown','md','mdi','mdown','mdwn','mht','mid','midi','mj2','mka','mkd','mkdn','mkdown','mkv','mml','mmr','mng','mobi','mov','movie','mp2','mp3','mp4','mp4a','mpe','mpeg','mpg','mpga','mpv','msi','msm','msp','mxf','mxu','nef','npx','nsv','numbers','o','oex','oga','ogg','ogv','opus','otf','pages','pbm','pcx','pdb','pdf','pea','pem','pgm','pic','pl','pm','png','pnm','pot','potm','potx','ppa','ppam','ppm','pps','ppsm','ppsx','ppt','pptm','pptx','prc','ps','psd','pya','pyc','pyo','pyv','qt','ra','rar','ras','raw','rdf','rgb','rip','rlc','rm','rmf','rmvb','ron','roq','rpm','rss','rtf','run','rz','s3m','s7z','safariextz','scpt','sea','sgi','shar','sil','sit','slk','smv','so','sub','svg','svgz','svi','swf','tar','tbz','tbz2','tcl','tga','tgz','thmx','tif','tiff','tk','tlz','topojson','torrent','ttc','ttf','txt','txz','udf','uvh','uvi','uvm','uvp','uvs','uvu','vcard','vcf','viv','vob','vtt','war','wav','wax','wbmp','wdp','weba','webapp','webm','webmanifest','webp','whl','wim','wm','wma','wml','wmlc','wmv','wmx','woff','woff2','wvx','xbm','xif','xla','xlam','xloc','xls','xlsb','xlsm','xlsx','xlt','xltm','xltx','xm','xmind','xml','xpi','xpm','xsl','xwd','xz','yuv','z','zip','zipx']);

// Canonical crawler UA list — sync from:
// https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/crawler-ua-regex.md
const BOT_AGENTS = ['\\.net crawler','360spider','50\\.nu','8bo crawler bot','aboundex','accoona','adldxbot','adsbot-google','ahrefsbot','altavista','appengine-google','applebot','archiver','arielisbot','ask jeeves','auskunftbot','baidumobaider','baiduspider','becomebot','bingbot','bingpreview','bitbot','bitlybot','blitzbot','blogbridge','boardreader','botseer','catchbot','catchpoint bot','charlotte','checklinks','cliqzbot','clumboot','coccocbot','converacrawler','crawl-e','crawlconvera','dataparksearch','daum','deusu','developers\\.google\\.com/+/web/snippet','discordbot','dotbot','duckduckbot','elefent','embedly','evernote','exabot','facebookbot','facebookexternalhit','fatbot','fdse robot','feed seeker bot','feedfetcher','femtosearchbot','findlinks','flamingo_searchengine','flipboard','followsite bot','furlbot','fyberspider','gaisbot','galaxybot','geniebot','genieo','gigablast','gigabot','girafabot','gomezagent','gonzo1','google sketchup','google-structured-data-testing-tool','googlebot','haosouspider','heritrix','holmes','hoowwwer','htdig','hubspot\\ crawler','ia_archiver','idbot','infuzapp','innovazion crawler','internetarchive','iqdb','iskanie','istellabot','izsearch\\.com','kaloogabot','kaz\\.kz_bot','kd bot','konqueror','kraken','kurzor','larbin','leia','lesnikbot','linguee bot','linkaider','linkapediabot','linkedinbot','lite bot','llaut','lookseek','lycos','mail\\.ru_bot','masidani_bot','masscan','mediapartners-google','metajobbot','mj12bot','mnogosearch','mogimogi','mojeekbot','motominerbot','mozdex','msiecrawler','msnbot','msrbot','netpursual','netresearch','netvibes','newsgator','ng-search','nicebot','nutchcvs','nuzzel','nymesis','objectssearch','odklbot','omgili','oovoo','oozbot','openfosbot','orangebot','orbiter','org_bot','outbrain','pagepeeker','pagesinventory','parsijoobot','paxleframework','peeplo screenshot bot','pinterest','plantynet_webrobot','plukkie','pompos','psbot','quora link preview','qwantify','read%20later','reaper','redcarpet','redditbot','retreiver','riddler','rival iq','rogerbot','saucenao','scooter','scrapy','screaming\\ frog\\ seo\\ spider','scrubby','searchie','searchsight','seekbot','semanticdiscovery','seznambot','showyoubot','simplepie','simpy','sitelockspider','skypeuripreview','petalbot','slack-imgproxy','slackbot','slurp','snappy','sogou','solofield','speedy spider','speedyspider','sebot\\-wa','sputnikbot','stackrambler','teeraidbot','teoma','theusefulbot','thumbshots\\.ru','thumbshotsbot','tineye','tiktokspider','toweya\\.com','toweyabot','tumblr','tweetedtimes','tweetmemebot','twitterbot','url2png','vagabondo','vebidoobot','viber','visionutils','vkshare','voilabot','vortex','votay bot','voyager','w3c_validator','wasalive\\.bot','web-sniffer','websquash\\.com','webthumb','whatsapp','whatweb','wire','wotbox','yacybot','yahoo','yandex','yeti','yisouspider','yodaobot','yooglifetchagent','yoozbot','yottaamonitor','yowedo','zao-crawler','zebot_www\\.ze\\.bz','zooshot','zyborg','ai2bot','amazonbot','anthropic\\.com','bard','bytespider','ccbot','chatgpt-user','claude-web','claudebot','cohere-ai','deepseek','diffbot','duckassistbot','gemini','google-extended','gptbot','grok','meta-external','mistralai','oai-searchbot','openai\\.com','perplexity\\.ai','perplexitybot','xai','youbot'];
const BOT_AGENTS_RE = new RegExp(BOT_AGENTS.join('|'), 'i');

const DICT = {
  escapedFragment: '_escaped_fragment_',
  wellknownPath: '/.well-known/',
  slash: '/',
  dot: '.',
  empty: '',
  manual: 'manual',
  allowedMethods: new Set(['GET', 'HEAD']),
  args: { bot: '&bot=' },
  service: {
    origin: 'ostr.io',
    originTld: '.ostr.io',
    renderBase: 'https://render.ostr.io/?url=',
    testAuth: 'Basic dGVzdDp0ZXN0',
  },
  headers: { ua: 'user-agent', auth: 'authorization', host: 'host' },
};

const beginningSlashRe = /^\//;
const trailingSlashRe = /\/$/;

function checkStatic(path) {
  const lastDot = path.lastIndexOf(DICT.dot);
  const lastSlash = path.lastIndexOf(DICT.slash);
  const ext = lastDot > lastSlash ? path.slice(lastDot + 1) : DICT.empty;
  return !!(ext && IGNORE_EXTENSIONS.has(ext));
}

function shouldPrerender(request, url, ua) {
  if (!DICT.allowedMethods.has(request.method)) return false;
  const path = url.pathname.toLowerCase();
  if (url.hostname === DICT.service.origin || url.hostname.endsWith(DICT.service.originTld) || path.includes(DICT.wellknownPath)) return false;
  if (checkStatic(path)) return false;
  if (IGNORED_PATHS_RE instanceof RegExp && IGNORED_PATHS_RE.test(path)) return false;
  if (!ua || !BOT_AGENTS_RE.test(ua)) return false;
  return true;
}

export default {
  async fetch(request, env) {
    const AUTH_HEADER = env.OSTR_AUTH || DICT.service.testAuth;
    const url = new URL(request.url);
    const ua = (request.headers.get(DICT.headers.ua) || DICT.empty).toLowerCase();
    const escapedFragment = url.searchParams.get(DICT.escapedFragment);

    if (!shouldPrerender(request, url, ua) && typeof escapedFragment !== 'string') {
      return fetch(request);
    }

    let fetchUrl = `${url.origin}`;
    if (SUPPORT_ESCAPED_FRAGMENT && typeof escapedFragment === 'string') {
      url.searchParams.delete(DICT.escapedFragment);
      if (escapedFragment.length) {
        fetchUrl += `${url.pathname.replace(trailingSlashRe, DICT.empty)}${DICT.slash}${escapedFragment.replace(beginningSlashRe, DICT.empty)}`;
      } else {
        fetchUrl += url.pathname.replace(trailingSlashRe, DICT.empty);
      }
      if (checkStatic(fetchUrl.toLowerCase())) return fetch(request);
    } else {
      fetchUrl += url.pathname;
    }

    if (PRERENDER_WITH_QUERY && url.search && url.search.length > 1) {
      fetchUrl += url.search;
    }

    const headers = new Headers(request.headers);
    headers.delete(DICT.headers.auth);
    headers.set(DICT.headers.auth, AUTH_HEADER);

    try {
      return await fetch(new Request(
        `${DICT.service.renderBase}${encodeURIComponent(fetchUrl)}${DICT.args.bot}${encodeURIComponent(ua)}`,
        { headers, redirect: DICT.manual }
      ));
    } catch (fetchError) {
      console.warn('[ostr.io] [cloudflare-worker] RENDER FAILED, FALLBACK TO ORIGIN:', fetchError);
      return fetch(request);
    }
  }
};
