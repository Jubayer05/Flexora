'use client'

import CustomInput from '@/components/common/CustomInput'
import TicketImageUpload from '@/components/common/TicketImageUpload'
import { Button } from '@/components/ui/button'
import { showError } from '@/lib/errMsg'
import requests from '@/services/network/http'
import { zodResolver } from '@hookform/resolvers/zod'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

// Ticket Reply Schema
const TicketReplySchema = z.object({
  content: z
    .string('Content is required')
    .min(1, 'Content is required')
    .max(2000, 'Content must be less than 2000 characters')
    .trim(),
  isStaff: z.boolean()
})

type TicketReplyData = z.infer<typeof TicketReplySchema>

interface TicketReplyFormProps {
  ticketId: number | string
  ticketNumber?: string
  isCustomer?: boolean
  onClose?: () => void
  onSuccess?: () => void
  onTyping?: () => void
  onStopTyping?: () => void
}

const TicketReplyForm = ({
  ticketId,
  ticketNumber,
  isCustomer = false,
  onClose,
  onSuccess,
  onTyping,
  onStopTyping
}: TicketReplyFormProps) => {
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<string[]>([])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TicketReplyData>({
    resolver: zodResolver(TicketReplySchema),
    defaultValues: {
      content: '',
      isStaff: !isCustomer
    }
  })

  const onSubmit = async (data: TicketReplyData) => {
    setLoading(true)
    onStopTyping?.()

    const isStaff = !isCustomer
    const readyData = { ...data, isStaff, attachments }
    const url = isCustomer && ticketNumber
      ? `/customer/tickets/${ticketNumber}/replies`
      : `/admin/tickets/${ticketId}/replies`
    try {
      await requests.post(url, readyData)
      toast.success('Reply sent successfully!')
      reset()
      setAttachments([])
      onSuccess?.()
    } catch (error) {
      showError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-3 w-full'>
      <div className='flex gap-4 w-full'>
        <div className='flex-1'>
          <Controller
            name='content'
            control={control}
            render={({ field }) => (
              <CustomInput
                type='textarea'
                name={field.name}
                value={field.value}
                ref={field.ref}
                placeholder='Type your reply message...'
                error={errors.content?.message}
                required
                rows={1}
                className='resize-none'
                onChange={(e) => {
                  field.onChange(e)
                  onTyping?.()
                }}
                onBlur={() => {
                  field.onBlur()
                  onStopTyping?.()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(onSubmit)()
                  }
                }}
              />
            )}
          />
        </div>
        <div className='flex items-end gap-2 shrink-0'>
          <TicketImageUpload
            value={attachments}
            onChange={setAttachments}
            isAdmin={!isCustomer}
            disabled={loading}
          />
          <Button
            type='submit'
            size='icon'
            className='h-10 w-10'
            disabled={loading}
          >
            {loading ? (
              <div className='border-2 border-current border-t-transparent rounded-full w-4 h-4 animate-spin' />
            ) : (
              <Send className='w-4 h-4' />
            )}
          </Button>
        </div>
      </div>
      {onClose && (
        <div className='flex justify-end'>
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      )}
    </form>
  )
}

export default TicketReplyForm
