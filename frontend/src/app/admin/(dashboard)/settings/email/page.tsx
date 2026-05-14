'use client'

import PageHeader from '@/components/common/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, FileText, Send } from 'lucide-react'
import Link from 'next/link'
import { DeliveryTemplateForm } from './DeliveryTemplateForm'
import { AuthTemplatesSection } from './AuthTemplatesSection'

export default function SettingsEmailPage() {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='Email & Delivery'
        subTitle='Customize delivery format, post-purchase messages, and sign-up emails'
      />

      <Tabs defaultValue='delivery' className='w-full'>
        <TabsList className='grid w-full max-w-2xl grid-cols-3'>
          <TabsTrigger value='delivery' className='gap-2'>
            <FileText className='h-4 w-4' />
            Delivery & Post-purchase
          </TabsTrigger>
          <TabsTrigger value='auth' className='gap-2'>
            <Send className='h-4 w-4' />
            Sign-up & Verification
          </TabsTrigger>
          <TabsTrigger value='templates' className='gap-2'>
            <Mail className='h-4 w-4' />
            Email Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value='delivery' className='mt-6'>
          <Card>
            <CardHeader>
              <CardTitle>Delivery content & format</CardTitle>
              <CardDescription>
                Thank you message, coupon promotion, support info, feedback request, and credentials
                header/footer used in order delivery (e.g. &quot;____ Item Order #... ____&quot; and
                &quot;____ end of goods ____&quot;).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeliveryTemplateForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='auth' className='mt-6'>
          <Card>
            <CardHeader>
              <CardTitle>Sign-up & verification emails</CardTitle>
              <CardDescription>
                Edit verification code message and welcome email for guest order access and new
                user sign-up.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AuthTemplatesSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='templates' className='mt-6'>
          <Card>
            <CardHeader>
              <CardTitle>Email templates</CardTitle>
              <CardDescription>
                Manage all email templates (order confirmation, delivery, payment receipt, etc.)
                with variables like {`{{orderNumber}}`}, {`{{customerName}}`}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href='/admin/email-settings/email-template'
                className='text-primary hover:underline font-medium'
              >
                Open Email Templates →
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
