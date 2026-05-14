/**
 * Slug Utility Functions
 *
 * Provides utilities for converting text to URL-friendly slugs
 * with support for real-time space-to-dash conversion
 */

/**
 * Converts text to a URL-friendly slug format
 *
 * @param text - The input text to convert
 * @param options - Configuration options
 * @returns A URL-friendly slug string
 *
 * @example
 * convertToSlug('My Category Name') // 'my-category-name'
 * convertToSlug('Product_Category') // 'product-category'
 * convertToSlug('Special!@#Characters') // 'specialcharacters'
 */
export const convertToSlug = (
  text: string | number | null | undefined,
  options: {
    allowSpaces?: boolean
    realTime?: boolean
    style?: 'kebab' | 'compact'
  } = {}
): string => {
  const { allowSpaces = false, realTime = false, style = 'kebab' } = options

  // Handle non-string inputs
  if (!text) return ''
  if (typeof text !== 'string') {
    text = String(text)
  }

  const input = text.trim()

  if (!input) return ''

  if (style === 'compact') {
    const compact = input
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')

    return compact
  }

  let result = input.toLowerCase()

  if (realTime && allowSpaces) {
    // Real-time conversion: allow spaces temporarily but sanitize other chars
    result = result
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters but keep spaces temporarily
      .replace(/\s+/g, '-') // Convert spaces (single or multiple) to single dash
      .replace(/-+/g, '-') // Replace multiple consecutive dashes with single dash
      .replace(/^-+|-+$/g, '') // Remove leading and trailing dashes
  } else {
    // Standard conversion: convert everything to final slug format
    result = result
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space first
      .replace(/[\s_]/g, '-') // Convert spaces and underscores to hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove special characters except hyphens
      .replace(/-+/g, '-') // Replace multiple consecutive hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
  }

  return result
}

/**
 * Creates a slug change handler for form inputs that converts spaces to dashes in real-time
 *
 * @param onChange - The form field onChange callback
 * @returns A function that handles input changes with slug conversion
 *
 * @example
 * const handleSlugChange = createSlugChangeHandler(field.onChange)
 * <input onChange={(e) => handleSlugChange(e.target.value)} />
 */
export const createSlugChangeHandler = (onChange: (value: string) => void) => {
  return (
    value: string,
    options?: {
      style?: 'kebab' | 'compact'
    }
  ) => {
    const slugValue = convertToSlug(value, {
      allowSpaces: true,
      realTime: true,
      style: options?.style
    })
    onChange(slugValue)
  }
}

/**
 * Creates a name change handler that auto-generates slug from name
 *
 * @param nameOnChange - The name field onChange callback
 * @param setSlugValue - Function to set the slug field value
 * @param options - Configuration options
 * @returns A function that handles name changes with auto-slug generation
 *
 * @example
 * const handleNameChange = createNameChangeHandler(
 *   field.onChange,
 *   (slug) => setValue('slug', slug),
 *   { skipIfEditing: isEditing && initialValues?.slug }
 * )
 */
export const createNameChangeHandler = (
  nameOnChange: (value: string) => void,
  setSlugValue: (slug: string) => void,
  options: {
    skipIfEditing?: boolean
    style?: 'kebab' | 'compact'
  } = {}
) => {
  return (value: string) => {
    nameOnChange(value)

    // Auto-generate slug only if not skipping
    if (!options.skipIfEditing) {
      const slug = convertToSlug(value, { style: options.style })
      setSlugValue(slug)
    }
  }
}
