'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Laptop, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

type ThemeMode = 'system' | 'light' | 'dark'

export default function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const currentTheme: ThemeMode = (theme as ThemeMode) || 'system'
  const effectiveTheme =
    currentTheme === 'system'
      ? ((systemTheme as 'light' | 'dark' | undefined) ?? 'light')
      : currentTheme

  const Icon = effectiveTheme === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size='icon'
          className={cn('border border-border bg-background/60 hover:bg-accent', className)}
          aria-label='Toggle theme'
          suppressHydrationWarning
        >
          {/* Avoid hydration mismatch on first render */}
          {mounted ? (
            <Icon
              className={cn(
                'h-4 w-4 transition-colors',
                effectiveTheme === 'dark' ? 'text-yellow-300' : 'text-amber-500'
              )}
            />
          ) : (
            <Sun className='h-4 w-4 opacity-70 text-amber-500' />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='bg-background text-card-foreground font-manrope'>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            currentTheme === 'system' && 'bg-accent text-accent-foreground'
          )}
        >
          <Laptop className='h-4 w-4' />
          <span>System</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            currentTheme === 'light' && 'bg-accent text-accent-foreground'
          )}
        >
          <Sun className='h-4 w-4' />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center gap-2 cursor-pointer',
            currentTheme === 'dark' && 'bg-accent text-accent-foreground'
          )}
        >
          <Moon className='h-4 w-4' />
          <span>Dark</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
