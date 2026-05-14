import { ShieldUser, TruckElectric, UserStar } from 'lucide-react'

export const homeData = {
  hero: {
    title: 'Verified social media accounts, ready when you are',
    description:
      'Browse aged and verified accounts for Twitter, Instagram, TikTok, Reddit, Telegram, and more. Built for buyers who need clear stock, secure checkout, and fast delivery.',
    action: [
      { title: 'Get Started', url: '/sign-up' },
      { title: 'View Service', url: '/shop' }
    ],
    users: [
      { name: 'user2', designation: '', avatar: 'https://github.com/leerob.png' },
      { name: 'user1', designation: '', avatar: 'https://github.com/shadcn.png' },
      { name: 'user3', designation: '', avatar: 'https://github.com/evilrabbit.png' },
      { name: 'user4', designation: '', avatar: 'https://github.com/leerob.png' }
    ],
    bgUrl: '/images/bg/hero.jpg'
  },
  agencies: {
    title: 'Trusted by agencies, founders, and repeat buyers',
    logos: [
      '/images/agencies/01.svg',
      '/images/agencies/02.svg',
      '/images/agencies/03.svg',
      '/images/agencies/04.svg',
      '/images/agencies/02.svg',
      '/images/agencies/03.svg',
      '/images/agencies/04.svg',
      '/images/agencies/01.svg'
    ]
  },
  whyChoose: {
    title: 'Why buyers choose UHQ Accounts',
    subtitle: 'Quality you can check before you buy',
    description:
      'We focus on clean inventory, straightforward delivery, and responsive support for marketers, agencies, resellers, and business owners.',
    features: [
      {
        icon: UserStar,
        title: 'Verified Inventory',
        desc: 'Accounts are reviewed before listing so buyers can order with more confidence.'
      },
      {
        icon: TruckElectric,
        title: 'Fast Delivery',
        desc: 'Eligible products are delivered through your dashboard and email after payment.'
      },
      {
        icon: ShieldUser,
        title: 'Support After Purchase',
        desc: 'If something needs attention, our support flow keeps the order details easy to review.'
      }
    ]
  },
  offers: {
    title:
      'Aged and verified digital accounts for marketing, growth, automation, and brand operations.',
    description:
      'Choose the product, select the quantity, and complete checkout with clear delivery details.'
  },
  about: {
    title: 'Practical account supply for real workflows',
    subtitle: 'About UHQ Accounts',
    description:
      'UHQ Accounts helps marketers, creators, and businesses source aged and verified accounts without wasting time on unclear listings. We keep product details, stock, delivery, and support easy to follow so buyers can move faster with fewer surprises.',
    image: '/images/about.png',
    stats: [
      { value: '$23M+', label: 'In Revenue' },
      { value: '$107k+', label: 'Qualified Leads' },
      { value: '10k+', label: 'Trusted Customers' }
    ]
  },
  popularCategories: {
    title: 'Popular Account Categories',
    subtitle: 'Categories',
    description:
      'Explore frequently requested account types for outreach, growth, ads, automation, and brand operations.',
    categories: [
      {
        icon: '/images/categories/gmail.svg',
        name: 'Verified Gmail & Outlook Accounts',
        desc: 'Email accounts for outreach, registration, and daily marketing workflows.',
        url: '#'
      },
      {
        icon: '/images/categories/tiktok.svg',
        name: 'TikTok Creator Accounts',
        desc: 'TikTok-ready accounts for content testing, creator workflows, and campaign setup.',
        url: '#'
      },
      {
        icon: '/images/categories/youtube.svg',
        name: 'YouTube Monetized Channels',
        desc: 'Channels prepared for buyers who need an existing YouTube presence.',
        url: '#'
      },
      {
        icon: '/images/categories/x.svg',
        name: 'Buy Aged Twitter Accounts',
        desc: 'Aged Twitter/X accounts for marketing, community building, and campaign activity.',
        url: '#'
      },
      {
        icon: '/images/categories/instagram.svg',
        name: 'Buy Instagram Profiles',
        desc: 'Instagram profiles suited for niche pages, brand testing, and social growth.',
        url: '#'
      },
      {
        icon: '/images/categories/facebook.svg',
        name: 'Buy Facebook Pages',
        desc: 'Facebook pages and accounts for page growth, social proof, and campaign setup.',
        url: '#'
      }
    ]
  },
  platform: {
    title: 'Accounts across the platforms buyers use most',
    subtitle: 'Available Platforms',
    description:
      'Find aged, verified, and platform-specific accounts for marketing, automation, community building, and brand growth.',
    platforms: [
      { name: 'Google', url: '#', icon: '/images/platforms/google.svg' },
      { name: 'Twitter', url: '#', icon: '/images/platforms/twitter.svg' },
      { name: 'Linkedin', url: '#', icon: '/images/platforms/linkedin.svg' },
      { name: 'Youtube', url: '#', icon: '/images/platforms/youtube.svg' },
      { name: 'Tiktok', url: '#', icon: '/images/platforms/tik_tok.svg' },
      { name: 'Instagram', url: '#', icon: '/images/platforms/instagram.svg' },
      { name: 'Github', url: '#', icon: '/images/platforms/github.svg' },
      { name: 'Facebook', url: '#', icon: '/images/platforms/facebook.svg' },
      { name: 'Telegram', url: '#', icon: '/images/platforms/telegram.svg' },
      { name: 'X', url: '#', icon: '/images/platforms/x.svg' }
    ]
  },
  testimonial: {
    title: 'Feedback from buyers who use UHQ Accounts',
    subtitle: 'Testimonials',
    description:
      'Read how customers use our inventory for campaigns, testing, growth, and daily account operations.',
    testimonials: [
      {
        avatar: '/images/testimonial/user-01.png',
        name: 'Jenny Wilson',
        role: '',
        company: 'DLDesign.co',
        rating: 5,
        content:
          'The order was clear, delivery was quick, and the account details were easy to access from the dashboard.'
      },
      {
        avatar: '/images/testimonial/user-01.png',
        name: 'Jenny Wilson',
        role: '',
        company: 'DLDesign.co',
        rating: 4.5,
        content:
          'I could choose the right product, check the stock, and complete the purchase without back-and-forth.'
      },
      {
        avatar: '/images/testimonial/user-01.png',
        name: 'Jenny Wilson',
        role: '',
        company: 'DLDesign.co',
        rating: 5,
        content:
          'Support had the order details ready when I needed help, which made the process much easier.'
      },
      {
        id: 1,
        name: 'Sarah Johnson',
        role: 'Digital Marketing Manager',
        company: 'TechCorp Inc.',
        content:
          'UHQ Accounts gave our team a simple way to buy the accounts we needed for campaign testing.',
        rating: 5,
        avatar: '/images/testimonials/sarah.jpg'
      }
    ]
  },
  faq: {
    title: 'Questions buyers ask most',
    subtitle: 'FAQS',
    description: 'Here are the most common things our buyers ask before placing their first order.',
    faqs: [
      {
        question: 'How do I receive the account after purchase?',
        answer:
          'Once payment is completed, eligible account details are delivered to your email and dashboard.'
      },
      {
        question: 'Are the accounts verified and safe to use?',
        answer:
          'Products are reviewed before listing. Always save your delivered details securely and follow the platform rules for the account you buy.'
      },
      {
        question: 'What if I face any login issues?',
        answer:
          'Open a support ticket with your order number. Our team will review the delivery details and guide you through the next step.'
      },
      {
        question: 'Are these accounts safe for ads?',
        answer:
          'Some products are suitable for ads and some are better for testing or outreach. Check the product details before ordering.'
      },
      {
        question: 'Can I change the email or password after buying?',
        answer:
          'When credentials are included, update the login details as soon as possible and keep the delivered information secure.'
      }
    ]
  },
  newsletter: {
    title: 'Get useful updates from UHQ Accounts',
    description: 'Product updates, restock alerts, and practical buying tips sent to your inbox.'
  }
}
