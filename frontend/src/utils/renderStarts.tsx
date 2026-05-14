import { Star } from 'lucide-react'

export const renderStars = (rating: number, size?: number) => {
  return (
    <span className='flex gap-x-0.5'>
      {Array.from({ length: 5 }, (_, index) => {
        // const starValue = index + 1 // Star position (1-based index)
        const fillPercentage = Math.max(0, Math.min(1, rating - index)) // Get fill percentage (0 to 1)

        const dynamicSize = size ? `${size}px` : '14px'
        return (
          <span
            key={index}
            className='relative'
            style={{ width: dynamicSize, height: dynamicSize }}
          >
            {/* Gray Background Star */}
            <Star
              size={size || 16}
              className='absolute text-gray-400'
              strokeWidth={0}
              fill='#999'
            />

            {/* Colored Foreground Star with Clip */}
            <Star
              size={size || 16}
              className='absolute text-yellow-400'
              strokeWidth={0}
              fill='#fdc91b'
              style={{
                clipPath: `inset(0 ${(1 - fillPercentage) * 100}% 0 0)` // Clips star fill
              }}
            />
          </span>
        )
      })}
    </span>
  )
}
