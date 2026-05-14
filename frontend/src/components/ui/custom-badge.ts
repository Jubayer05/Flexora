export const getStatusColor = (status: string) => {
  const colors = {
    PENDING:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
    CONFIRMED:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    PARTIAL:
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
    COMPLETED:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    CANCELLED:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    REFUNDED:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20'
  }
  return colors[status as keyof typeof colors] || colors.PENDING
}

export const getDeliveryStatusColor = (status: string) => {
  const colors = {
    PENDING:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
    PROCESSING:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    PARTIAL:
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
    DELIVERED:
      'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
    FAILED:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
  }
  return colors[status as keyof typeof colors] || colors.PENDING
}
