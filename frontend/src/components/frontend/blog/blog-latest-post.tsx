import { fetchOnServer } from '@/action/data'
import { BlogCard } from '@/components/card/blog-card'
import { Typography } from '@/components/common/typography'

export default async function LatestPost({ slug }: { slug: string }) {
  // TODO: use client
  const data = await fetchOnServer(`/blogs?page=1&limit=12`)
  const filteredData = data?.data?.blogs?.filter((item: Blog) => item?.slug !== slug)

  return (
    <div className='space-y-4 p-10 border border-gray-300 rounded-lg'>
      <Typography variant='h5' weight='medium' className='pb-2 border-gray-200 border-b'>
        Latest Post
      </Typography>

      <div className='flex flex-col gap-y-4'>
        {filteredData?.map((post: Blog, index: number) => (
          <BlogCard post={post} variant='compact' key={index} />
        ))}
      </div>
    </div>
  )
}
