import AccessDenied from '@/components/common/AccessDenied'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Access Denied - UHQ Account',
  description: 'You do not have permission to access this resource.',
  robots: 'noindex, nofollow'
}

interface AccessDeniedPageProps {
  searchParams: Promise<{
    reason?: string
    redirect?: string
  }>
}

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const { reason, redirect } = await searchParams

  // Default messages based on reason
  const getErrorMessage = (reason?: string): string => {
    switch (reason) {
      case 'insufficient_permissions':
        return 'You don&apos;t have sufficient permissions to access this resource.'
      case 'role_required':
        return 'This action requires a specific role that you don&apos;t currently have.'
      case 'resource_restricted':
        return 'Access to this resource is restricted.'
      case 'action_forbidden':
        return 'You are not authorized to perform this action.'
      default:
        return reason || 'You don&apos;t have the required permissions to access this page.'
    }
  }

  return (
    <AccessDenied
      title='Access Denied'
      message={getErrorMessage(reason)}
      redirectPath={redirect || '/'}
    />
  )
}
