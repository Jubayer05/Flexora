interface SectionHeaderProps {
  title: string
  className?: string
}

export default function SectionHeader({ title, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center mb-6 ${className}`}>
      <h2 className='bg-primary px-3 py-1 rounded font-bold text-primary-foreground text-xl'>
        {title}
      </h2>
      <div className='flex-1 bg-border ml-4 h-px' />
    </div>
  )
}
