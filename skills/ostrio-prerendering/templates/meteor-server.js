// Meteor.js server-side integration — `ostrio:spiderable-middleware`.
//
// Install:
//   meteor add ostrio:spiderable-middleware
//
// Atmosphere: https://atmospherejs.com/ostrio/spiderable-middleware
// Docs:       https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/meteor-atmosphere.md

import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import Spiderable from 'meteor/ostrio:spiderable-middleware';

Meteor.startup(() => {
  const spiderable = new Spiderable({
    rootURL: process.env.ROOT_URL || Meteor.absoluteUrl(),
    serviceURL: process.env.SPIDERABLE_SERVICE_URL || 'https://render.ostr.io',
    // auth — set SPIDERABLE_SERVICE_AUTH or PRERENDER_SERVICE_AUTH env var
    debug: false,

    only: [
      /^\/?$/,
      /^\/articles\/?$/,
      /^\/article\/[A-Za-z0-9-]{6,}\/?$/,
      /^\/products\/?$/,
      /^\/product\/[A-Za-z0-9-]{3,}\/?$/,
    ],
    ignore: [
      '/account/',
      '/billing/',
      '/settings/',
      '/api/',
    ],
  });

  // Meteor mounts at the WebApp.connectHandlers — must be first in the chain.
  WebApp.connectHandlers.use(spiderable.handle);
});
