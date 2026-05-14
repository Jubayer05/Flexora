'use client'

import { Toaster } from '@/components/ui/sonner'
import { NuqsProvider } from './nuqs-provider'
import { ThemeProvider } from './theme-provider'

interface RootProvidersProps {
  children: React.ReactNode
}

const RootProviders: React.FC<RootProvidersProps> = ({ children }) => (
  <ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
    <NuqsProvider>{children}</NuqsProvider>
    <Toaster richColors closeButton position='bottom-right' />
  </ThemeProvider>
)

export default RootProviders
