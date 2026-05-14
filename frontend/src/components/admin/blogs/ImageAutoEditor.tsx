'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Download, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export type ProcessedImage = {
  format: string
  data: string
  newName: string
  size: number
}

type ProcessImagesResponse = {
  success?: boolean
  data?: ProcessedImage[]
  count?: number
  error?: string
}

export default function ImageAutoEditor() {
  const [images, setImages] = useState<File[]>([])
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const [cropMin, setCropMin] = useState(2)
  const [cropMax, setCropMax] = useState(4)
  const [convertToWebP, setConvertToWebP] = useState(true)
  const [hueMin, setHueMin] = useState(10)
  const [hueMax, setHueMax] = useState(15)
  const [saturationMin, setSaturationMin] = useState(5)
  const [saturationMax, setSaturationMax] = useState(15)
  const [brightnessMin, setBrightnessMin] = useState(3)
  const [brightnessMax, setBrightnessMax] = useState(10)
  const [contrastMin, setContrastMin] = useState(5)
  const [contrastMax, setContrastMax] = useState(10)
  const [rotationMin, setRotationMin] = useState(-1)
  const [rotationMax, setRotationMax] = useState(1)
  const [noiseMin, setNoiseMin] = useState(1)
  const [noiseMax, setNoiseMax] = useState(2)
  const [stripEXIF, setStripEXIF] = useState(true)
  const [bypassMode, setBypassMode] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const fileArray = Array.from(files)
    setImages(fileArray)
    setProcessedImages([])
  }

  const applyBypassMode = (enabled: boolean) => {
    setBypassMode(enabled)
    if (enabled) {
      setCropMin(3)
      setCropMax(5)
      setHueMin(15)
      setHueMax(25)
      setSaturationMin(15)
      setSaturationMax(25)
      setBrightnessMin(8)
      setBrightnessMax(15)
      setContrastMin(10)
      setContrastMax(18)
      setRotationMin(-2)
      setRotationMax(2)
      setNoiseMin(2)
      setNoiseMax(3)
      setConvertToWebP(true)
      setStripEXIF(true)
    } else {
      setCropMin(2)
      setCropMax(4)
      setHueMin(10)
      setHueMax(15)
      setSaturationMin(5)
      setSaturationMax(15)
      setBrightnessMin(3)
      setBrightnessMax(10)
      setContrastMin(5)
      setContrastMax(10)
      setRotationMin(-1)
      setRotationMax(1)
      setNoiseMin(1)
      setNoiseMax(2)
    }
  }

  const handleProcess = async () => {
    if (images.length === 0) {
      toast.error('Please upload images first')
      return
    }
    try {
      setLoading(true)
      const formData = new FormData()
      images.forEach((image) => formData.append('images', image))
      const settings = {
        crop: { min: cropMin, max: cropMax },
        convertToWebP,
        hue: { min: hueMin, max: hueMax },
        saturation: { min: saturationMin, max: saturationMax },
        brightness: { min: brightnessMin, max: brightnessMax },
        contrast: { min: contrastMin, max: contrastMax },
        rotation: { min: rotationMin, max: rotationMax },
        noise: { min: noiseMin, max: noiseMax },
        stripEXIF,
        bypassMode
      }
      formData.append('settings', JSON.stringify(settings))
      formData.append('title', title)

      const response = await fetch('/api/process-images', {
        method: 'POST',
        body: formData
      })

      const contentType = response.headers.get('content-type')
      const isJson = contentType?.includes('application/json')
      const text = await response.text()

      let result: ProcessImagesResponse | null = null
      if (isJson || text.startsWith('{')) {
        try {
          result = JSON.parse(text) as ProcessImagesResponse
        } catch {
          result = null
        }
      }

      if (!result) {
        if (response.status === 404) {
          toast.error(
            'Image processing API is not set up yet. Add the /api/process-images endpoint to enable processing.'
          )
        } else if (!response.ok) {
          toast.error(
            `Failed to process images. Server error (${response.status}). The /api/process-images endpoint may not exist or may have crashed.`
          )
        } else {
          toast.error(
            'Failed to process images. The server returned an invalid response. Check that /api/process-images returns JSON.'
          )
        }
        return
      }

      if (result.success) {
        setProcessedImages(result.data ?? [])
        const count = result.count ?? result.data?.length ?? 0
        toast.success(`Successfully processed ${count} image${count === 1 ? '' : 's'}!`)
      } else {
        toast.error(result.error || 'Failed to process images')
      }
    } catch (error) {
      console.error('Error processing images:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to process images. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = (image: ProcessedImage) => {
    const link = document.createElement('a')
    link.href = `data:image/${image.format};base64,${image.data}`
    link.download = image.newName
    link.click()
  }

  const downloadAll = () => {
    processedImages.forEach((image, i) => {
      setTimeout(() => downloadImage(image), i * 100)
    })
  }

  const clearImages = () => {
    setImages([])
    setProcessedImages([])
  }

  const inputClass =
    'w-full px-3 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed'

  const labelClass = 'text-sm font-medium text-foreground'

  return (
    <div className='rounded-xl border border-border bg-card p-6 shadow-sm'>
      <h2 className='text-2xl font-bold text-foreground mb-6'>Image Auto Editor</h2>

      <div className='space-y-6'>
        {/* Image Upload */}
        <div>
          <Label className={labelClass}>Upload Images</Label>
          <div className='flex flex-wrap gap-4 items-center mt-2'>
            <Button variant='default' size='default' asChild>
              <label className='cursor-pointer inline-flex items-center gap-2'>
                <Upload className='size-4' />
                Choose Images
                <input
                  type='file'
                  multiple
                  accept='image/*'
                  onChange={handleImageUpload}
                  className='hidden'
                />
              </label>
            </Button>
            {images.length > 0 && (
              <span className='text-muted-foreground text-sm'>
                {images.length} image(s) selected
              </span>
            )}
            {images.length > 0 && (
              <Button
                type='button'
                variant='destructive'
                size='default'
                onClick={clearImages}
                className='gap-2'
              >
                <Trash2 className='size-4' />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Title for naming */}
        <div>
          <Label htmlFor='image-base-name' className={labelClass}>
            Base Name for Images
          </Label>
          <Input
            id='image-base-name'
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className='mt-2'
            placeholder='e.g., How to use buy a telegram account'
          />
          <p className='text-xs text-muted-foreground mt-1'>
            Images will be named: {title || 'base-name'}.{convertToWebP ? 'webp' : 'jpg'}
          </p>
        </div>

        {/* Processing Settings */}
        <div className='rounded-lg border border-border bg-muted/30 p-4 sm:p-6 space-y-4'>
          <h3 className='text-lg font-semibold text-foreground'>Processing Settings</h3>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <Label className={labelClass}>Crop (%)</Label>
              <div className='flex gap-2 mt-2'>
                <Input
                  type='number'
                  value={cropMin}
                  onChange={(e) => setCropMin(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Min'
                  step={0.1}
                  disabled={bypassMode}
                />
                <Input
                  type='number'
                  value={cropMax}
                  onChange={(e) => setCropMax(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Max'
                  step={0.1}
                  disabled={bypassMode}
                />
              </div>
            </div>

            <div>
              <Label className={labelClass}>Hue Shift</Label>
              <div className='flex gap-2 mt-2'>
                <Input
                  type='number'
                  value={hueMin}
                  onChange={(e) => setHueMin(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Min'
                />
                <Input
                  type='number'
                  value={hueMax}
                  onChange={(e) => setHueMax(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Max'
                />
              </div>
            </div>

            <div>
              <Label className={labelClass}>Saturation (%)</Label>
              <div className='flex gap-2 mt-2'>
                <Input
                  type='number'
                  value={saturationMin}
                  onChange={(e) => setSaturationMin(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Min'
                />
                <Input
                  type='number'
                  value={saturationMax}
                  onChange={(e) => setSaturationMax(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Max'
                />
              </div>
            </div>

            <div>
              <Label className={labelClass}>Brightness (%)</Label>
              <div className='flex gap-2 mt-2'>
                <Input
                  type='number'
                  value={brightnessMin}
                  onChange={(e) => setBrightnessMin(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Min'
                />
                <Input
                  type='number'
                  value={brightnessMax}
                  onChange={(e) => setBrightnessMax(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Max'
                />
              </div>
            </div>

            <div>
              <Label className={labelClass}>Contrast (%)</Label>
              <div className='flex gap-2 mt-2'>
                <Input
                  type='number'
                  value={contrastMin}
                  onChange={(e) => setContrastMin(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Min'
                />
                <Input
                  type='number'
                  value={contrastMax}
                  onChange={(e) => setContrastMax(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Max'
                />
              </div>
            </div>

            <div>
              <Label className={labelClass}>Rotation (degrees)</Label>
              <div className='flex gap-2 mt-2'>
                <Input
                  type='number'
                  value={rotationMin}
                  onChange={(e) => setRotationMin(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Min'
                  step={0.1}
                />
                <Input
                  type='number'
                  value={rotationMax}
                  onChange={(e) => setRotationMax(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Max'
                  step={0.1}
                />
              </div>
            </div>

            <div>
              <Label className={labelClass}>Noise (%)</Label>
              <div className='flex gap-2 mt-2'>
                <Input
                  type='number'
                  value={noiseMin}
                  onChange={(e) => setNoiseMin(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Min'
                  step={0.1}
                />
                <Input
                  type='number'
                  value={noiseMax}
                  onChange={(e) => setNoiseMax(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  placeholder='Max'
                  step={0.1}
                />
              </div>
            </div>
          </div>

          <div className='space-y-3 pt-4'>
            <label className='flex items-center gap-3 cursor-pointer'>
              <Checkbox
                checked={convertToWebP}
                onCheckedChange={(checked) => setConvertToWebP(checked === true)}
              />
              <span className='text-sm text-muted-foreground'>Convert to WebP format</span>
            </label>
            <label className='flex items-center gap-3 cursor-pointer'>
              <Checkbox
                checked={stripEXIF}
                onCheckedChange={(checked) => setStripEXIF(checked === true)}
              />
              <span className='text-sm text-muted-foreground'>Strip EXIF metadata</span>
            </label>
          </div>
        </div>

        {/* Bypass Mode Toggle */}
        <div
          className={cn(
            'rounded-lg border-2 p-5',
            'bg-primary/5 border-primary/30 dark:bg-primary/10 dark:border-primary/40'
          )}
        >
          <div className='flex items-start gap-4'>
            <div className='flex items-center h-6 pt-0.5'>
              <Checkbox
                id='bypassMode'
                checked={bypassMode}
                onCheckedChange={(checked) => applyBypassMode(checked === true)}
                className='size-5'
              />
            </div>
            <div className='flex-1 min-w-0'>
              <Label
                htmlFor='bypassMode'
                className='font-bold text-foreground cursor-pointer flex items-center gap-2 text-lg'
              >
                <span>Bypass Mode</span>
                <span
                  className={cn(
                    'text-xs px-3 py-1 rounded-full font-semibold',
                    bypassMode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {bypassMode ? 'ON' : 'OFF'}
                </span>
              </Label>
              <div className='mt-2 space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  {bypassMode ? (
                    <span className='text-primary'>
                      Supercharged mode active — Processing Settings + hidden backend boosts
                    </span>
                  ) : (
                    <span>
                      Adds hidden backend optimizations on top of your Processing Settings for SEO
                      dominance
                    </span>
                  )}
                </p>
                <div className='text-xs text-muted-foreground space-y-1'>
                  <p>✓ Applies all Processing Settings above (Crop, Hue, Saturation, etc.)</p>
                  <p>✓ PLUS: Auto-upscale to Full HD (1920x1080) without increasing file size</p>
                  <p>✓ PLUS: Enhanced color vibrancy (+2–3% bonus on top of your settings)</p>
                  <p>✓ PLUS: Professional multi-stage sharpening with blur reduction</p>
                  <p>✓ PLUS: Gamma correction (1.1) for depth and visual pop</p>
                  <p>✓ PLUS: Advanced compression (MozJPEG 92%, WebP effort 6)</p>
                  <p>✓ Optimized for 100K+ daily traffic and maximum CTR</p>
                </div>
                {bypassMode && (
                  <div className='mt-3 p-3 rounded border border-primary/30 bg-primary/10 dark:bg-primary/15 space-y-2'>
                    <p className='text-xs font-semibold text-foreground mb-2'>
                      Hidden Backend Boosts (Applied on top of Processing Settings):
                    </p>
                    <div className='text-xs text-muted-foreground space-y-1 pl-3'>
                      <p>• Full HD upscaling (1920x1080) with Lanczos3 interpolation</p>
                      <p>• +2–3% color bonus on top of visible settings</p>
                      <p>• Gamma correction (1.1) for visual depth</p>
                      <p>• Advanced sharpening (multi-stage with unsharp mask)</p>
                      <p>• MozJPEG compression (92% quality, 4:4:4 chroma)</p>
                      <p>• WebP effort 6 with smart subsampling</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Process & Download */}
        <div className='flex flex-wrap gap-4'>
          <Button
            onClick={handleProcess}
            disabled={loading || images.length === 0}
            className='gap-2'
          >
            {loading ? 'Processing...' : 'Process Images'}
          </Button>
          {processedImages.length > 0 && (
            <Button
              variant='outline'
              onClick={downloadAll}
              className='gap-2 border-border bg-background hover:bg-muted/50'
            >
              <Download className='size-4' />
              Download All
            </Button>
          )}
        </div>

        {/* Processed Images Preview */}
        {processedImages.length > 0 && (
          <div className='rounded-lg border border-border bg-muted/30 p-6'>
            <h3 className='text-lg font-semibold text-foreground mb-4'>
              Processed Images ({processedImages.length})
            </h3>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {processedImages.map((image, index) => (
                <div
                  key={`${image.newName}-${index}`}
                  className='space-y-2 rounded-lg border border-border bg-card p-2'
                >
                  <img
                    src={`data:image/${image.format};base64,${image.data}`}
                    alt={image.newName}
                    className='w-full h-32 object-cover rounded-md border border-border'
                  />
                  <p className='text-xs text-foreground truncate' title={image.newName}>
                    {image.newName}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {(image.size / 1024).toFixed(2)} KB
                  </p>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => downloadImage(image)}
                    className='w-full gap-2 border-border'
                  >
                    <Download className='size-3.5' />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
