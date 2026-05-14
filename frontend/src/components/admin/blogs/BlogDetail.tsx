'use client'

import CustomImage from '@/components/common/CustomImage'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import parse from 'html-react-parser'
import { Eye, Globe, Share2, Tag, User } from 'lucide-react'

// Blog interface
interface BlogDetailViewProps {
  data: Blog
}

const BlogDetail = ({ data }: BlogDetailViewProps) => {
  if (!data) {
    return <div className='text-muted-foreground text-center'>No data available</div>
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='space-y-4'>{/* */}</div>

      <Separator />

      {/* Main content */}
      <div className='gap-6 grid grid-cols-1 lg:grid-cols-5'>
        {/* Content */}
        <div className='space-y-6 lg:col-span-3'>
          <div className='flex justify-between items-start'>
            <div className='flex-1'>
              <h1 className='font-bold text-3xl leading-tight'>{data?.title}</h1>
              <p className='mt-2 text-muted-foreground'>{data?.excerpt}</p>
            </div>
          </div>

          {/* Meta Information */}
          {/* <div className='flex flex-wrap items-center gap-4 text-muted-foreground text-sm'>
            <div className='flex items-center gap-1'>
              <User className='w-4 h-4' />
              <span>{data?.author?.username || 'Unknown Author'}</span>
            </div>
            <div className='flex items-center gap-1'>
              <Calendar className='w-4 h-4' />
              <span>Created {new Date(data?.createdAt).toLocaleDateString()}</span>
            </div>
            <div className='flex items-center gap-1'>
              <Tag className='w-4 h-4' />
              <Badge variant='outline' className='text-muted capitalize'>
                {data?.category?.name || `Category ${data?.categoryId}`}
              </Badge>
            </div>
          </div> */}

          {/* Thumbnail Image */}
          {data?.thumbnail && (
            <CustomImage
              src={data?.thumbnail}
              alt={data?.title}
              height={300}
              width={300}
              className='rounded-lg w-full h-64 object-cover'
            />
          )}

          {/* Blog Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='max-w-none prose prose-lg'>
                <div className='whitespace-pre-wrap'>{parse(data?.content)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Images */}
          {data?.gallery && data?.gallery.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Eye className='w-4 h-4' />
                  Gallery ({data?.gallery.length} images)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-4'>
                  {data?.gallery.map((imageUrl: string, index: number) => (
                    <div key={index} className='rounded-lg min-w-20 aspect-square overflow-hidden'>
                      <CustomImage
                        src={imageUrl}
                        alt={`Gallery image ${index + 1}`}
                        height={100}
                        width={100}
                        className='w-full h-full object-cover hover:scale-105 transition-transform'
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {data?.tags && data?.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Tag className='w-4 h-4' />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-2'>
                  {data?.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant='secondary'>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className='space-y-4 lg:col-span-2'>
          {/* Author Info */}
          {data?.author && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <User className='w-4 h-4' />
                  Author
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div>
                  <span className='font-medium text-sm'>Name:</span>
                  <p className='mt-1 text-muted-foreground text-sm'>{data?.author.username}</p>
                </div>
                <div>
                  <span className='font-medium text-sm'>Email:</span>
                  <p className='mt-1 text-muted-foreground text-sm'>{data?.author.email}</p>
                </div>
                {data?.author.role && (
                  <div>
                    <span className='font-medium text-sm'>Role:</span>
                    <Badge variant='outline' className='ml-2 text-muted'>
                      {data?.author.role}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SEO Information */}
          {data?.seo && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <Globe className='w-4 h-4' />
                  SEO & Meta
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                {data?.seo.title && (
                  <div>
                    <span className='font-medium text-sm'>SEO Title:</span>
                    <p className='mt-1 text-muted-foreground text-sm'>{data?.seo.title}</p>
                  </div>
                )}

                {data?.seo.description && (
                  <div>
                    <span className='font-medium text-sm'>SEO Description:</span>
                    <p className='mt-1 text-muted-foreground text-sm'>{data?.seo.description}</p>
                  </div>
                )}

                {data?.seo.keywords && data?.seo.keywords.length > 0 && (
                  <div>
                    <span className='font-medium text-sm'>SEO Keywords:</span>
                    <div className='flex flex-wrap gap-1 mt-1'>
                      {data?.seo.keywords.map((keyword: string, index: number) => (
                        <Badge key={index} variant='outline' className='text-muted text-xs'>
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* URL Information */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-lg'>
                <Share2 className='w-4 h-4' />
                URL Info
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div>
                <span className='font-medium text-sm'>Slug:</span>
                <p className='mt-1 font-mono text-muted-foreground text-sm'>/{data?.slug}</p>
              </div>
              <div>
                <span className='font-medium text-sm'>Blog ID:</span>
                <p className='mt-1 text-muted-foreground text-sm'>#{data?.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default BlogDetail
