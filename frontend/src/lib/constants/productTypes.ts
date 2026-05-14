/**
 * Product Type Constants and Options
 *
 * Simplified for real physical products
 */

// Product Type Values - empty for now, can be customized for real products
export const PRODUCT_TYPE_VALUES = {} as const

export const PRODUCT_PLATFORM_VALUES = {
  OTHER: 'OTHER'
} as const

// Product Platform Labels for UI display
export const PRODUCT_PLATFORM_LABELS = {
  [PRODUCT_PLATFORM_VALUES.OTHER]: 'Other Platform'
} as const

// Product Type Labels for UI display - empty for real products
export const PRODUCT_TYPE_LABELS = {} as const

// Platform Type Options for Select components
export const PRODUCT_PLATFORM_OPTIONS = [
  {
    value: PRODUCT_PLATFORM_VALUES.OTHER,
    label: PRODUCT_PLATFORM_LABELS[PRODUCT_PLATFORM_VALUES.OTHER]
  }
]

// Product Type Options for Select components - empty for real products
export const PRODUCT_TYPE_OPTIONS = []

// Product Type Options for editing - empty for real products
export const PRODUCT_TYPE_OPTIONS_EDIT = []

// Type for product type values
export type ProductTypeValue = never

// Helper function to get product type label
export const getProductTypeLabel = (_type: ProductTypeValue): string => {
  return ''
}

// Helper function to get product type options based on context
export const getProductTypeOptions = (_isEditing?: boolean) => {
  return PRODUCT_TYPE_OPTIONS
}

// Helper function to get product type filter options (for frontend filtering)
export const getProductTypeFilterOptions = () => {
  return PRODUCT_TYPE_OPTIONS
}

// Legacy product types array - empty for real products
export const productTypes = []