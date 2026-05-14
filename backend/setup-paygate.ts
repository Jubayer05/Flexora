import { PrismaClient } from './generated/prisma/index.js'

const db = new PrismaClient()

async function main() {
  const walletAddress = '0x14aed3c9e63a84c733d684e36ae1f594428bf9e4'

  // Check if PayGate method exists
  let paymentMethod = await db.paymentMethod.findFirst({
    where: { gateway: 'paygate' }
  })

  if (paymentMethod) {
    // Update existing
    const updated = await db.paymentMethod.update({
      where: { id: paymentMethod.id },
      data: { 
        apiKey: walletAddress,
        isActive: true
      }
    })
    console.log(`✅ Updated PayGate payment method (ID: ${updated.id})`)
    console.log(`   Wallet: ${walletAddress}`)
  } else {
    // Create new
    const created = await db.paymentMethod.create({
      data: {
        name: 'PayGate',
        gateway: 'paygate',
        apiKey: walletAddress,
        isActive: true,
        testMode: false,
        currencies: ['USD', 'EUR'],
        networks: ['polygon']
      }
    })
    console.log(`✅ Created PayGate payment method (ID: ${created.id})`)
    console.log(`   Wallet: ${walletAddress}`)
  }

  await db.$disconnect()
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
