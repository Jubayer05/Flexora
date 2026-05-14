import { containerVariants } from '@/components/common/container'
import { cn } from '@/lib/utils'
import MainHeader from './MainHeader'

export default function Header() {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 overflow-x-hidden',
        'bg-background/70 supports-backdrop-filter:bg-background/55 backdrop-blur-xl',
        'border-b border-border/60 shadow-[0_10px_30px_-22px_rgba(99,102,241,0.35)]'
      )}
    >
      <div className='pointer-events-none absolute inset-0 -z-10'>
        <div className='absolute -top-24 left-1/3 h-64 w-64 rounded-full bg-primary/8 blur-[80px]' />
        <div className='absolute -top-20 right-1/4 h-56 w-56 rounded-full bg-violet-500/7 blur-[80px]' />
        <div
          className='absolute inset-0 opacity-[0.02]'
          style={{
            backgroundImage:
              'linear-gradient(rgba(99,102,241,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.55) 1px, transparent 1px)',
            backgroundSize: '80px 80px'
          }}
        />
      </div>

      <div className={cn(containerVariants(), 'min-w-0')}>
        <div className='relative'>
          <MainHeader />
        </div>
      </div>
    </header>
  )
}
