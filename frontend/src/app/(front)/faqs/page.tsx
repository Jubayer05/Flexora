'use client'

import PageBreadcrumb from '@/components/common/Breadcrumb'
import { Container } from '@/components/common/container'
import { Section } from '@/components/common/section'
import { Typography } from '@/components/common/typography'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { FaqSettings } from '@/lib/validations/schemas/faqSettings'

export const dynamic = 'force-dynamic'

export default function BlogPage() {
  const settingsKey = 'system_faq_page_settings'
  const { data, loading } = useAsync<SettingsData<FaqSettings>>(
    () => `/settings/key/${settingsKey}`,
    true
  )

  const faqData: FaqSettings | undefined = data?.data?.value

  if (loading) {
    return (
      <Section variant={'xl'}>
        <Container>
          <div className='space-y-20'>
            {[...Array(2)].map((_, gi) => (
              <div key={gi}>
                <Skeleton className='mb-4 w-48 h-7' />
                <div className='space-y-4'>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className='rounded-xl w-full h-16' />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    )
  }

  return (
    <Section variant={'xl'}>
      <Container>
        <div className='flex flex-col gap-16'>
          <PageBreadcrumb
            title={'Faqs'}
            description='Find quick answers to the most common questions about using our site, placing orders, and managing your account.'
          />

          {/* Container Section */}
          <div className='space-y-20'>
            {faqData?.groups?.length ? (
              faqData.groups.map((group, index) => (
                <div className='' key={index}>
                  <Typography variant='h4' as='h3' weight='semibold' className='mb-4'>
                    {group?.name}
                  </Typography>
                  <Accordion type='single' collapsible>
                    {group?.faqs?.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`item-${index}`}
                        className='bg-foreground mb-4 border-muted-foreground rounded-xl w-full border!'
                      >
                        <AccordionTrigger className='flex justify-between items-center p-4 lg:p-6 rounded-none font-medium text-lg lg:text-2xl text-left transition-colors cursor-pointer'>
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className='p-4 lg:p-6 border-t border-t-muted-foreground text-muted text-lg lg:text-2xl'>
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))
            ) : (
              <div className='text-muted text-center'>No FAQs found.</div>
            )}
          </div>
        </div>
      </Container>
    </Section>
  )
}
