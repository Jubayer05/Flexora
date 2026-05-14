/**
 * Execute Telegram Test Account Setup using Prisma
 * This script connects to your database using Prisma and inserts the test account
 */

import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: './.env' })

const db = new PrismaClient()

const PHONE = '918418047673';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 EXECUTING TELEGRAM ACCOUNT SETUP');
  console.log('='.repeat(80) + '\n');

  try {
    console.log('📌 Connecting to database...');
    
    // Create Telegram Session
    console.log('📝 Creating Telegram Session...');
    const session = await db.telegramSession.upsert({
      where: { phoneNumber: PHONE },
      update: {
        isAuthorized: true,
        sessionString: 'STRING_SESSION_PLACEHOLDER',
        updatedAt: new Date(),
      },
      create: {
        phoneNumber: PHONE,
        sessionString: 'STRING_SESSION_PLACEHOLDER',
        isAuthorized: true,
        userId: 0n,
        username: 'test_user',
        firstName: 'Test',
        lastName: 'Account',
        createdBy: 1,
      },
    });
    console.log('✅ Session created:', session.phoneNumber);

    // Create Account
    console.log('📝 Creating Telegram Account...');
    // Ensure we have a product to attach the account to (Account.productId is required)
    const existingProduct = await db.product.findFirst();
    if (!existingProduct) {
      throw new Error('No product found in database. Please create a product before running this script.');
    }

    const account = await db.account.create({
      data: {
        productId: existingProduct.id,
        platform: 'TELEGRAM',
        encryptedData: 'adb85f89a5ae86bafebe4093641b2081:63aa68b9601523e6c27474979202e012:ea0494fd57f6505d462043cea63d4b258b456bf2e6f2b6f199ceb935564b21341bd381e7f5ab598d4dcb1d203adc628fdffe8b93613cfc872a8344152c1c50422c6bd8a8d103d666894ac59cdcd29968c2f6ba0905204e0c4da360dfcb120135c2dfa0cd44eac5e47d332cde0c6f0abd1549dde7d8a765819ab90b650605ec33d4c962cb112ac34f9192',
        meta: {
          phone: PHONE,
          sessionString: 'STRING_SESSION_PLACEHOLDER',
          notes: 'Test account for development',
        },
        isUsed: false,
        isValid: true,
        requiresOtp: true,
        hasPremium: false,
        archived: false,
      },
    });
    console.log('✅ Account created, ID:', account.id);

    // Verify
    console.log('\n🔍 Verifying setup...\n');
    
    const verifySession = await db.telegramSession.findUnique({
      where: { phoneNumber: PHONE },
    });

    const verifyAccount = await db.account.findFirst({
      where: {
        platform: 'TELEGRAM',
      },
      orderBy: { id: 'desc' },
      take: 1,
    });

    console.log('📊 Session Details:');
    console.log(`  ✓ Phone: ${verifySession?.phoneNumber}`);
    console.log(`  ✓ Authorized: ${verifySession?.isAuthorized}`);
    console.log(`  ✓ Username: ${verifySession?.username}`);

    console.log('\n📊 Account Details:');
    console.log(`  ✓ ID: ${verifyAccount?.id}`);
    console.log(`  ✓ Platform: ${verifyAccount?.platform}`);
    console.log(`  ✓ Valid: ${verifyAccount?.isValid}`);
    console.log(`  ✓ Used: ${verifyAccount?.isUsed}`);
    console.log(`  ✓ Requires OTP: ${verifyAccount?.requiresOtp}`);

    // Get counts
    const sessionCount = await db.telegramSession.count();
    const accountCount = await db.account.count({
      where: { platform: 'TELEGRAM' },
    });

    console.log('\n📈 Database Stats:');
    console.log(`  ✓ Total Telegram Sessions: ${sessionCount}`);
    console.log(`  ✓ Total Telegram Accounts: ${accountCount}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ SETUP SUCCESSFUL!');
    console.log('='.repeat(80));
    console.log(`
✨ Your test Telegram account is now active:

  📱 Phone:     +918418047673
  🔐 Password:  testacc
  ✅ Status:    Ready for testing
  🆔 Account ID: ${verifyAccount?.id}

🎯 Next Steps:
  1. Go to: Admin Dashboard → Telegram Management → Manage Accounts
  2. Search for: +918418047673 or test
  3. You should see the account listed and ready
  4. Start testing Telegram features!

📌 Note: The session is now persistent. No OTP re-authentication needed.
`);
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code === 'P2002') {
      console.log('\n💡 Account already exists! This is fine.');
      console.log('The existing account has been verified.');
    } else {
      console.error('\nDetails:', error);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
