const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(process.argv[2] || 'dist-check');
const port = Number(process.argv[3] || 8766);

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
};

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  let relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);

  if (pathname.startsWith('/shot/') && !pathname.endsWith('.html')) {
    relativePath = 'shot/[id].html';
  } else if (pathname.startsWith('/post/') && !pathname.endsWith('.html')) {
    relativePath = 'post/[id].html';
  } else if (!path.extname(relativePath)) {
    relativePath += '.html';
  }

  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(root)) {
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
  console.log(`Static preview: http://127.0.0.1:${port}`);
});
