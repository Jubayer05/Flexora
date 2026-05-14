import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../configs/db'
import { uploadToR2 } from '../lib/r2'

const LOCAL_PROOF_PREFIX = '/files/proofs/'
const R2_PROOF_FOLDER = 'proofs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backendRoot = path.resolve(__dirname, '../..')
const localProofDirectory = path.join(backendRoot, 'files', 'proofs')
const isDryRun = process.argv.includes('--dry-run')

function getLegacyProofUrl(transferProofUrl?: string | null, proofData?: string | null): string | null {
  if (transferProofUrl?.startsWith(LOCAL_PROOF_PREFIX)) return transferProofUrl
  if (proofData?.startsWith(LOCAL_PROOF_PREFIX)) return proofData
  return null
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function backfillTelegramProofsToR2() {
  console.log('Starting Telegram proof backfill to R2...')
  console.log(`Mode: ${isDryRun ? 'dry-run' : 'live'}`)
  console.log(`Local proof directory: ${localProofDirectory}`)

  const transfers = await db.telegramTransfer.findMany({
    where: {
      OR: [
        { transferProofUrl: { startsWith: LOCAL_PROOF_PREFIX } },
        { proofData: { startsWith: LOCAL_PROOF_PREFIX } }
      ]
    },
    select: {
      id: true,
      transferProofUrl: true,
      proofData: true
    },
    orderBy: { id: 'asc' }
  })

  if (transfers.length === 0) {
    console.log('No legacy local proof URLs found. Nothing to backfill.')
    return
  }

  console.log(`Found ${transfers.length} transfer record(s) with local proof URLs.`)

  let updatedCount = 0
  let skippedCount = 0
  let failedCount = 0
  const uploadedUrlCache = new Map<string, string>()

  for (const transfer of transfers) {
    const legacyProofUrl = getLegacyProofUrl(transfer.transferProofUrl, transfer.proofData)

    if (!legacyProofUrl) {
      skippedCount++
      console.log(`Skipping transfer ${transfer.id}: no legacy proof URL found.`)
      continue
    }

    const fileName = path.basename(legacyProofUrl)
    const localFilePath = path.join(localProofDirectory, fileName)

    if (!(await fileExists(localFilePath))) {
      skippedCount++
      console.warn(
        `Skipping transfer ${transfer.id}: local proof file not found at ${localFilePath}`
      )
      continue
    }

    try {
      let publicUrl = uploadedUrlCache.get(fileName)

      if (!publicUrl) {
        if (isDryRun) {
          publicUrl = `[dry-run] ${fileName}`
        } else {
          const fileBuffer = await fs.readFile(localFilePath)
          publicUrl = await uploadToR2(fileBuffer, fileName, R2_PROOF_FOLDER)
          uploadedUrlCache.set(fileName, publicUrl)
        }
      }

      if (!isDryRun) {
        await db.telegramTransfer.update({
          where: { id: transfer.id },
          data: {
            transferProofUrl: publicUrl,
            proofData: publicUrl
          }
        })
      }

      updatedCount++
      console.log(
        `${isDryRun ? 'Would backfill' : 'Backfilled'} transfer ${transfer.id}: ${legacyProofUrl} -> ${publicUrl}`
      )
    } catch (error) {
      failedCount++
      console.error(`Failed to backfill transfer ${transfer.id}:`, error)
    }
  }

  console.log('Backfill finished.')
  console.log(`Updated: ${updatedCount}`)
  console.log(`Skipped: ${skippedCount}`)
  console.log(`Failed: ${failedCount}`)
}

backfillTelegramProofsToR2()
  .catch((error) => {
    console.error('Telegram proof backfill failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
