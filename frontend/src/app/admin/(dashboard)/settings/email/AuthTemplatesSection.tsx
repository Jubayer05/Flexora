'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import useAsync from '@/hooks/useAsync'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import { toast } from 'sonner'

const AUTH_TYPES = [
  { type: 'VERIFICATION_CODE', label: 'Guest order access / verification code' },
  { type: 'WELCOME_EMAIL', label: 'Welcome email (new user)' },
  { type: 'PASSWORD_RESET', label: 'Password reset' },
  { type: 'EMAIL_CONFIRMATION', label: 'Email confirmation' }
] as const

type AuthTemplate = {
  id: number
  type: string
  subject: string
  body: string
  isActive: boolean
}

export function AuthTemplatesSection() {
  const [editingType, setEditingType] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  /** True when the template exists in DB (GET succeeded); false when 404 so we need to POST to create */
  const [templateExists, setTemplateExists] = useState(true)

  const { data: listData, loading: listLoading, mutate: mutateList } = useAsync<{
    success: boolean
    data: AuthTemplate[]
  }>('/admin/delivery-templates/auth', true)

  const templates = listData?.data ?? []

  const loadForEdit = async (type: string) => {
    setEditingType(type)
    setSubject('')
    setBody('')
    setTemplateExists(true)
    try {
      const res = await requests.get<{ success: boolean; data: AuthTemplate }>(
        `/admin/delivery-templates/auth/${type}`
      )
      if (res?.data) {
        setSubject(res.data.subject ?? '')
        setBody(res.data.body ?? '')
        setTemplateExists(true)
      }
    } catch (err: any) {
      const is404 = err?.response?.status === 404
      if (is404) {
        setSubject('')
        setBody('')
        setTemplateExists(false)
      } else {
        showError(err)
        setEditingType(null)
      }
    }
  }

  const saveAuthTemplate = async () => {
    if (!editingType) return
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body are required.')
      return
    }
    setSaving(true)
    try {
      if (templateExists) {
        await requests.put(`/admin/delivery-templates/auth/${editingType}`, {
          subject: subject.trim(),
          body: body.trim(),
          isActive: true
        })
        toast.success('Template updated.')
      } else {
        await requests.post('/admin/delivery-templates/auth', {
          type: editingType,
          subject: subject.trim(),
          body: body.trim(),
          isActive: true
        })
        toast.success('Template created.')
        setTemplateExists(true)
      }
      setEditingType(null)
      mutateList()
    } catch (err) {
      showError(err)
    } finally {
      setSaving(false)
    }
  }

  if (listLoading) {
    return <Skeleton className='h-48 w-full' />
  }

  return (
    <div className='space-y-4'>
      {AUTH_TYPES.map(({ type, label }) => {
        const isEditing = editingType === type
        return (
          <Card key={type}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-base'>{label}</CardTitle>
              <span className='text-muted-foreground text-sm font-mono'>{type}</span>
            </CardHeader>
            <CardContent className='space-y-4'>
              {!isEditing ? (
                <Button variant='outline' size='sm' onClick={() => loadForEdit(type)}>
                  Edit template
                </Button>
              ) : (
                <>
                  {!templateExists && (
                    <p className='text-muted-foreground text-sm'>
                      No template yet. Enter subject and body below and click Save to create.
                    </p>
                  )}
                  <div className='space-y-2'>
                    <Label>Subject</Label>
                    <input
                      type='text'
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className='border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                      placeholder='Email subject'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Body (plain text; use variables as needed)</Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={8}
                      className='resize-none font-mono text-sm'
                      placeholder='Email body...'
                    />
                    <p className='text-muted-foreground text-xs'>
                      Variables: VERIFICATION_CODE → {`{{customerName}}`}, {`{{verificationCode}}`}, {`{{orderNumber}}`}, {`{{guestAccessUrl}}`}, {`{{signUpUrl}}`}, {`{{email}}`}. Others may support {`{{name}}`}, {`{{resetLink}}`}, etc.
                    </p>
                  </div>
                  <div className='flex gap-2'>
                    <Button size='sm' onClick={saveAuthTemplate} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        setEditingType(null)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
