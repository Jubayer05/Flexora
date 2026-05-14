export const homeSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://accounts.curlware.net/#website',
      url: 'https://accounts.curlware.net/',
      name: 'UHQ Accounts',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://accounts.curlware.net/shop/{search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      },
      inLanguage: 'en-US'
    },
    {
      '@type': ['LocalBusiness', 'Organization'],
      '@id': 'https://accounts.curlware.net/#organization',
      name: 'UHQ Accounts',
      url: 'https://accounts.curlware.net/',
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '09:00',
          closes: '20:00'
        }
      ],
      foundingDate: '2016',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'London',
        addressCountry: { '@type': 'Country', name: 'United Kingdom' }
      },
      logo: 'https://api.accounts.curlware.net/files/ca9halzc3ve.svg',
      image: { '@id': 'https://accounts.curlware.net/#logo' },
      description:
        'UHQ Accounts is the leading and top-rated social media accounts provider, offering high-quality, reliable, and secure accounts for various platforms to meet your personal and business needs.',
      sameAs: [
        'https://www.facebook.com/uhqaccounts',
        'https://www.instagram.com/accounts.curlware.net/?hl=en',
        'https://www.youtube.com/@UHQAccounts',
        'https://www.linkedin.com/company/uhq-accounts/'
      ],
      contactPoint: [
        {
          '@type': 'ContactPoint',
          email: 'support@uhqaccounts.com',
          contactType: 'customer service'
        }
      ]
    },
    {
      '@type': 'ImageObject',
      '@id': 'https://accounts.curlware.net/#logo',
      url: 'https://api.accounts.curlware.net/files/ca9halzc3ve.svg',
      width: 256,
      height: 256
    }
  ]
}

export const shopSchema = (products: Product[]) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'UHQ Accounts Shop',
  url: 'https://accounts.curlware.net/shop',
  description: 'Browse our collection of high-quality social media accounts for various platforms.',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://accounts.curlware.net'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Shop',
        item: 'https://accounts.curlware.net/shop'
      }
    ]
  },
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: products?.length
      ? products.map((product) => ({
          '@type': 'Product',
          name: product.name,
          url: `https://accounts.curlware.net/product/${product.id}`,
          image: product.thumbnail,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: product.price - (product.discount || 0),
            availability: 'https://schema.org/InStock'
          }
        }))
      : []
  }
})
