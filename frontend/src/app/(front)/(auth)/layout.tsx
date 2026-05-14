export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen bg-gradient-to-b from-background via-background to-muted/20'>
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.08),transparent)]' />
      <div className='relative'>{children}</div>
    </div>
  )
}
