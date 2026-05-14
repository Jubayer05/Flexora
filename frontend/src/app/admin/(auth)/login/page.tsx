import AdminLoginForm from '@/components/admin/form/Login'
import { Typography } from '@/components/common/typography'
import { Suspense } from 'react'

export const metadata = {
  title: 'Admin Login'
}

const AdminLoginPage = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="space-y-10 bg-card text-card-foreground border border-border shadow-primary/40 shadow-xl hover:shadow-primary/80 p-6 sm:p-10 rounded-lg w-full max-w-md">
        <div className="flex flex-col items-center gap-2">
          <Typography variant="h3" as="h3" weight="medium">
            Admin Login
          </Typography>
        </div>

        <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  )
}

export default AdminLoginPage