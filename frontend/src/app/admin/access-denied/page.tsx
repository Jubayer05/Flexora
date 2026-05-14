import AccessDenied from '@/components/common/AccessDenied'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Access Denied - Admin Panel',
  description: 'You do not have permission to access this admin resource.',
  robots: 'noindex, nofollow'
}

interface AdminAccessDeniedPageProps {
  searchParams: Promise<{
    reason?: string
    redirect?: string
  }>
}

export default async function AdminAccessDeniedPage({ searchParams }: AdminAccessDeniedPageProps) {
  const { reason, redirect } = await searchParams

  // Admin-specific error messages
  const getErrorMessage = (reason?: string): string => {
    switch (reason) {
      case 'admin_required':
        return 'Administrative privileges are required to access this section.'
      case 'super_admin_required':
        return 'Super administrator access is required for this operation.'
      case 'module_restricted':
        return 'Access to this admin module is restricted based on your role.'
      case 'feature_disabled':
        return 'This administrative feature is currently disabled for your account.'
      default:
        return reason || 'You don&apos;t have the required administrative permissions.'
    }
  }

  return (
    <AccessDenied
      title='Admin Access Denied'
      message={getErrorMessage(reason)}
      redirectPath={redirect || '/admin/dashboard'}
      showBackButton={true}
      showHomeButton={true}
    />
  )
}
