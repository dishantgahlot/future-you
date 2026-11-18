import esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['backend/src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  outfile: 'api/index.js',
}).then(() => {
  console.log('✓ api/index.js bundled successfully for Vercel production');
}).catch((err) => {
  console.error('Build API error:', err);
  process.exit(1);
});
