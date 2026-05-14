import { redirect } from 'next/navigation'

export default function AdminPage() {
  return redirect('/admin/dashboard') // Redirect to the dashboard page
}
