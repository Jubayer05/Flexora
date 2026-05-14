'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getImgUrl } from '@/lib/get-image-url'
import { capitalize, formatKey, formatValue, isImage, isImageArray } from '@/lib/utils'
import { renderStars } from '@/utils/renderStarts'
import { Accordion, AccordionItem } from '../ui/accordion'
import CustomImage from './CustomImage'

interface RenderDataProps {
  title?: string
  data: Record<string, string | number | boolean | object | string[] | null | undefined>
  excludedFields?: string[]
  thumbnail?: string
}

// Utility: Sort keys for display priority
const getSortPriority = (
  key: string,
  value: string | number | boolean | object | string[] | null
): number => {
  if (key === 'test') return 0
  if (typeof value === 'number') return 1
  if (isImage(value)) return 2
  if (typeof value !== 'object' || value === null) return 3
  if (isImageArray(value)) return 4
  return 5
}

// Utility: Render value by type - takes RenderData component as parameter
const createRenderValue = (RenderDataComponent: any) => {
  const renderValue = (key: string, value: unknown): React.ReactNode => {
    // Array of objects (e.g. FAQ groups)
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      if ('faqs' in value[0]) {
        return value.map((group: any, idx: number) => (
          <div key={idx} className='space-y-1 mb-3'>
          <h2 className='font-semibold'>{group.name || `Group #${idx + 1}`}</h2>
          <Accordion type='single' collapsible className='w-full'>
            {group.faqs.map((faq: any, faqIdx: number) => (
              <AccordionItem
                key={faqIdx}
                value={`faq-${idx}-${faqIdx}`}
                title={faq.question || `Question #${faqIdx + 1}`}
              >
                {faq.answer || 'No answer provided.'}
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))
    }

    // General array-of-object
    return (
      <div className='space-y-4'>
        {value.map((item: any, idx: number) => (
          <div key={idx} className='p-2 border border-dashed rounded-md'>
            {Object.entries(item)
              .filter(([k]) => !['id', 'meta', 'createdAt', 'updatedAt'].includes(k))
              .map(([itemKey, itemVal]) => (
                <div key={itemKey}>
                  <span className='font-medium capitalize'>{formatKey(itemKey)}: </span>
                  {formatValue(itemKey, itemVal)}
                </div>
              ))}
          </div>
        ))}
      </div>
    )
  }
  // Array of strings
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return (
      <span className='flex flex-wrap gap-2'>
        {value.map((item, index) => (
          <span key={index} className='px-2 py-1 border rounded text-sm'>
            {item}
          </span>
        ))}
      </span>
    )
  }
  // Single image
  if (isImage(value as string | number | boolean | object | string[] | null)) {
    return (
      <CustomImage
        width={80}
        height={80}
        src={getImgUrl(value as string).toString()}
        alt={capitalize(formatKey(key))}
      />
    )
  }
  // Array of images
  if (isImageArray(value as string | number | boolean | object | string[] | null)) {
    return (value as string[]).map((img, index) => (
      <CustomImage
        key={index}
        width={60}
        height={60}
        src={getImgUrl(img).toString()}
        alt={`Image ${index + 1}`}
      />
    ))
  }
  // Ratings
  if (key === 'ratings') {
    return renderStars(Number(value || 0.5))
  }
  // Nested object
  if (typeof value === 'object' && value !== null) {
    return (
      <RenderDataComponent
        data={value as Record<string, string | number | boolean | object | string[] | null>}
      />
    )
  }
  // Primitive
  return formatValue(key, value)
  }
  
  renderValue.displayName = 'renderValue'
  return renderValue
}

/**
 * Scalable, reusable data details component for displaying key-value pairs.
 * - Uses Shadcn Card for layout
 * - Handles images, arrays, nested objects, FAQ blocks, and ratings
 * - Easily extendable for new types
 */
function RenderData({
  title,
  data,
  excludedFields = [],
  thumbnail
}: RenderDataProps) {
  // Create renderValue with access to this component
  const renderValue = createRenderValue(RenderData)

  // Component logic
  const filteredEntries = Object.entries(data)
    .filter(([key, value]) => value !== '' && value !== null && !excludedFields.includes(key))
    .sort(
      ([aKey, aValue], [bKey, bValue]) =>
        getSortPriority(aKey, aValue ?? null) - getSortPriority(bKey, bValue ?? null)
    )

  return (
    <Card>
      {title && (
        <CardHeader className='border-b'>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}

      <CardContent>
        {thumbnail && (
          <div className='flex justify-start mb-4'>
            <CustomImage
              width={150}
              height={150}
              src={getImgUrl(thumbnail || (data as { image: string })?.image).toString()}
              alt='Thumbnail'
            />
          </div>
        )}
        <div className='gap-0 grid text-base'>
          {filteredEntries.map(([key, value]) => (
            <div
              key={key}
              className='flex flex-row flex-wrap md:items-center gap-2 lg:gap-4 py-2.5 border-b border-border/20 last:border-b-0'
            >
              <span className='lg:min-w-[150px] font-semibold capitalize'>
                {capitalize(formatKey(key?.replace('_', ' ')))}
              </span>
              <span>:</span>
              <span className='flex-1'>{renderValue(key, value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default RenderData
