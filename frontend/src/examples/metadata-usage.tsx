/**
 * Example usage of the enhanced metadata builders
 *
 * This file demonstrates how to use the metadata builders with SiteSettings schema
 */

import { buildPageMetadata, buildSiteMetadata, buildStructuredData } from '@/lib/seo/metaBuilders'
import { SiteSettings } from '@/lib/validations/schemas/siteSettings'
import { Metadata } from 'next'

// Example site settings data
const exampleSiteSettings: SiteSettings = {
  name: 'UHQ Accounts',
  email: 'contact@uhq.com',
  phone: '+1-555-0123',
  address: '123 Business Street, City, State 12345',
  website: 'https://accounts.uhq.com',
  shortDescription: 'Secure account management for UHQ services',
  favicon: '/images/favicon.ico',
  logo: {
    default: '/images/logo.png',
    dark: '/images/logo-dark.png'
  },
  theme: {
    color: {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#06b6d4'
    },
    fontFamily: 'Inter, sans-serif',
    darkMode: true
  },
  socialLinks: {
    facebook: 'https://facebook.com/uhq',
    twitter: 'https://twitter.com/uhq',
    instagram: 'https://instagram.com/uhq',
    linkedin: 'https://linkedin.com/company/uhq'
  },
  seo: {
    metaName: 'UHQ Accounts',
    metaTitle: 'UHQ Accounts - Secure Account Management',
    metaDescription:
      'Manage your UHQ services securely with our comprehensive account management platform.',
    siteAuthor: 'UHQ Team',
    ogImage: '/images/og-image.jpg',
    canonicalUrl: 'https://accounts.uhq.com',
    metaKeywords: ['account management', 'security', 'uhq', 'authentication']
  },
  header: {
    navigation: [
      { title: 'Dashboard', url: '/dashboard' },
      { title: 'Profile', url: '/profile' },
      { title: 'Settings', url: '/settings' }
    ]
  },
  footer: {
    copyright: '© 2025 UHQ. All rights reserved.',
    credit: {
      companyName: 'UHQ Technologies',
      url: 'https://uhq.com'
    }
  },
  maintenanceMode: false,
  locale: 'en-US',
  languages: [
    { code: 'en', name: 'English', isDefault: true },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' }
  ],
  analytics: {
    googleAnalyticsId: 'GA-MEASUREMENT-ID',
    facebookPixelId: 'FB-PIXEL-ID'
  }
}

// Example 1: Generate site-wide metadata
export function generateSiteMetadata(): Metadata {
  return buildSiteMetadata(exampleSiteSettings)
}

// Example 2: Generate page-specific metadata
export function generateDashboardMetadata(): Metadata {
  return buildPageMetadata(exampleSiteSettings, {
    title: 'Dashboard',
    description: 'View your account overview and recent activity',
    keywords: ['dashboard', 'overview', 'account'],
    url: '/dashboard',
    type: 'website'
  })
}

// Example 3: Generate article metadata
export function generateBlogPostMetadata(
  title: string,
  description: string,
  image?: string,
  publishedTime?: string,
  authors?: string[]
): Metadata {
  return buildPageMetadata(exampleSiteSettings, {
    title,
    description,
    image,
    url: '/blog/' + title.toLowerCase().replace(/\s+/g, '-'),
    type: 'article',
    publishedTime,
    modifiedTime: new Date().toISOString(),
    authors,
    keywords: ['blog', 'article', 'uhq']
  })
}

// Example 4: Generate structured data
export function generateStructuredData() {
  return buildStructuredData(exampleSiteSettings)
}

// Example 5: Usage in a Next.js App Router layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // In Next.js 13+ App Router, metadata is exported separately
  const structuredData = generateStructuredData()

  return (
    <html lang={exampleSiteSettings.locale}>
      <body>
        {children}
        {/* Structured data can be added via a component */}
        {structuredData && (
          <script
            type='application/ld+json'
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        )}
      </body>
    </html>
  )
}

// Example 6: Usage in a specific page with App Router
export function BlogPostPage({
  title,
  content,
  publishedAt,
  author
}: {
  title: string
  content: string
  publishedAt: string
  author: string
}) {
  // Metadata would be exported from the page file like this:
  // export const metadata = generateBlogPostMetadata(title, content.slice(0, 160), '/images/blog.jpg', publishedAt, [author])

  return (
    <article>
      <h1>{title}</h1>
      <p>
        By {author} on {new Date(publishedAt).toLocaleDateString()}
      </p>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </article>
  )
}

// Example 7: Dynamic metadata generation based on route
export function generateDynamicMetadata(route: string): Metadata {
  switch (route) {
    case '/profile':
      return buildPageMetadata(exampleSiteSettings, {
        title: 'Profile Settings',
        description: 'Manage your personal information and preferences',
        url: '/profile'
      })

    case '/security':
      return buildPageMetadata(exampleSiteSettings, {
        title: 'Security Settings',
        description: 'Configure your account security and privacy settings',
        url: '/security',
        keywords: ['security', 'privacy', 'settings']
      })

    default:
      return buildSiteMetadata(exampleSiteSettings)
  }
}

// Example 8: Next.js App Router metadata export pattern
export const metadata: Metadata = generateSiteMetadata()

// Example 9: Dynamic metadata in App Router
export async function generateMetadata({
  params
}: {
  params: { slug: string }
}): Promise<Metadata> {
  // This would typically fetch data based on params
  return buildPageMetadata(exampleSiteSettings, {
    title: `Page ${params.slug}`,
    description: `Dynamic page for ${params.slug}`,
    url: `/${params.slug}`
  })
}
