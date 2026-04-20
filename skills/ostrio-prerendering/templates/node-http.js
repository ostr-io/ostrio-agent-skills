// Vanilla Node.js http(s) server integration via `spiderable-middleware`.
//
// Install:  npm install spiderable-middleware

import http from 'node:http';
import Spiderable from 'spiderable-middleware';

const spiderable = new Spiderable({
  rootURL: process.env.ROOT_URL || 'https://example.com',
  serviceURL: process.env.SPIDERABLE_SERVICE_URL || 'https://render.ostr.io',
});

http.createServer((req, res) => {
  spiderable.handle(req, res, () => {
    // Callback — fires only when this request is NOT sent to the prerenderer.
    res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
    res.end('<html><head><title>Home</title></head><body>Hello</body></html>');
  });
}).listen(process.env.PORT || 3000);
