import * as esbuild from 'esbuild'
import fs from 'node:fs'

// Remove any stale bundles (old dist/index.js caused Prisma ESM errors on Vercel)
for (const file of ['dist', 'server.cjs', 'server.cjs.map']) {
  try {
    const stat = fs.statSync(file)
    if (stat.isDirectory()) fs.rmSync(file, { recursive: true, force: true })
    else fs.unlinkSync(file)
  } catch {
    // ignore
  }
}

await esbuild.build({
  entryPoints: ['main.ts'],
  outfile: 'server.cjs',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  packages: 'external',
  external: [
    '@prisma/client',
    '@prisma/client-runtime-utils',
    '@prisma/adapter-pg',
    'pg',
    'pg-native'
  ],
  logLevel: 'info'
})
