import { fetchOnServer, getFooterNav, getSiteConfig } from '@/action/data'
import { Container } from '@/components/common/container'
import CustomImage from '@/components/common/CustomImage'
import CustomLink from '@/components/common/CustomLink'
import GotoTop from '@/components/common/GotoTop'
import SiteLogo from '@/components/common/SiteLogo'
import { Typography } from '@/components/common/typography'
import { siteConfig } from '@/data/siteConfig'
import { SocialLinksType, SocialLinkType } from '@/lib/validations/schemas/socialLinks'

const socialImages = {
  facebook: '/images/social-icon/facebook.svg',
  twitter: '/images/social-icon/x.svg',
  instagram: '/images/social-icon/instagram.svg',
  linkedin: '/images/social-icon/linkedin.svg',
  youtube: '/images/social-icon/youtube.svg',
  google: '/images/social-icon/google.svg',
  pinterest: '/images/social-icon/pinterest.svg',
  apple: '/images/social-icon/apple.svg',
  snapchat: '/images/social-icon/snapchat.svg'
}

export default async function Footer() {
  // Handle data fetching with graceful fallbacks for build time
  let siteSettings: any = null
  let footerNav: any = null
  let socialLinks: SocialLinksType | undefined = undefined

  try {
    siteSettings = await getSiteConfig()
  } catch (error) {
    console.warn('Failed to load site config in footer:', error)
  }

  try {
    footerNav = await getFooterNav()
  } catch (error) {
    console.warn('Failed to load footer nav:', error)
  }

  try {
    const data = await fetchOnServer('/settings/key/system_social_links', 3600)
    socialLinks = data?.data?.value
  } catch (error) {
    console.warn('Failed to load social links:', error)
  }

  return (
    <footer className='relative overflow-hidden bg-card text-card-foreground'>
      <div className='pointer-events-none absolute inset-0 -z-10'>
        <div className='absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-primary/7 blur-[110px]' />
        <div className='absolute -bottom-32 right-1/4 h-[380px] w-[380px] rounded-full bg-violet-500/6 blur-[110px]' />
        <div
          className='absolute inset-0 opacity-[0.02]'
          style={{
            backgroundImage:
              'radial-gradient(rgba(99,102,241,0.75) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Top accent line */}
      <div className='h-px bg-linear-to-r from-transparent via-primary/30 to-transparent' />
      <Container>
        <div className='flex flex-col items-center gap-y-14 py-12 text-muted-foreground'>
          <div className='flex flex-col justify-center items-center space-y-3'>
            <SiteLogo />
            <Typography className='text-center text-muted-foreground'>
              {siteSettings?.shortDescription || ''}
            </Typography>
          </div>
          <div className='justify-between items-start gap-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:pb-10 w-full'>
            {footerNav?.footerMenus?.map((nav: any, index: number) => (
              <div key={index} className='space-y-4'>
                <Typography variant='h5' className='text-card-foreground' weight='semibold'>
                  {nav.groupName}
                </Typography>
                <div className='flex flex-col items-start space-y-2.5'>
                  {nav.children?.map((child: any, idx: number) => (
                    <CustomLink
                      key={idx}
                      href={child.url || `/pages/${child?.slug}`}
                      className='font-manrope text-muted-foreground max-sm:text-sm hover:text-primary transition-colors'
                    >
                      {child.title}
                    </CustomLink>
                  ))}
                </div>
              </div>
            ))}

            <div className='flex flex-wrap lg:justify-center gap-x-3 gap-y-3 lg:gap-y-5 max-lg:col-span-full'>
              {siteConfig?.payments?.map((item, index) => (
                <div
                  key={index}
                  className='mx-auto rounded-xl border border-border/60 bg-background/40 px-3 py-2 backdrop-blur-md transition-all hover:border-primary/30 hover:bg-accent/60'
                >
                  <CustomImage
                    src={item}
                    width={85}
                    height={55}
                    alt={`payment-logo-${index}`}
                    className='w-auto min-w-14 sm:min-w-20 object-contain opacity-80 hover:opacity-100 transition-opacity'
                  />
                </div>
              ))}
            </div>
          </div>
          <div
            className='flex flex-wrap justify-center lg:justify-center gap-5 sm:gap-6 w-full'
            style={{ minHeight: 40 }}
          >
            {socialLinks && Object.entries(socialLinks).length > 0 ? (
              Object.entries(socialLinks).map(([platform, item]) => {
                const socialItem = item as SocialLinkType
                if (!socialItem.isActive || !socialItem.url) return null
                return (
                  <CustomLink
                    key={platform}
                    href={socialItem.url}
                    target='_blank'
                    rel='noreferrer'
                    className='group relative flex items-center justify-center rounded-full border border-border/60 bg-background/40 backdrop-blur-md transition-all hover:border-primary/30 hover:bg-accent/70'
                    style={{
                      width: 40,
                      height: 40
                    }}
                  >
                    <span className='pointer-events-none absolute inset-0 rounded-full bg-primary/0 blur-md transition-all duration-300 group-hover:bg-primary/10' />
                    <CustomImage
                      src={socialImages[platform as keyof typeof socialImages]}
                      width={34}
                      height={34}
                      alt={socialItem.displayText || platform}
                      className='relative size-5 object-contain invert dark:invert-0 opacity-85 group-hover:opacity-100 transition-opacity'
                    />
                  </CustomLink>
                )
              })
            ) : (
              <div style={{ width: 180, height: 40 }} className='flex gap-8'>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className='bg-muted animate-pulse rounded-full'
                    style={{ width: 34, height: 34 }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
      <div className='bg-linear-to-r from-primary to-violet-600 py-6'>
        <Container>
          <div className='flex justify-between items-center font-manrope text-primary-foreground'>
            <Typography variant='body2'>{siteSettings?.footer?.copyright || ''}</Typography>
            <GotoTop />
          </div>
        </Container>
      </div>
    </footer>
  )
}
