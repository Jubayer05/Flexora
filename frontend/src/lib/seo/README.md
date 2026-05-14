# SEO Metadata Builders

This module provides comprehensive metadata builders that integrate with the SiteSettings schema to generate SEO-optimized metadata for Next.js applications.

## Features

- ✅ **SiteSettings Schema Integration** - Fully aligned with the Zod schema
- ✅ **Next.js 13+ App Router Compatible** - Works with the latest Next.js metadata API
- ✅ **TypeScript Support** - Fully typed with proper error handling
- ✅ **OpenGraph & Twitter Cards** - Complete social media optimization
- ✅ **Structured Data (JSON-LD)** - SEO-friendly structured data generation
- ✅ **Maintenance Mode Support** - Automatic robots.txt handling
- ✅ **Multi-language Support** - Locale-aware metadata generation
- ✅ **Fallback Support** - Graceful degradation when data is missing

## Usage

### Basic Site Metadata

```typescript
import { buildSiteMetadata } from '@/lib/seo/metaBuilders'
import { SiteSettings } from '@/lib/validations/schemas/siteSettings'

export const metadata = buildSiteMetadata(siteSettings)
```

### Page-Specific Metadata

```typescript
import { buildPageMetadata } from '@/lib/seo/metaBuilders'

export const metadata = buildPageMetadata(siteSettings, {
  title: 'Dashboard',
  description: 'Your account dashboard',
  url: '/dashboard',
  keywords: ['dashboard', 'account']
})
```

### Dynamic Metadata (App Router)

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  return buildPageMetadata(siteSettings, {
    title: `Page ${params.slug}`,
    description: `Dynamic content for ${params.slug}`,
    url: `/${params.slug}`
  })
}
```

### Structured Data

```typescript
import { buildStructuredData } from '@/lib/seo/metaBuilders'

const structuredData = buildStructuredData(siteSettings)

// Add to your layout
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
/>
```

## API Reference

### `buildSiteMetadata(data: SiteSettings | null): Metadata`

Generates comprehensive site-wide metadata including:

- Title templates
- Meta descriptions
- OpenGraph tags
- Twitter Card tags
- Favicons and icons
- Canonical URLs
- Robots directives
- Verification tags

### `buildPageMetadata(siteData: SiteSettings | null, pageData: PageData): Metadata`

Extends site metadata with page-specific data:

- Custom titles and descriptions
- Page-specific images
- Article metadata (published/modified times)
- Custom keywords
- Author information

### `buildStructuredData(data: SiteSettings | null)`

Generates JSON-LD structured data for:

- Organization information
- Contact details
- Social media links
- Logo and branding

## SiteSettings Schema Integration

The builders utilize all relevant fields from the SiteSettings schema:

- `name` - Site name and branding
- `seo.*` - All SEO-specific settings
- `logo.*` - Default and dark mode logos
- `favicon` - Site favicon
- `theme.color.primary` - Primary theme color
- `socialLinks.*` - Social media profiles
- `locale` - Site language/locale
- `maintenanceMode` - Affects robots directives
- `analytics.*` - Analytics integration

## Best Practices

1. **Always provide fallbacks** - The builders handle missing data gracefully
2. **Use appropriate image sizes** - OpenGraph images should be 1200x630px
3. **Keep descriptions under 160 characters** - For optimal SEO
4. **Use structured data** - Helps search engines understand your content
5. **Test with social media debuggers** - Validate OpenGraph tags

## Examples

See `src/examples/metadata-usage.tsx` for comprehensive usage examples including:

- Site-wide metadata
- Page-specific metadata
- Blog post metadata
- Dynamic route metadata
- App Router integration patterns
