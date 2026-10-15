const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // CORS & caching headers for development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  let cleanUrl = req.url.split('?')[0];
  if (cleanUrl === '/' || cleanUrl === '') {
    cleanUrl = '/index.html';
  }

  // Normalize path
  const safePath = path.normalize(path.join(PUBLIC_DIR, cleanUrl));

  // Security check: ensure path is within PUBLIC_DIR
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err) {
      // Try appending .html
      const tryHtmlPath = safePath + '.html';
      fs.stat(tryHtmlPath, (err2, stats2) => {
        if (!err2 && stats2.isFile()) {
          serveFile(tryHtmlPath, '.html', res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head><meta charset="utf-8"><title>404 - غير موجود</title>
            <style>body{font-family:sans-serif;background:#0b1326;color:#fff;text-align:center;padding:50px;}</style>
            </head>
            <body>
              <h1>الصفحة غير موجودة (404)</h1>
              <p><a href="/index.html" style="color:#20c9d8;">العودة للصفحة الرئيسية</a></p>
            </body>
            </html>
          `);
        }
      });
      return;
    }

    if (stats.isDirectory()) {
      const indexPath = path.join(safePath, 'index.html');
      fs.stat(indexPath, (err2, stats2) => {
        if (!err2 && stats2.isFile()) {
          serveFile(indexPath, '.html', res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
        }
      });
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    serveFile(safePath, ext, res);
  });
});

function serveFile(filePath, ext, res) {
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Server Error');
  });
  stream.pipe(res);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Jeddah Maintenance Server] Running at http://localhost:${PORT}`);
  console.log(`[Jeddah Maintenance Server] Ready to serve pages and assets.`);
});
