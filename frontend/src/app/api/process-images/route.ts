import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

function randomInRange(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]
    const settingsStr = formData.get('settings') as string | null
    const titleStr = (formData.get('title') as string) || ''

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No images provided' },
        { status: 400 }
      )
    }

    let settings: {
      crop: { min: number; max: number }
      convertToWebP: boolean
      hue: { min: number; max: number }
      saturation: { min: number; max: number }
      brightness: { min: number; max: number }
      contrast: { min: number; max: number }
      rotation: { min: number; max: number }
      noise: { min: number; max: number }
      stripEXIF: boolean
      bypassMode?: boolean
    }
    try {
      settings = settingsStr
        ? (JSON.parse(settingsStr as string) as typeof settings)
        : {
            crop: { min: 2, max: 4 },
            convertToWebP: true,
            hue: { min: 10, max: 15 },
            saturation: { min: 5, max: 15 },
            brightness: { min: 3, max: 10 },
            contrast: { min: 5, max: 10 },
            rotation: { min: -1, max: 1 },
            noise: { min: 1, max: 2 },
            stripEXIF: true,
            bypassMode: false
          }
    } catch {
      settings = {
        crop: { min: 2, max: 4 },
        convertToWebP: true,
        hue: { min: 10, max: 15 },
        saturation: { min: 5, max: 15 },
        brightness: { min: 3, max: 10 },
        contrast: { min: 5, max: 10 },
        rotation: { min: -1, max: 1 },
        noise: { min: 1, max: 2 },
        stripEXIF: true,
        bypassMode: false
      }
    }

    const processedImages: {
      originalName: string
      newName: string
      data: string
      format: string
      size: number
    }[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!(file instanceof File)) continue

      const buffer = Buffer.from(await file.arrayBuffer())

      const metadata = await sharp(buffer).metadata()
      const width = metadata.width || 1920
      const height = metadata.height || 1080

      let targetWidth = width
      let targetHeight = height

      if (settings.bypassMode) {
        const aspectRatio = width / height
        if (width < 1920 || height < 1080) {
          if (aspectRatio > 16 / 9) {
            targetWidth = 1920
            targetHeight = Math.round(1920 / aspectRatio)
          } else {
            targetHeight = 1080
            targetWidth = Math.round(1080 * aspectRatio)
          }
        }
      }

      const cropPercent = randomInRange(settings.crop.min, settings.crop.max)
      const cropPixels = Math.floor((Math.min(width, height) * cropPercent) / 100)

      const left = Math.floor(Math.random() * Math.max(1, cropPixels))
      const top = Math.floor(Math.random() * Math.max(1, cropPixels))
      const extractWidth = Math.max(1, width - cropPixels)
      const extractHeight = Math.max(1, height - cropPixels)

      let image = sharp(buffer).extract({
        left: Math.min(left, width - extractWidth),
        top: Math.min(top, height - extractHeight),
        width: extractWidth,
        height: extractHeight
      })

      if (
        settings.bypassMode &&
        (targetWidth !== width || targetHeight !== height)
      ) {
        image = image.resize(targetWidth, targetHeight, {
          kernel: sharp.kernel.lanczos3,
          fit: 'cover'
        })
      }

      image = image.rotate(
        randomInRange(settings.rotation.min, settings.rotation.max),
        {
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      )

      if (settings.bypassMode) {
        image = image.modulate({
          brightness:
            1 +
            (randomInRange(settings.brightness.min, settings.brightness.max) +
              2) /
              100,
          saturation:
            1 +
            (randomInRange(settings.saturation.min, settings.saturation.max) +
              3) /
              100,
          hue: Math.min(
            360,
            Math.max(0, Math.floor(
              randomInRange(settings.hue.min, settings.hue.max) + 2
            ))
          )
        })
      } else {
        image = image.modulate({
          brightness:
            1 +
            randomInRange(settings.brightness.min, settings.brightness.max) /
              100,
          saturation:
            1 +
            randomInRange(settings.saturation.min, settings.saturation.max) /
              100,
          hue: Math.min(
            360,
            Math.max(0, Math.floor(randomInRange(settings.hue.min, settings.hue.max)))
          )
        })
      }

      const noiseAmount = randomInRange(settings.noise.min, settings.noise.max)
      if (settings.bypassMode) {
        image = image.sharpen({
          sigma: noiseAmount + 0.5,
          m1: 1.2,
          m2: 0.8
        })
      } else {
        image = image.sharpen(noiseAmount)
      }

      const contrastValue = randomInRange(
        settings.contrast.min,
        settings.contrast.max
      )
      if (settings.bypassMode) {
        image = image
          .linear(1 + (contrastValue + 2) / 100, 0)
          .gamma(1.1)
      } else {
        image = image.linear(1 + contrastValue / 100, 0)
      }

      if (settings.bypassMode) {
        image = image.sharpen({
          sigma: 1.5,
          m1: 0.8,
          m2: 0.3
        })
      }

      if (settings.stripEXIF) {
        image = image.withMetadata({
          exif: {},
          icc: undefined
        })
      }

      let processedBuffer: Buffer
      let format = 'jpg'

      if (settings.convertToWebP) {
        if (settings.bypassMode) {
          processedBuffer = await image
            .webp({
              quality: 88,
              effort: 6,
              smartSubsample: true,
              nearLossless: false,
              alphaQuality: 100
            })
            .toBuffer()
        } else {
          processedBuffer = await image.webp({ quality: 85 }).toBuffer()
        }
        format = 'webp'
      } else {
        if (settings.bypassMode) {
          processedBuffer = await image
            .jpeg({
              quality: 92,
              mozjpeg: true,
              chromaSubsampling: '4:4:4'
            })
            .toBuffer()
        } else {
          processedBuffer = await image.jpeg({ quality: 90 }).toBuffer()
        }
        format = 'jpg'
      }

      const baseName = titleStr?.trim() || file.name.replace(/\.[^/.]+$/, '')
      const newFileName = `${baseName}${files.length > 1 ? `-${i + 1}` : ''}.${format}`

      processedImages.push({
        originalName: file.name,
        newName: newFileName,
        data: processedBuffer.toString('base64'),
        format,
        size: processedBuffer.length
      })
    }

    return NextResponse.json({
      success: true,
      data: processedImages,
      count: processedImages.length
    })
  } catch (error) {
    console.error('Error processing images:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to process images'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
