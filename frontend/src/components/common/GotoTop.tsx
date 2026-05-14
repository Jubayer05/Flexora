'use client'

import { MoveUp } from 'lucide-react'

export default function GotoTop() {
  return (
    <button
      className='inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:text-primary hover:border-primary/30 hover:bg-accent/70 backdrop-blur-md'
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      type='button'
    >
      Go top
      <MoveUp strokeWidth={1.8} className='h-3.5 w-3.5' />
    </button>
  )
}
