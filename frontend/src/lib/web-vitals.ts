// Add this to the page to measure and optimize LCP
export function measureWebVitals(metric: any) {
  if (metric.label === 'web-vital') {
    console.log(metric)
    // Send to analytics
    const gtag = typeof window !== 'undefined' ? (window as Window & { gtag?: (...args: unknown[]) => void }).gtag : undefined
    if (gtag) {
      gtag('event', metric.name, {
        value: Math.round(metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      })
    }
  }
}
