import * as esbuild from 'esbuild'

await esbuild.build({
  entryPoints: ['main.ts'],
  outfile: 'dist/index.cjs',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  packages: 'external',
  // Do NOT bundle Prisma — generated client uses dynamic require() for
  // @prisma/client-runtime-utils, which breaks inside an ESM bundle.
  external: [
    '@prisma/client',
    '@prisma/client-runtime-utils',
    '@prisma/adapter-pg',
    'pg',
    'pg-native'
  ],
  logLevel: 'info'
})

// Remove stale ESM bundle — Vercel must not pick up dist/index.js
import fs from 'node:fs'
for (const file of ['dist/index.js', 'dist/index.js.map']) {
  try {
    fs.unlinkSync(file)
  } catch {
    // ignore
  }
}
