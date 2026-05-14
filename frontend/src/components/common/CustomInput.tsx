import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'
import { forwardRef } from 'react'

type TProps = {
  label?: string
  name?: string
  placeholder?: string
  error?: string
  helperText?: string
  required?: boolean
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'tel'
    | 'url'
    | 'date'
    | 'textarea'
    | 'checkbox'
    | 'switch'
    | 'select'
    | 'file'
  size?: 'small' | 'middle' | 'large'
  rows?: number
  compact?: boolean
  maxLength?: number
  showCharCount?: boolean
  disabled?: boolean
  className?: string
  labelClassName?: string
  inputClassName?: string
  style?: CSSProperties
  value?: string | number | boolean
  defaultValue?: any
  checked?: boolean
  options?: { value: string | number; label: string }[]
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onValueChange?: (value: string) => void
  onCheckedChange?: (checked: boolean) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  // Number input specific props
  step?: number | string
  min?: number | string
  max?: number | string
  // Prefix/Suffix props
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  // File input specific props
  accept?: string
  multiple?: boolean
}

const CustomInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, TProps>(
  (
    {
      label,
      name,
      placeholder,
      error,
      helperText,
      required = false,
      type = 'text',
      size = 'middle',
      rows = 4,
      maxLength,
      showCharCount = false,
      disabled = false,
      className,
      labelClassName,
      inputClassName,
      style,
      value,
      defaultValue,
      checked,
      options = [],
      onChange,
      onValueChange,
      onCheckedChange,
      onBlur,
      onKeyDown,
      step,
      min,
      max,
      prefix,
      suffix,
      accept,
      multiple,
      ...props
    },
    ref
  ) => {
    const isTextarea = type === 'textarea'
    const isCheckbox = type === 'checkbox'
    const isSwitch = type === 'switch'
    const isSelect = type === 'select'
    const currentLength = value?.toString().length || 0

    // Size variant classes
    const sizeClasses = {
      small: 'h-8 px-2 text-sm',
      middle: 'h-9 px-3 text-sm',
      large: 'h-10 px-4 text-base'
    }

    const textareaSizeClasses = {
      small: 'px-2 py-1 text-sm',
      middle: 'px-3 py-2 text-sm',
      large: 'px-4 py-3 text-base'
    }

    return (
      <div className={cn('flex flex-col', { 'gap-2': label || error || helperText }, className)}>
        {label && !isCheckbox && !isSwitch && (
          <Label
            htmlFor={name}
            className={cn(
              required && 'after:content-["*"] after:text-destructive after:ml-1',
              disabled && 'text-muted-foreground',
              labelClassName
            )}
          >
            {label}
          </Label>
        )}

        {isCheckbox ? (
          <div className='flex items-center space-x-2'>
            <Checkbox
              id={name}
              checked={checked}
              onCheckedChange={onCheckedChange}
              disabled={disabled}
              className={inputClassName}
              {...(props as any)}
            />
            <Label
              htmlFor={name}
              className={cn(
                'font-medium text-sm',
                required && 'after:content-["*"] after:text-destructive after:ml-1',
                disabled && 'text-muted-foreground',
                labelClassName
              )}
            >
              {label}
            </Label>
          </div>
        ) : isSwitch ? (
          <div className='flex items-center space-x-2'>
            <Switch
              id={name}
              checked={checked}
              onCheckedChange={onCheckedChange}
              disabled={disabled}
              className={inputClassName}
              {...(props as any)}
            />
            <Label
              htmlFor={name}
              className={cn(
                'font-medium text-sm',
                required && 'after:content-["*"] after:text-destructive after:ml-1',
                disabled && 'text-muted-foreground',
                labelClassName
              )}
            >
              {label}
            </Label>
          </div>
        ) : isSelect ? (
          <Select onValueChange={onValueChange} value={value as string} disabled={disabled}>
            <SelectTrigger
              className={cn('w-full', error && 'border-destructive', inputClassName)}
              style={style}
            >
              <SelectValue placeholder={placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : isTextarea ? (
          <Textarea
            ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
            id={name}
            name={name}
            placeholder={placeholder}
            rows={rows}
            maxLength={maxLength}
            disabled={disabled}
            style={style}
            {...(value !== undefined ? { value: value ?? '' } : { defaultValue })}
            onChange={onChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            className={cn(
              textareaSizeClasses[size],
              error && 'border-destructive focus-visible:ring-destructive',
              inputClassName
            )}
            {...(props as any)}
          />
        ) : prefix || suffix ? (
          // Input with prefix/suffix wrapper
          <div
            className={cn(
              'flex items-center border border-input bg-transparent dark:bg-input/30 file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 shadow-xs focus-within:ring-2 focus-within:ring-ring ring-offset-background focus-within:ring-offset-2',
              error && 'border-destructive focus-within:ring-destructive',
              sizeClasses[size].includes('h-8') && 'h-8',
              sizeClasses[size].includes('h-10') && 'h-10',
              sizeClasses[size].includes('h-12') && 'h-12',
              'rounded-md px-3',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={style}
          >
            {prefix && (
              <div
                className={cn(
                  'flex items-center mr-2 text-muted-foreground',
                  size === 'small' && 'text-sm',
                  size === 'large' && 'text-base'
                )}
              >
                {prefix}
              </div>
            )}
            <Input
              ref={ref as React.ForwardedRef<HTMLInputElement>}
              id={name}
              name={name}
              type={type}
              placeholder={placeholder}
              maxLength={maxLength}
              disabled={disabled}
              style={style}
              {...(value !== undefined ? { value: value ?? '' } : {})}
              onChange={onChange}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
              step={step}
              min={min}
              max={max}
              accept={accept}
              multiple={multiple}
              className={cn(
                'flex-1 bg-transparent dark:bg-transparent shadow-none p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0',
                // Hide number input arrows/spinners
                {
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none':
                    type === 'number'
                },
                inputClassName
              )}
              {...(props as any)}
            />
            {suffix && (
              <div
                className={cn(
                  'flex items-center ml-2 text-muted-foreground',
                  size === 'small' && 'text-sm',
                  size === 'large' && 'text-base'
                )}
              >
                {suffix}
              </div>
            )}
          </div>
        ) : (
          // Regular input without prefix/suffix
          <Input
            ref={ref as React.ForwardedRef<HTMLInputElement>}
            id={name}
            name={name}
            type={type}
            placeholder={placeholder}
            {...(value !== undefined ? { value: value ?? '' } : { defaultValue })}
            maxLength={maxLength}
            disabled={disabled}
            style={style}
            onChange={onChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            step={step}
            min={min}
            max={max}
            accept={accept}
            multiple={multiple}
            className={cn(
              error && 'border-destructive focus-visible:ring-destructive',
              sizeClasses[size],
              // Hide number input arrows/spinners
              type === 'number' &&
                '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              inputClassName
            )}
            {...(props as any)}
            size={{ height: 50 }}
          />
        )}

        <div className='flex justify-between items-start'>
          <div className='flex flex-col gap-1'>
            {error && <span className='font-medium text-destructive text-xs'>{error}</span>}
            {helperText && !error && (
              <span className='text-muted-foreground text-xs'>{helperText}</span>
            )}
          </div>

          {showCharCount && maxLength && (
            <span
              className={cn(
                'text-xs',
                currentLength > maxLength * 0.9 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                currentLength >= maxLength && 'text-destructive'
              )}
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    )
  }
)

CustomInput.displayName = 'CustomInput'

export default CustomInput
