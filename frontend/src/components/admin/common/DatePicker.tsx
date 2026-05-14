'use client'

import { CalendarIcon, Clock } from 'lucide-react'
import * as React from 'react'
import { forwardRef } from 'react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  label?: string
  name?: string
  placeholder?: string
  error?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
  className?: string
  labelClassName?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  // Date picker specific
  showTime?: boolean
  size?: 'small' | 'middle' | 'large'
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      label,
      name,
      placeholder = 'Select date',
      error,
      helperText,
      required = false,
      disabled = false,
      className,
      labelClassName,
      value,
      onChange,
      onBlur,
      showTime = true,
      size = 'middle',
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false)
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
    const startMonth = React.useMemo(() => new Date(2000, 0), [])
    const endMonth = React.useMemo(() => new Date(2100, 11), [])

    // Size variant classes matching CustomInput
    const sizeClasses = {
      small: 'h-8 px-2 text-sm',
      middle: 'h-9 px-3 text-sm',
      large: 'h-12 px-4 text-base'
    }

    // Helper function to parse UTC datetime-local string
    const parseUTCDatetime = (utcString: string): Date | undefined => {
      if (!utcString) return undefined
      // If it's already in ISO format, parse directly
      if (utcString.includes('T') || utcString.includes('Z')) {
        return new Date(utcString)
      }
      // If it's in datetime-local format (YYYY-MM-DDTHH:MM), treat as UTC
      return new Date(utcString + ':00.000Z')
    }

    // Helper function to format date for datetime-local input (UTC)
    const formatForDatetimeLocal = (date: Date): string => {
      return date.toISOString().slice(0, 16)
    }

    React.useEffect(() => {
      const parsedDate = parseUTCDatetime(value || '')
      setSelectedDate(parsedDate)
    }, [value])

    const handleDateSelect = (date: Date | undefined) => {
      if (date && onChange) {
        // Keep the existing time if we have one, otherwise set to current time
        const finalDate = new Date(date)

        if (selectedDate && showTime) {
          // Preserve the existing time when just changing the date
          finalDate.setUTCHours(selectedDate.getUTCHours())
          finalDate.setUTCMinutes(selectedDate.getUTCMinutes())
          finalDate.setUTCSeconds(selectedDate.getUTCSeconds())
        } else if (showTime) {
          // Set default time to current time if no previous time exists
          const now = new Date()
          finalDate.setUTCHours(now.getUTCHours())
          finalDate.setUTCMinutes(now.getUTCMinutes())
          finalDate.setUTCSeconds(0)
        } else {
          // For date-only, set time to start of day in UTC
          finalDate.setUTCHours(0, 0, 0, 0)
        }

        setSelectedDate(finalDate)

        // Create a synthetic event with UTC format
        const syntheticEvent = {
          target: {
            value: formatForDatetimeLocal(finalDate)
          }
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }
      setOpen(false)
    }

    const handleTimeChange = (timeString: string) => {
      if (selectedDate && timeString && onChange) {
        const [hours, minutes] = timeString.split(':').map(Number)
        const newDate = new Date(selectedDate)
        newDate.setUTCHours(hours, minutes, 0, 0)

        setSelectedDate(newDate)

        const syntheticEvent = {
          target: {
            value: formatForDatetimeLocal(newDate)
          }
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }
    }

    const formatDisplayDate = (date: Date) => {
      if (showTime) {
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC'
        })
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      })
    }

    return (
      <div className={cn('flex flex-col', { 'gap-2': label || error || helperText }, className)}>
        {label && (
          <Label
            htmlFor={name}
            className={cn(
              required && 'after:content-["*"] after:text-red-500 after:ml-1',
              disabled && 'text-gray-400',
              labelClassName
            )}
          >
            {label}
          </Label>
        )}

        <div className='relative'>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id={name}
                variant='outline'
                disabled={disabled}
                className={cn(
                  'justify-start w-full font-normal',
                  sizeClasses[size],
                  !selectedDate && 'text-muted-foreground',
                  error && 'border-red-500 focus-visible:ring-red-500',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className='flex items-center w-full'>
                  <CalendarIcon className='mr-2 w-4 h-4' />
                  <span className='flex-1 text-left'>
                    {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
                  </span>
                  {showTime && <Clock className='ml-2 w-3 h-3 text-muted-foreground' />}
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className='p-0 w-auto' align='start'>
              <div className='p-3'>
                <Calendar
                  mode='single'
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  captionLayout='dropdown'
                  startMonth={startMonth}
                  endMonth={endMonth}
                  disabled={disabled}
                  initialFocus
                />
                {showTime && selectedDate && (
                  <div className='flex items-center gap-2 mt-3 pt-3 border-t'>
                    <Clock className='w-4 h-4 text-muted-foreground' />
                    <Input
                      type='time'
                      value={
                        selectedDate
                          ? `${selectedDate
                              .getUTCHours()
                              .toString()
                              .padStart(2, '0')}:${selectedDate
                              .getUTCMinutes()
                              .toString()
                              .padStart(2, '0')}`
                          : ''
                      }
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className='w-full text-sm'
                    />
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Hidden input for form compatibility */}
          <Input
            ref={ref}
            type='hidden'
            name={name}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            {...props}
          />
        </div>

        <div className='flex justify-between items-start'>
          <div className='flex flex-col gap-1'>
            {error && <span className='font-medium text-red-500 text-xs'>{error}</span>}
            {helperText && !error && <span className='text-gray-500 text-xs'>{helperText}</span>}
          </div>
        </div>
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'
