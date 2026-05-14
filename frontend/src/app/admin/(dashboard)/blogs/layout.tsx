import { BlogsTabNav } from '@/components/admin/blogs/BlogsTabNav'

type TProps = {
  children: React.ReactNode
}

export default function BlogsLayout({ children }: TProps) {
  return (
    <div className='w-full max-w-full overflow-x-hidden'>
      <BlogsTabNav />
      {children}
    </div>
  )
}
