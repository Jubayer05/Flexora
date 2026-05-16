import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info'
})
