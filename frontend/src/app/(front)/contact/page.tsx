'use client'

import PageBreadcrumb from '@/components/common/Breadcrumb'
import { Container } from '@/components/common/container'
import CustomInput from '@/components/common/CustomInput'
import { Section } from '@/components/common/section'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import useAsync from '@/hooks/useAsync'
import { SiteSettings } from '@/lib/validations/schemas/contactPageSettings'
import { zodResolver } from '@hookform/resolvers/zod'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

const contactSchema = z.object({
  name: z.string().min(2, 'Add your name so we know who to reply to.'),
  email: z.string().email('Enter a working email address.'),
  subject: z.string().min(2, 'Add a short subject for your message.'),
  message: z.string().min(10, 'Tell us a little more so we can help properly.')
})

type ContactForm = z.infer<typeof contactSchema>

export default function ContactPage() {
  const settingsKey = 'system_contact_page_settings'
  const { data, loading } = useAsync<SettingsData<SiteSettings>>(
    () => `/settings/key/${settingsKey}`,
    true
  )

  const settings: SiteSettings | undefined = data?.data?.value

  const {
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', subject: '', message: '' }
  })

  const onSubmit = handleSubmit((vals) => {
    const to = settings?.supportTicket?.supportEmail || settings?.email || ''
    const subject = encodeURIComponent(vals.subject)
    const body = encodeURIComponent(`From: ${vals.name} <${vals.email}>\n\n${vals.message}`)
    if (to) {
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
    }
  })

  if (loading) {
    return (
      <Section variant={'xl'}>
        <Container>
          <div className='flex flex-col gap-12'>
            <PageBreadcrumb
              title={'Contact Us'}
              description='Need help with an order, delivery, payment, or account issue? Send us the details and our team will guide you from there.'
            />
            <div className='gap-6 grid grid-cols-1 md:grid-cols-2'>
              <Skeleton className='rounded-xl w-full h-64' />
              <Skeleton className='rounded-xl w-full h-64' />
            </div>
          </div>
        </Container>
      </Section>
    )
  }

  return (
    <Section variant={'xl'}>
      <Container>
        <div className='flex flex-col gap-12'>
          <PageBreadcrumb
            title={'Contact Us'}
            description='Need help with an order, delivery, payment, or account issue? Send us the details and our team will guide you from there.'
          />

          {/* Container Section */}
          <div className='gap-6 grid grid-cols-1 md:grid-cols-2'>
            {/* Contact Info */}
            <Card className='h-full'>
              <CardHeader>
                <CardTitle>Talk to support</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-5'>
                  {settings?.supportMessage && (
                    <p className='text-muted-foreground'>{settings.supportMessage}</p>
                  )}
                  <div className='space-y-4'>
                    {settings?.email && (
                      <div className='flex items-start gap-3'>
                        <Mail className='mt-0.5 size-5 text-primary' />
                        <div>
                          <div className='font-medium'>Email</div>
                          <a
                            className='text-primary hover:underline'
                            href={`mailto:${settings.email}`}
                          >
                            {settings.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {settings?.phone && (
                      <div className='flex items-start gap-3'>
                        <Phone className='mt-0.5 size-5 text-primary' />
                        <div>
                          <div className='font-medium'>Phone</div>
                          <a
                            className='text-primary hover:underline'
                            href={`tel:${settings.phone}`}
                          >
                            {settings.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {settings?.address && (
                      <div className='flex items-start gap-3'>
                        <MapPin className='mt-0.5 size-5 text-primary' />
                        <div>
                          <div className='font-medium'>Address</div>
                          <p className='text-muted-foreground'>{settings.address}</p>
                        </div>
                      </div>
                    )}

                    {settings?.businessHours && (
                      <div className='flex items-start gap-3'>
                        <Clock className='mt-0.5 size-5 text-primary' />
                        <div>
                          <div className='font-medium'>Business Hours</div>
                          <p className='text-muted-foreground'>{settings.businessHours}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {settings?.supportTicket?.enabled ? (
                    <Button asChild className='mt-2 w-full'>
                      <Link href='/user/tickets/create'>
                        {settings?.supportTicket?.buttonText || 'Open a Support Ticket'}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Contact Form */}
            <Card className='hidden'>
              <CardHeader>
                <CardTitle>Send us the details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className='gap-4 grid grid-cols-1'>
                  <Controller
                    control={control}
                    name='name'
                    render={({ field }) => (
                      <CustomInput
                        label='Your Name'
                        placeholder='Your full name'
                        error={errors.name?.message}
                        {...field}
                        value={field.value ?? ''}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name='email'
                    render={({ field }) => (
                      <CustomInput
                        label='Email Address'
                        type='email'
                        placeholder='you@example.com'
                        error={errors.email?.message}
                        {...field}
                        value={field.value ?? ''}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name='subject'
                    render={({ field }) => (
                      <CustomInput
                        label='Subject'
                        placeholder='Order help, payment question, or product request'
                        error={errors.subject?.message}
                        {...field}
                        value={field.value ?? ''}
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name='message'
                    render={({ field }) => (
                      <CustomInput
                        label='Message'
                        type='textarea'
                        rows={5}
                        placeholder='Share your order number, product name, or anything else we should check.'
                        error={errors.message?.message}
                        {...field}
                        value={field.value ?? ''}
                      />
                    )}
                  />
                  <Button type='submit' disabled={isSubmitting} className='mt-2'>
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </Section>
  )
}
