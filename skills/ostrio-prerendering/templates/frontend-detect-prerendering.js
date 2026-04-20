// Runtime detection of the ostr.io pre-rendering engine.
//
// Works in any SPA / PWA / SSR-hydrated bundle. Import / inline as early as
// possible in the client bundle.
//
// The engine sets before snapshotting:
//   window.IS_PRERENDERING      boolean  — true when the renderer is executing
//   window.IS_PRERENDERING_TYPE 'desktop' | 'mobile'
//
// Docs:
//   https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/detect-prerendering.md

// 1) Signal "page is ready" — speeds up rendering.
window.IS_RENDERED = false;

// 2) React to IS_PRERENDERING being flipped. It can be undefined on initial load
//    and toggled at any time during runtime — wire a setter.
let _isPrerendering = false;
Object.defineProperty(window, 'IS_PRERENDERING', {
  configurable: true,
  get() { return _isPrerendering; },
  set(val) {
    _isPrerendering = !!val;
    if (_isPrerendering) {
      onPrerenderingStart();
    }
  },
});

function onPrerenderingStart() {
  // Expand all accordions / details so content is in the rendered HTML.
  document.querySelectorAll('details').forEach((el) => { el.open = true; });
  document.querySelectorAll('[aria-expanded="false"]').forEach((el) => {
    el.setAttribute('aria-expanded', 'true');
  });

  // Hide overlays (modals, cookie banners, CAPTCHAs, newsletter popups).
  const overlaySelectors = [
    '[data-modal]',
    '.modal',
    '.cookie-banner',
    '.cookie-consent',
    '[data-cookie-banner]',
    '.newsletter-popup',
    '[data-newsletter-popup]',
    '.exit-intent',
    '#onetrust-banner-sdk',
    '#usercentrics-root',
  ];
  overlaySelectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.style.setProperty('display', 'none', 'important');
    });
  });
}

// 3) Flip IS_RENDERED once the app finishes hydrating + data fetches.
//    Example wire-up — adapt to your framework:
//
//    After last critical data fetch / DOM paint:
//      window.IS_RENDERED = true;
//
//    As a safety net to avoid stalls on errors:
//      setTimeout(() => { window.IS_RENDERED = true; }, 6000);
