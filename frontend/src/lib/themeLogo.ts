/** Dark-coloured logo — shown in light mode */
export const LOGO_FOR_LIGHT_MODE = '/images/logo-dark.webp'
/** Light/white logo — shown in dark mode */
export const LOGO_FOR_DARK_MODE = '/images/logo-white.webp'

export type ThemeLogoUrls = {
  default?: string | null
  dark?: string | null
}

export function resolveLogoSrc(src: string | null | undefined, fallback: string): string {
  if (!src) return fallback
  return src.startsWith('http') || src.startsWith('/') ? src : fallback
}

export function getLogosForThemeModes(urls: ThemeLogoUrls = {}) {
  return {
    forLightMode: resolveLogoSrc(urls.default, LOGO_FOR_LIGHT_MODE),
    forDarkMode: resolveLogoSrc(urls.dark, LOGO_FOR_DARK_MODE)
  }
}

export function getLogoSrcForTheme(theme: 'light' | 'dark', urls: ThemeLogoUrls = {}) {
  const { forLightMode, forDarkMode } = getLogosForThemeModes(urls)
  return theme === 'dark' ? forDarkMode : forLightMode
}

export function preloadLogo(src: string) {
  if (typeof window === 'undefined' || !src) return
  const img = new window.Image()
  img.src = src
}

export const THEME_LOGO_CHANGE_EVENT = 'theme-logo-change'

export function dispatchThemeLogoChange(theme: 'light' | 'dark', src: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(THEME_LOGO_CHANGE_EVENT, { detail: { theme, src } }))
}
