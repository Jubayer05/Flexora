import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // ================================
  // 1. CREATE DEFAULT SETTINGS
  // ================================
  console.log('📝 Creating default settings...')

  const defaultSettings = [
    {
      key: 'system_site_settings',
      value: {
        siteName: 'UHQ Accounts',
        siteDescription: 'Premium Account Marketplace',
        siteLogo: '/files/logo.png',
        siteFavicon: '/files/favicon.ico',
        contactEmail: 'support@uhqaccounts.com',
        contactPhone: '+1234567890',
        address: '123 Main St, City, Country',
        currency: 'USD',
        timezone: 'UTC',
        language: 'en',
      },
    },
    {
      key: 'homepage_settings',
      value: {
        heroTitle: 'Welcome to UHQ Accounts',
        heroSubtitle: 'Premium accounts at your fingertips',
        heroImage: '/files/hero.jpg',
        featuredSectionTitle: 'Featured Products',
        featuredSectionEnabled: true,
        testimonialsEnabled: true,
        statsEnabled: true,
      },
    },
    {
      key: 'homepage_faq',
      value: {
        enabled: true,
        title: 'Frequently Asked Questions',
        items: [
          {
            question: 'What is UHQ Accounts?',
            answer: 'UHQ Accounts is a premium marketplace for verified accounts.',
          },
          {
            question: 'How do I purchase an account?',
            answer: 'Simply browse our catalog, add to cart, and checkout.',
          },
          {
            question: 'Are accounts guaranteed?',
            answer: 'Yes, all accounts come with a satisfaction guarantee.',
          },
        ],
      },
    },
    {
      key: 'system_analytics_scripts',
      value: {
        googleAnalyticsId: '',
        googleTagManagerId: '',
        facebookPixelId: '',
        customScripts: [],
      },
    },
    {
      key: 'footer_menus',
      value: {
        columns: [
          {
            title: 'Company',
            links: [
              { label: 'About Us', url: '/about' },
              { label: 'Contact', url: '/contact' },
              { label: 'Privacy Policy', url: '/privacy' },
              { label: 'Terms of Service', url: '/terms' },
            ],
          },
          {
            title: 'Support',
            links: [
              { label: 'Help Center', url: '/help' },
              { label: 'FAQ', url: '/faq' },
              { label: 'Support Ticket', url: '/support' },
            ],
          },
          {
            title: 'Legal',
            links: [
              { label: 'Privacy Policy', url: '/privacy' },
              { label: 'Terms of Service', url: '/terms' },
              { label: 'Refund Policy', url: '/refund' },
            ],
          },
        ],
      },
    },
    {
      key: 'system_social_links',
      value: {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        youtube: '',
        telegram: '',
        discord: '',
      },
    },
    {
      key: 'system_promotional_icons',
      value: {
        items: [
          {
            icon: '/files/promo-icon-1.png',
            title: 'Fast Delivery',
            description: 'Get your accounts instantly',
          },
          {
            icon: '/files/promo-icon-2.png',
            title: '24/7 Support',
            description: 'We are here to help',
          },
          {
            icon: '/files/promo-icon-3.png',
            title: 'Secure Payment',
            description: 'Your payment is safe',
          },
        ],
      },
    },
    {
      key: 'affiliate_settings',
      value: {
        affiliateCommissionPct: 10,
      },
    },
  ]

  const emailConfig = {
    key: 'system_email_configurations',
    value: {
      smtpUsername: 'azeemrauf7474@gmail.com',
      smtpPassword: 'kintaswlegfiretk', // Replace with actual password or environment variable
      mailFromName: 'UHQ Accounts',
      mailFromEmail: 'noreply@uhqaccounts.com',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      secure: false, // true for 465, false for other ports
    }
  }

  const existingEmailConfig = await prisma.settings.findUnique({
    where: { key: emailConfig.key },
  })

  if (!existingEmailConfig) {
    await prisma.settings.create({
      data: emailConfig,
    })
    console.log(`  ✅ Created setting: ${emailConfig.key}`)
  } else {
    console.log(`  ⏭️  Setting already exists: ${emailConfig.key}`)
  }

  for (const setting of defaultSettings) {
    const existing = await prisma.settings.findUnique({
      where: { key: setting.key },
    })

    if (!existing) {
      await prisma.settings.create({
        data: setting,
      })
      console.log(`  ✅ Created setting: ${setting.key}`)
    } else {
      console.log(`  ⏭️  Setting already exists: ${setting.key}`)
    }
  }

  // ================================
  // 2. CREATE DEFAULT CUSTOM PAGE (HOME)
  // ================================
  console.log('\n📄 Creating default custom pages...')

  const homePage = await prisma.customPage.findUnique({
    where: { slug: 'home' },
  })

  if (!homePage) {
    await prisma.customPage.create({
      data: {
        slug: 'home',
        title: 'Home',
        type: 'DYNAMIC',
        location: 'HEADER',
        isActive: true,
        sortOrder: 0,
        content: {
          sections: [
            {
              type: 'hero',
              title: 'Welcome to UHQ Accounts',
              subtitle: 'Premium accounts at your fingertips',
              cta: {
                label: 'Browse Products',
                url: '/products',
              },
            },
            {
              type: 'features',
              title: 'Why Choose Us',
              items: [
                {
                  icon: '/files/feature-1.png',
                  title: 'Verified Accounts',
                  description: 'All accounts are verified and tested',
                },
                {
                  icon: '/files/feature-2.png',
                  title: 'Instant Delivery',
                  description: 'Get your accounts immediately after purchase',
                },
                {
                  icon: '/files/feature-3.png',
                  title: '24/7 Support',
                  description: 'Our team is always ready to help',
                },
              ],
            },
          ],
        },
        seo: {
          title: 'UHQ Accounts - Premium Account Marketplace',
          description: 'Buy verified accounts instantly',
          keywords: ['accounts', 'verified', 'premium'],
        },
      },
    })
    console.log('  ✅ Created custom page: home')
  } else {
    console.log('  ⏭️  Custom page "home" already exists')
  }

  // ================================
  // 3. CREATE DEFAULT HEADER PAGES
  // ================================
  const headerPages = [
    {
      slug: 'about',
      title: 'About Us',
      location: 'HEADER' as const,
      sortOrder: 1,
    },
    {
      slug: 'contact',
      title: 'Contact',
      location: 'HEADER' as const,
      sortOrder: 2,
    },
    {
      slug: 'faq',
      title: 'FAQ',
      location: 'HEADER' as const,
      sortOrder: 3,
    },
  ]

  for (const pageData of headerPages) {
    const existing = await prisma.customPage.findUnique({
      where: { slug: pageData.slug },
    })

    if (!existing) {
      await prisma.customPage.create({
        data: {
          ...pageData,
          type: 'DYNAMIC',
          isActive: true,
          content: {
            title: pageData.title,
            content: `This is the ${pageData.title} page. Update this content in the admin panel.`,
          },
        },
      })
      console.log(`  ✅ Created custom page: ${pageData.slug}`)
    } else {
      console.log(`  ⏭️  Custom page "${pageData.slug}" already exists`)
    }
  }

  console.log('\n✅ Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
