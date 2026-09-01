const esbuild = require('esbuild');

async function run() {
  try {
    await esbuild.build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      packages: 'external',
      sourcemap: true,
      outfile: 'dist/server.cjs'
    });
    console.log('[BUILD SUCCESS] dist/server.cjs bundled successfully.');
  } catch (err) {
    console.error('[BUILD ERROR]', err);
    process.exit(1);
  }
}

run();
