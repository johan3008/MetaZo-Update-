/**
 * Vercel Serverless Function entry point.
 *
 * IMPORTANT: `dist/server.cjs` is created by `npm run build`.
 * Vercel runs `buildCommand` (= "npm run build") automatically
 * before deploying, so this file will always find the bundle.
 *
 * For local dev: run `npm run dev` (uses tsx directly).
 * For Vercel dev: run `npm run build` once first, then `vercel dev`.
 */

let app;

try {
  const mod = await import('../dist/server.cjs');
  app = mod.app;
} catch (err) {
  // dist/server.cjs doesn't exist yet — project wasn't built.
  // Provide a clear error instead of a cryptic module-not-found crash.
  console.error(
    '[api/index.js] Could not import dist/server.cjs.',
    'Run "npm run build" first, then retry.\n',
    err
  );

  // Return a minimal Express-compatible handler so Vercel doesn't crash silently.
  const { default: express } = await import('express');
  const fallback = express();
  fallback.use((_req, res) => {
    res.status(503).json({
      error: 'Server not built. Run "npm run build" first, or use "npm run dev" for local development.',
    });
  });
  app = fallback;
}

export default app;
