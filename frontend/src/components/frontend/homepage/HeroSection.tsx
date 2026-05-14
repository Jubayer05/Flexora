import { Container } from '@/components/common/container'
import CustomLink from '@/components/common/CustomLink'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { buttonVariants } from '@/components/ui/button'
import { homeData } from '@/data/homeData'
import { homeSchema } from '@/data/json-schema'
import { cn } from '@/lib/utils'
import { HeroSection as HeroSectionType } from '@/lib/validations/schemas/homepageSettings'

export default function HeroSection({ data }: { data?: HeroSectionType }) {
  const heroBg = { backgroundImage: "url('/images/bg/hero.webp')" }

  return (
    <Section variant='xxl' className='relative overflow-hidden bg-background min-w-0'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeSchema)
        }}
      />

      {/* Background image with theme-aware overlay */}
      <div className='pointer-events-none absolute inset-0 bg-cover bg-center' style={heroBg} />
      <div className='pointer-events-none absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/60' />

      <Container className='relative'>
        <div className='space-y-4 lg:space-y-8 max-w-2xl text-card-foreground min-w-0 overflow-hidden'>
          <Typography variant='h1' as='h1' weight='semibold' className='lg:leading-tight'>
            {data?.title}
          </Typography>
          <Typography variant='h5' weight='semibold'>
            {data?.desc}
          </Typography>

          {/* <div className='flex -gap-x-2 *:data-[slot=avatar]:grayscale *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background'>
            {
              /* Map through the users array to display avatars 
              homeData?.hero.users.map((user, index) => (
                <Avatar
                  key={index}
                  className='ring-muted! lg:size-14'
                  data-slot='avatar'
                  title={user.name + (user.designation ? ` - ${user.designation}` : '')}
                >
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))
            }
          </div> */}
          <div className='flex flex-wrap gap-3 sm:gap-4'>
            {homeData?.hero.action.map((action, index) => (
              <CustomLink
                key={index}
                href={action.url}
                className={cn(
                  'lg:h-11! font-manrope font-[500]! lg:text-base! transition-colors',
                  buttonVariants({
                    variant: index % 2 === 0 ? 'default' : 'secondary',
                    size: 'lg'
                  })
                )}
              >
                {action.title}
              </CustomLink>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  )
}
