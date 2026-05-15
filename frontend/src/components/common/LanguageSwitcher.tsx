'use client'

import useAsync from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LanguageType } from '../admin/form/settings/Language'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import CustomImage from './CustomImage'

// const LANGUAGES = [
//   { code: 'en', name: 'English', flag: '🇺🇸' },
//   { code: 'es', name: 'Español', flag: '🇪🇸' },
//   { code: 'fr', name: 'Français', flag: '🇫🇷' },
//   { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
//   { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
//   { code: 'ja', name: '日本語', flag: '🇯🇵' },
//   { code: 'bn', name: 'বাংলা', flag: '🇯🇵' },
//   { code: 'ko', name: '한국어', flag: '🇰🇷' },
//   { code: 'ar', name: 'العربية', flag: '🇸🇦' },
//   { code: 'pt', name: 'Português', flag: '🇵🇹' },
//   { code: 'ru', name: 'Русский', flag: '🇷🇺' },
//   { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
//   { code: 'it', name: 'Italiano', flag: '🇮🇹' },
//   { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
//   { code: 'pl', name: 'Polski', flag: '🇵🇱' },
//   { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
//   { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' }
// ]

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const [currentLang, setCurrentLang] = useState('en')
  const [isOpen, setIsOpen] = useState(false)

  const { data } = useAsync(() => '/settings/key/system_website_language', true)
  useEffect(() => {
    // Get saved language or browser language
    const saved = localStorage.getItem('preferredLanguage')
    const browser = navigator.language.split('-')[0]
    setCurrentLang(saved || browser || 'en')
  }, [])

  const setGoogTransCookie = (value: string) => {
    const COOKIE_NAME = 'googtrans'
    const isIpAddress = (host: string) => /^\\d{1,3}(\\.\\d{1,3}){3}$/.test(host)
    const host = window.location.hostname

    const domains: (string | undefined)[] = [undefined]
    if (host && host !== 'localhost' && !isIpAddress(host)) {
      domains.push(host)
      const parts = host.split('.')
      for (let i = 1; i < parts.length; i += 1) domains.push('.' + parts.slice(i).join('.'))
    }

    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
    domains.forEach((domain) => {
      const domainSegment = domain ? `;domain=${domain}` : ''
      document.cookie = `${COOKIE_NAME}=${value};path=/;expires=${expires}${domainSegment}`
    })
  }

  const switchLanguage = (langCode: string) => {
    // First, update UI immediately for better UX
    setCurrentLang(langCode)
    setIsOpen(false)
    localStorage.setItem('preferredLanguage', langCode)

    // Try to switch Google Translate using select element
    const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement

    if (selectElement) {
      selectElement.value = langCode
      const event = new Event('change', { bubbles: true })
      selectElement.dispatchEvent(event)
      return
    }

    // If select not available yet, set cookie and reload
    // Use `/auto/<lang>` so Google detects the original language correctly.
    setGoogTransCookie(`/auto/${langCode}`)

    // Reload page to apply translation
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  // Normalize language list and safely resolve current language
  const languagesRaw: LanguageType[] = Array.isArray(data?.data?.value)
    ? (data?.data?.value as LanguageType[])
    : []

  // Always sort by numeric position (stable, supports asc/desc in admin UI)
  // If position is missing, push it to the end.
  const languages = [...languagesRaw].sort((a, b) => {
    const ap =
      typeof (a as any)?.position === 'number' ? (a as any).position : Number.POSITIVE_INFINITY
    const bp =
      typeof (b as any)?.position === 'number' ? (b as any).position : Number.POSITIVE_INFINITY
    if (ap !== bp) return ap - bp
    // Tie-breaker for deterministic order
    return String(a?.name || a?.shortName || '').localeCompare(
      String(b?.name || b?.shortName || '')
    )
  })

  const currentLanguage: LanguageType | undefined =
    languages.find((lang: LanguageType) => lang.shortName === currentLang) || languages[0]
  const currentIcon = currentLanguage?.icon || ''
  const currentName = currentLanguage?.name || currentLang?.toUpperCase() || 'Language'

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size={compact ? 'icon' : 'default'}
          className={cn(
            'shrink-0 font-semibold transition !rounded-full border border-outline-variant bg-surface-container/40 text-on-surface shadow-sm backdrop-blur-md hover:bg-surface-variant hover:border-primary/30 hover:text-on-surface',
            compact ? 'size-9 p-0' : 'h-9 gap-1.5 px-3 text-sm'
          )}
          aria-label='Change language'
        >
          {currentIcon ? (
            <CustomImage src={currentIcon} alt={currentName} width={compact ? 18 : 24} height={compact ? 18 : 24} className={compact ? 'size-[18px]' : ''} />
          ) : (
            <span aria-hidden className={compact ? 'text-base' : 'text-lg'}>
              🌐
            </span>
          )}

          {!compact && (
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
            </svg>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align='end'
        className='w-64 max-h-96 custom-scrollbar !bg-card !text-card-foreground !border-border shadow-xl font-manrope'
      >
        {languages.length === 0 ? (
          <div className='px-3 py-2 text-muted-foreground text-sm'>No languages</div>
        ) : (
          languages.map((lang: LanguageType) => (
            <DropdownMenuItem
              key={lang.shortName}
              onClick={() => switchLanguage(lang.shortName)}
              className={cn(
                'flex items-center gap-3 rounded-full px-3 py-2',
                currentLang === lang.shortName && 'bg-accent text-accent-foreground'
              )}
            >
              {lang.icon && <CustomImage src={lang.icon} alt={lang.name} width={24} height={24} />}
              <span className='font-medium text-sm'>{lang.name}</span>
              {currentLang === lang.shortName && <Check className='ml-auto h-4 w-4' />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
