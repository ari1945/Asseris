// Minimal dependency-free static file server for W0 verification.
// Serves the project root; "/" maps to the production build artifact.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = 5188;
const DEFAULT = 'NeoSuite AMS (prod).html';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
};

createServer(async (req, res) => {
  try {
    let rel = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    if (rel === '/' || rel === '') rel = '/' + DEFAULT;
    const path = normalize(join(ROOT, rel));
    if (!path.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
    const s = await stat(path);
    const file = s.isDirectory() ? join(path, DEFAULT) : path;
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`static server on http://localhost:${PORT} (root: ${ROOT})`));
