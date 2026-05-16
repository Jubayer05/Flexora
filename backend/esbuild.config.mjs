import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['main.ts'],
  outfile: 'index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info'
})
