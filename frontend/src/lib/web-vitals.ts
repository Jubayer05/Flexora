// Add this to the page to measure and optimize LCP
export function measureWebVitals(metric: any) {
  if (metric.label === 'web-vital') {
    console.log(metric)
    // Send to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag.event(metric.name, {
        value: Math.round(metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      })
    }
  }
}
