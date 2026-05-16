import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['main.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  // @prisma/client stub in node_modules requires .prisma/client/default which
  // doesn't exist with custom output. Alias it to the actual generated path so
  // esbuild bundles the generated client directly into index.js.
  alias: {
    '@prisma/client': './generated/prisma/index.js',
  },
  logLevel: 'info'
})
