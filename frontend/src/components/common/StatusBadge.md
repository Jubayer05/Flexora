# StatusBadge Component (CVA-Powered)

A smart, single status rendering component built with **Class Variance Authority (CVA)** that automatically detects status types and renders them with appropriate colors and styling. This component provides type-safe variant management and intelligent handling of all status types defined in `index.d.ts`.

## Features

- 🤖 **Auto-Detection**: Automatically detects status type from the value
- ⚡ **CVA-Powered**: Built with Class Variance Authority for type-safe variants
- ✅ **Supports all status enums** from `index.d.ts`
- 🎨 **Consistent color coding** based on status semantics
- 🔄 **Multiple display variants** (pill, badge, minimal)
- 📱 **Responsive and accessible** design
- 🔒 **Type-safe** with TypeScript
- 🎯 **Single component** for all status rendering
- 🧠 **Intelligent class composition** with `cn()` utility

## CVA Benefits

Using Class Variance Authority provides:

- **Type Safety**: Compile-time checks for valid variant combinations
- **Performance**: Optimized class concatenation and deduplication
- **Maintainability**: Centralized variant definitions
- **IntelliSense**: Full autocomplete support for all variants
- **Consistency**: Ensures uniform styling across the application

## Basic Usage

### Import

```tsx
import StatusBadge from '@/components/common/StatusBadge'
```

### Simple Usage (Recommended)

```tsx
// Auto-detection handles everything
<StatusBadge status="ACTIVE" />
<StatusBadge status="PENDING" />
<StatusBadge status="COMPLETED" />
<StatusBadge status="FAILED" />
```

### With Variants

```tsx
// Different display styles with CVA variants
<StatusBadge status="ACTIVE" variant="pill" />    // Default: rounded-full
<StatusBadge status="ACTIVE" variant="badge" />   // Square corners
<StatusBadge status="ACTIVE" variant="minimal" /> // Subtle styling
```

### With Custom Classes

```tsx
// CVA automatically handles class merging and deduplication
<StatusBadge status='URGENT' variant='badge' className='animate-pulse shadow-lg hover:scale-105' />
```

## CVA Variant System

The component uses CVA's powerful variant system:

```tsx
const statusBadgeVariants = cva(
  // Base classes applied to all variants
  'inline-flex items-center text-xs font-medium',
  {
    variants: {
      // Display variants
      variant: {
        pill: 'px-2.5 py-0.5 rounded-full border',
        badge: 'px-2 py-1 rounded border',
        minimal: 'px-1 py-0.5 rounded'
      },
      // Status-specific colors (auto-mapped from status values)
      status: {
        active: 'bg-green-100 text-green-800 border-green-300',
        pending: 'bg-amber-100 text-amber-800 border-amber-300',
        failed: 'bg-red-100 text-red-800 border-red-300'
        // ... all status variants
      }
    },
    defaultVariants: {
      variant: 'pill',
      status: 'default'
    }
  }
)
```

## Auto-Detection & Mapping

The component intelligently maps status strings to CVA variants:

```tsx
// Input status → CVA variant → Visual result
"ACTIVE"             → "active"          → Green pill
"IN_PROGRESS"        → "in_progress"     → Blue pill
"VERIFICATION_REQUIRED" → "verification_required" → Yellow pill
```

## Supported Status Types

All enum types from `index.d.ts` are automatically supported with proper CVA mapping:

| Status Input                                | CVA Variant                  | Colors                        | Type Context |
| ------------------------------------------- | ---------------------------- | ----------------------------- | ------------ |
| `ACTIVE`, `INACTIVE`, `EXPIRED`, `DEPLETED` | `active`, `inactive`, etc.   | Green, Gray, Red, Amber       | Coupon       |
| `PENDING`, `CONFIRMED`, `COMPLETED`         | `pending`, `confirmed`, etc. | Amber, Blue, Green            | Order        |
| `FAILED`                                    | `failed`                     | Red                           | Payment      |
| `PROCESSING`, `DELIVERED`                   | `processing`, `delivered`    | Blue, Green                   | Delivery     |
| `VERIFICATION_REQUIRED`                     | `verification_required`      | Yellow                        | Telegram     |
| `OPEN`, `IN_PROGRESS`, `RESOLVED`           | `open`, `in_progress`, etc.  | Amber, Blue, Green            | Ticket       |
| `LOW`, `MEDIUM`, `HIGH`, `URGENT`           | `low`, `medium`, etc.        | Green, Yellow, Orange, Red    | Priority     |
| `ADMIN`, `MODERATOR`, `CUSTOMER`            | `admin`, `moderator`, etc.   | Purple, Blue, Green           | User Role    |
| `NEW`, `ELITE`, `VIP`, `MASTER`             | `new`, `elite`, etc.         | Slate, Indigo, Purple, Yellow | User Rank    |

## Table Column Usage

### Auto-Detection (Recommended)

```tsx
const columns = [
  {
    key: 'status',
    header: 'Status',
    render: (value) => <StatusBadge status={value} />,
    width: 'w-56'
  },
  {
    key: 'priority',
    header: 'Priority',
    render: (value) => <StatusBadge status={value} variant='badge' />,
    width: 'w-32'
  }
]
```

### With CVA Customization

```tsx
{
  key: 'status',
  header: 'Status',
  render: (value) => (
    <StatusBadge
      status={value}
      variant="minimal"
      className="font-semibold tracking-wide"
    />
  ),
  width: 'w-40'
}
```

## API Reference

### StatusBadge Props

| Prop        | Type                             | Default  | Description                              |
| ----------- | -------------------------------- | -------- | ---------------------------------------- |
| `status`    | `string`                         | -        | **Required.** The status value to render |
| `variant`   | `'pill' \| 'badge' \| 'minimal'` | `'pill'` | CVA display variant                      |
| `className` | `string`                         | `''`     | Additional classes (merged with CVA)     |

### CVA Variants

```tsx
type StatusBadgeVariants = {
  variant?: 'pill' | 'badge' | 'minimal'
  status?: 'active' | 'pending' | 'failed' | /* ...all mapped statuses */
}
```

## Advanced Usage

### Class Merging & Overrides

CVA and `cn()` utility handle intelligent class merging:

```tsx
// Classes are properly merged and deduplicated
<StatusBadge
  status="URGENT"
  className="border-2 border-red-500 font-bold animate-bounce"
/>

// Custom colors override CVA defaults safely
<StatusBadge
  status="CUSTOM"
  className="bg-gradient-to-r from-purple-400 to-pink-400"
/>
```

### Dynamic Variants

```tsx
// CVA variants can be computed dynamically
const getVariantForPriority = (priority: string) => {
  return priority === 'URGENT' ? 'badge' : 'pill'
}

;<StatusBadge status={ticket.priority} variant={getVariantForPriority(ticket.priority)} />
```

## Type Safety

CVA provides excellent TypeScript support:

```tsx
// ✅ Valid - TypeScript knows these are valid variants
<StatusBadge status="ACTIVE" variant="pill" />

// ❌ Invalid - TypeScript will catch this
<StatusBadge status="ACTIVE" variant="invalid" /> // Type error

// ✅ IntelliSense will suggest all valid variants
<StatusBadge status="ACTIVE" variant="..." /> // Shows pill | badge | minimal
```

## Performance Benefits

CVA optimizations include:

- **Class Deduplication**: Removes duplicate Tailwind classes automatically
- **Conditional Logic**: Efficient variant selection without complex conditions
- **Bundle Size**: Tree-shaking removes unused variants
- **Runtime Performance**: Pre-computed class combinations

## Migration Guide

### From Manual Class Concatenation

```tsx
// Before - Manual string interpolation
const getStatusClasses = (status: string, variant: string) => {
  const base = 'inline-flex items-center text-xs font-medium'
  const variantClasses = variant === 'pill' ? 'px-2.5 py-0.5 rounded-full' : 'px-2 py-1 rounded'
  const statusClasses = status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
  return `${base} ${variantClasses} ${statusClasses}`
}

// After - CVA-powered
import StatusBadge from './StatusBadge'
;<StatusBadge status='ACTIVE' variant='pill' />
```

### From Previous StatusRenderer

```tsx
// Before
import StatusBadge from '@/components/common/StatusRenderer'

// After
import StatusBadge from '@/components/common/StatusBadge'
// Usage remains the same - just better performance and type safety!
```

## Examples

See `StatusRendererDemo.tsx` for comprehensive examples of CVA variants, auto-detection, and advanced usage patterns.

## Technical Details

- **CVA Version**: Uses the latest Class Variance Authority features
- **Class Merging**: Integrated with `tailwind-merge` via `cn()` utility
- **Bundle Impact**: Minimal - only includes used variants
- **Browser Support**: Works in all modern browsers
