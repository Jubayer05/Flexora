import { redirect } from 'next/navigation'

export default function BalanceManagementRedirectPage() {
  redirect('/admin/payment-settings/payment-gateways')
}
