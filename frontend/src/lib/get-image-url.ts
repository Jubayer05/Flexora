export const validUrl = (url: string) => /^(https*|www\.)/gi.test(url)

export const getImgUrl = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return defaultImg({ width: 100, height: 100 })
  if (validUrl(url)) return url
  if (url === '/') return defaultImg({ width: 100, height: 100 })
  if (url.startsWith('/files')) {
    const base = process.env.NEXT_PUBLIC_BASE_API || ''
    return base ? `${base}${url}` : defaultImg({ width: 100, height: 100 })
  }
  return url
}

export function defaultImg({
  width = 1200,
  height = 400
}: {
  width: number
  height: number
}): string {
  // Base dimensions (designed ratio ~1.4166)
  const baseWidth = 512
  const baseHeight = 362

  // Calculate natural scale factors
  const scaleX = width / baseWidth
  const scaleY = height / baseHeight

  // Determine scale factor (max 0.5)
  const naturalScale = Math.min(scaleX, scaleY)
  const scale = Math.min(naturalScale, 0.1)

  // Calculate offsets to center the design
  const scaledWidth = baseWidth * scale
  const scaledHeight = baseHeight * scale
  const offsetX = (width - scaledWidth) / 2
  const offsetY = (height - scaledHeight) / 2

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" className="size-full h-full w-full object-cover" viewBox="0 0 ${width} ${height}" fill="#f3f4f6" role="img" aria-label="placeholder image">
      <rect width="${width}" height="${height}" fill="#f3f4f6" />
      <g transform="translate(${offsetX}, ${offsetY}) scale(${scale})">
        <!-- Frame -->
        <rect
          x="56" y="40"
          width="400" height="280"
          rx="22" ry="22"
          fill="#f3f4f6"
          stroke="#d0d4d6"
          stroke-width="10"
        />
        <!-- Inner Panel -->
        <rect
          x="86" y="70"
          width="340" height="200"
          rx="12" ry="12"
          fill="#eef0f1"
        />
        <!-- Mountain -->
        <path
          d="M92 270
             L168 186
             C176 176 192 176 200 186
             L256 242
             C264 250 280 250 288 242
             L360 192
             L420 270
             Z"
          fill="#b0b4b7"
        />
        <!-- Bottom Bar -->
        <rect x="86" y="260" width="340" height="28" rx="6" fill="#b0b4b7" />
        <!-- Sun -->
        <circle cx="372" cy="120" r="28" fill="#b0b4b7" />
      </g>
    </svg>
  `
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
