import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { pathToFileURL } from 'url';

/**
 * Load .env file into process.env (simple dotenv replacement).
 */
function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

/**
 * Vite plugin that serves Vercel-style Edge Runtime API handlers
 * from the `api/` directory during local development.
 */
export default function vercelApiPlugin() {
  const apiDir = resolve(process.cwd(), 'api');
  loadEnvFile();

  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const pathname = req.url.split('?')[0];
        // e.g. /api/firms → api/firms.js
        const handlerName = pathname.replace('/api/', '');

        // Skip internal modules
        if (handlerName.startsWith('_')) return next();

        const handlerPath = join(apiDir, `${handlerName}.js`);

        let handlerModule;
        try {
          // Use dynamic import with cache busting for HMR
          const fileUrl = pathToFileURL(handlerPath).href;
          handlerModule = await import(`${fileUrl}?t=${Date.now()}`);
        } catch (err) {
          console.warn(`[api-plugin] Cannot load handler: ${handlerPath}`, err.message);
          return next();
        }

        const handler = handlerModule.default;
        if (typeof handler !== 'function') return next();

        try {
          // Build a Web Request from the Node.js IncomingMessage
          const protocol = 'http';
          const host = req.headers.host || 'localhost:5173';
          const fullUrl = `${protocol}://${host}${req.url}`;

          let body = undefined;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            body = Buffer.concat(chunks);
          }

          const webRequest = new Request(fullUrl, {
            method: req.method,
            headers: Object.entries(req.headers).reduce((h, [k, v]) => {
              if (v) h[k] = Array.isArray(v) ? v.join(', ') : v;
              return h;
            }, {}),
            body: body?.length ? body : undefined,
          });

          const webResponse = await handler(webRequest);

          // Write Web Response back to Node.js response
          res.statusCode = webResponse.status;
          for (const [key, value] of webResponse.headers.entries()) {
            res.setHeader(key, value);
          }

          const responseBody = await webResponse.text();
          res.end(responseBody);
        } catch (err) {
          console.error(`[api-plugin] Handler error for ${pathname}:`, err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}
