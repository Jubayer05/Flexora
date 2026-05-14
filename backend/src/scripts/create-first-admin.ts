import db from '../configs/db'
import { UserService } from '../services/user.services'

async function createFirstAdmin() {
  const userService = new UserService()

  const email = 'superadmin@uhq.com'
  const password = '@uhq2026Admin#@!' // Change this!

  // Check if admin already exists
  const existing = await db.user.findUnique({
    where: { email }
  })

  if (existing) {
    console.log('Admin already exists! Updating password...')

    // Hash new password
    const passwordHash = await userService.hashPassword(password)

    // Update admin password
    const updated = await db.user.update({
      where: { email },
      data: {
        passwordHash,
        isActive: true,
        isVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date()
      }
    })

    console.log('✅ Admin password updated successfully!')
    console.log('Email:', updated.email)
    console.log('Role:', updated.role)
    console.log('ID:', updated.id)

    await db.$disconnect()
    return
  }

  // Hash password
  const passwordHash = await userService.hashPassword(password)

  // Create admin user
  const admin = await db.user.create({
    data: {
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
      firstName: 'Super Admin',
      meta: {
        isSuperAdmin: true,
        createdAt: new Date().toISOString()
      }
    }
  })

  console.log('✅ First admin created successfully!')
  console.log('Email:', admin.email)
  console.log('Role:', admin.role)
  console.log('ID:', admin.id)

  await db.$disconnect()
}

createFirstAdmin().catch(console.error)
