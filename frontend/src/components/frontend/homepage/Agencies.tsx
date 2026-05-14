'use client'

import { Container } from '@/components/common/container'
import CustomImage from '@/components/common/CustomImage'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import { AgencySection } from '@/lib/validations/schemas/homepageSettings'

export default function Agencies({ data }: { data?: AgencySection }) {
  if (!data?.agencies?.length) return null

  const agencies = [...data.agencies, ...data.agencies, ...data.agencies]

  return (
    <Section variant='xl' className='pt-12! text-card-foreground'>
      <Container>
        <div className='space-y-10'>
          <Typography variant='h2' as='h2' weight='semibold' className='text-center'>
            {data?.title}
          </Typography>
          <div className='overflow-hidden'>
            <div className='flex gap-3 animate-marquee'>
              {agencies.map((logo, index) => (
                <div
                  key={index}
                  className='flex justify-center items-center hover:bg-primary/5 p-4 sm:p-6 border border-border hover:border-primary rounded-md transition-all duration-300 bg-card min-w-[120px] sm:min-w-[160px] md:min-w-[200px] shrink-0 aspect-square'
                >
                  <div className='relative flex justify-center items-center w-full h-full overflow-hidden'>
                    <CustomImage
                      src={logo}
                      alt={`Partner agency logo ${(index % data.agencies.length) + 1}`}
                      fill
                      className='object-contain'
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}
