'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import useAsync from '@/hooks/useAsync'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

function CreateDefaultTemplateBlock({ onCreateSuccess }: { onCreateSuccess: () => void }) {
  const [creating, setCreating] = useState(false)
  const handleCreate = async () => {
    setCreating(true)
    try {
      await requests.post('/admin/delivery-templates', {
        name: 'Default',
        isDefault: true,
        thankYouMessage: '',
        couponPromotionText: '',
        supportContactInfo: '',
        feedbackRequestText: '',
        credentialsHeader: 'ACCOUNT CREDENTIALS',
        credentialsFormat:
          '____ {{itemName}} - Order #{{orderNumber}} Quantity: {{quantity}} ____',
        credentialsFooter: '____ end of goods ____',
        isActive: true
      })
      toast.success('Default delivery template created. You can edit it below.')
      onCreateSuccess()
    } catch (err) {
      showError(err)
    } finally {
      setCreating(false)
    }
  }
  return (
    <div className='rounded-lg border border-dashed bg-muted/30 p-6 text-center'>
      <p className='text-muted-foreground mb-4'>
        No default delivery template set. Create one to edit thank-you message, coupon text, support
        info, and credentials header/footer here.
      </p>
      <Button onClick={handleCreate} disabled={creating}>
        {creating ? 'Creating...' : 'Create default delivery template'}
      </Button>
    </div>
  )
}

const DEFAULT_CREDENTIALS_HEADER = 'ACCOUNT CREDENTIALS'
const DEFAULT_CREDENTIALS_FORMAT =
  '____ {{itemName}} - Order #{{orderNumber}} Quantity: {{quantity}} ____'
const DEFAULT_CREDENTIALS_FOOTER = '____ end of goods ____'

type DeliveryTemplate = {
  id?: number
  name?: string
  isDefault?: boolean
  thankYouMessage?: string | null
  couponPromotionText?: string | null
  supportContactInfo?: string | null
  feedbackRequestText?: string | null
  credentialsHeader?: string | null
  credentialsFormat?: string | null
  credentialsFooter?: string | null
}

export function DeliveryTemplateForm() {
  const [saving, setSaving] = useState(false)
  const [thankYouMessage, setThankYouMessage] = useState('')
  const [couponPromotionText, setCouponPromotionText] = useState('')
  const [supportContactInfo, setSupportContactInfo] = useState('')
  const [feedbackRequestText, setFeedbackRequestText] = useState('')
  const [credentialsHeader, setCredentialsHeader] = useState(DEFAULT_CREDENTIALS_HEADER)
  const [credentialsFormat, setCredentialsFormat] = useState(DEFAULT_CREDENTIALS_FORMAT)
  const [credentialsFooter, setCredentialsFooter] = useState(DEFAULT_CREDENTIALS_FOOTER)

  const { data, loading, mutate } = useAsync<{ success: boolean; data: DeliveryTemplate }>(
    () => '/admin/delivery-templates/default',
    true
  )
  const template = data?.data
  const hasSyncedTemplate = useRef<number | null>(null)

  // Sync local state only when template first loads (so typing is not overwritten)
  useEffect(() => {
    if (template?.id != null && hasSyncedTemplate.current !== template.id) {
      hasSyncedTemplate.current = template.id
      setThankYouMessage(template.thankYouMessage ?? '')
      setCouponPromotionText(template.couponPromotionText ?? '')
      setSupportContactInfo(template.supportContactInfo ?? '')
      setFeedbackRequestText(template.feedbackRequestText ?? '')
      setCredentialsHeader(template.credentialsHeader ?? DEFAULT_CREDENTIALS_HEADER)
      setCredentialsFormat(template.credentialsFormat ?? DEFAULT_CREDENTIALS_FORMAT)
      setCredentialsFooter(template.credentialsFooter ?? DEFAULT_CREDENTIALS_FOOTER)
    }
  }, [template?.id])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!template?.id) {
      toast.error('No default delivery template found. Create one first in Delivery Templates.')
      return
    }
    setSaving(true)
    try {
      await requests.put(`/admin/delivery-templates/${template.id}`, {
        name: template.name ?? 'Default',
        isDefault: true,
        thankYouMessage: thankYouMessage || null,
        couponPromotionText: couponPromotionText || null,
        supportContactInfo: supportContactInfo || null,
        feedbackRequestText: feedbackRequestText || null,
        credentialsHeader: credentialsHeader || DEFAULT_CREDENTIALS_HEADER,
        credentialsFormat: credentialsFormat || DEFAULT_CREDENTIALS_FORMAT,
        credentialsFooter: credentialsFooter || null
      })
      toast.success('Delivery content updated.')
      mutate()
    } catch (err) {
      showError(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Skeleton className='h-64 w-full' />
  }

  if (!template) {
    return (
      <p className='text-muted-foreground'>
        No delivery template in database. Create a template and set it as default via the backend or
        seed, then refresh.
      </p>
    )
  }

  if (!template.id) {
    return (
      <CreateDefaultTemplateBlock onCreateSuccess={mutate} />
    )
  }

  return (
    <form onSubmit={onSubmit} className='space-y-6'>
      <div className='space-y-2'>
        <Label>Thank you message</Label>
        <Textarea
          value={thankYouMessage}
          onChange={(e) => setThankYouMessage(e.target.value)}
          placeholder='Custom thank you message in delivery email'
          rows={3}
          className='resize-none'
        />
      </div>
      <div className='space-y-2'>
        <Label>Coupon promotion text</Label>
        <Textarea
          value={couponPromotionText}
          onChange={(e) => setCouponPromotionText(e.target.value)}
          placeholder='Promotional text / coupon offer in delivery'
          rows={2}
          className='resize-none'
        />
      </div>
      <div className='space-y-2'>
        <Label>Support contact info</Label>
        <Textarea
          value={supportContactInfo}
          onChange={(e) => setSupportContactInfo(e.target.value)}
          placeholder='Support email, link, or phone'
          rows={2}
          className='resize-none'
        />
      </div>
      <div className='space-y-2'>
        <Label>Feedback request text</Label>
        <Textarea
          value={feedbackRequestText}
          onChange={(e) => setFeedbackRequestText(e.target.value)}
          placeholder='Request for customer feedback'
          rows={2}
          className='resize-none'
        />
      </div>
      <div className='space-y-2'>
        <Label>Credentials section header</Label>
        <Input
          value={credentialsHeader}
          onChange={(e) => setCredentialsHeader(e.target.value)}
          placeholder='ACCOUNT CREDENTIALS'
          className='w-full'
        />
      </div>
      <div className='space-y-2'>
        <Label>Credentials section header (format line)</Label>
        <Input
          value={credentialsFormat}
          onChange={(e) => setCredentialsFormat(e.target.value)}
          placeholder='____ {{itemName}} - Order #{{orderNumber}} Quantity: {{quantity}} ____'
          className='w-full font-mono text-sm'
        />
        <p className='text-muted-foreground text-sm'>
          Variables: {`{{itemName}}`}, {`{{orderNumber}}`}, {`{{quantity}}`}
        </p>
      </div>
      <div className='space-y-2'>
        <Label>Credentials section footer</Label>
        <Input
          value={credentialsFooter}
          onChange={(e) => setCredentialsFooter(e.target.value)}
          placeholder='____ end of goods ____'
          className='w-full'
        />
      </div>
      <Button type='submit' disabled={saving}>
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  )
}
