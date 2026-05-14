'use client'

import { LucideProps } from 'lucide-react'
import { DynamicIcon } from 'lucide-react/dynamic'
import dynamicIconImports from 'lucide-react/dynamicIconImports'

export interface IconProps extends LucideProps {
  name: keyof typeof dynamicIconImports
  fallback?: () => React.ReactNode
}

const Icon = ({ name, fallback, ...props }: IconProps) => {
  if (!dynamicIconImports[name]) {
    return <DynamicIcon name={'help-circle'} strokeWidth={1.2} {...props} />
  }

  return (
    <DynamicIcon
      name={name}
      {...props}
      fallback={
        fallback ??
        (() => (
          <span
            className='inline-block bg-transparent'
            style={{
              width: props.size || '22px',
              height: props.size || '22px'
            }}
          />
        ))
      }
    />
  )
}

export default Icon
