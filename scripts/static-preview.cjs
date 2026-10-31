const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || 8766);
const base = (process.argv[4] || '').replace(/\/$/, '');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

const server = http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent((request.url || '/').split('?')[0]); }
  catch { response.writeHead(400); response.end('Bad request'); return; }
  if (base && pathname !== base && !pathname.startsWith(base + '/')) {
    response.writeHead(404); response.end('Not found'); return;
  }
  pathname = pathname.slice(base.length) || '/';
  const relativePath = pathname === '/' || !path.extname(pathname) ? 'index.html' : pathname.slice(1);

  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(root + path.sep)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(data);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Static preview: http://127.0.0.1:${port}${base}/`);
});
