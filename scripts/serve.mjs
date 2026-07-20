import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '_site');
const port = Number(process.env.PORT || 8080);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function safePath(requestUrl) {
  const url = new URL(requestUrl, `http://localhost:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const full = path.resolve(root, `.${pathname}`);
  if (!full.startsWith(root)) return null;
  return full;
}

const server = http.createServer(async (request, response) => {
  let filename = safePath(request.url || '/');
  if (!filename) {
    response.writeHead(400).end('Bad request');
    return;
  }
  try {
    let stat = await fs.stat(filename);
    if (stat.isDirectory()) filename = path.join(filename, 'index.html');
    const data = await fs.readFile(filename);
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(data);
  } catch {
    try {
      const data = await fs.readFile(path.join(root, '404.html'));
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(data);
    } catch {
      response.writeHead(404).end('Not found');
    }
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`CLEAR preview running at http://127.0.0.1:${port}/`);
});
