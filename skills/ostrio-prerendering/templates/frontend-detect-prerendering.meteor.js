// Meteor.js reactive detection of the ostr.io pre-rendering engine.
//
// Docs:
//   https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/detect-prerendering-meteor.md

import { ReactiveVar } from 'meteor/reactive-var';

export const IS_PRERENDERING = new ReactiveVar(false);
export const IS_PRERENDERING_TYPE = new ReactiveVar(null); // 'desktop' | 'mobile' | null

window.IS_RENDERED = false;

let _isPrerendering = false;
Object.defineProperty(window, 'IS_PRERENDERING', {
  configurable: true,
  get() { return _isPrerendering; },
  set(val) {
    _isPrerendering = !!val;
    IS_PRERENDERING.set(_isPrerendering);
  },
});

let _type = null;
Object.defineProperty(window, 'IS_PRERENDERING_TYPE', {
  configurable: true,
  get() { return _type; },
  set(val) {
    _type = val;
    IS_PRERENDERING_TYPE.set(_type);
  },
});

// Example usage in a Blaze/React/Svelte component with Tracker.autorun:
//
//   import { Tracker } from 'meteor/tracker';
//   import { IS_PRERENDERING } from '/imports/ui/is-prerendering';
//
//   Tracker.autorun(() => {
//     if (IS_PRERENDERING.get()) {
//       // expand accordions, hide overlays, disable lazy load, etc.
//     }
//   });
