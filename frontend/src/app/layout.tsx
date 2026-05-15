import { getFacebookPixelId, getSiteConfig } from '@/action/data'
import { AuthProvider } from '@/components/providers/auth-provider'
import { SiteProvider } from '@/components/providers/store-provider'
import { buildSiteMetadata } from '@/lib/seo/metaBuilders'
import { getLogosForThemeModes } from '@/lib/themeLogo'
import { toAbsoluteSeoMediaUrl } from '@/lib/seo/url'
import type { Metadata } from 'next'
import { Bebas_Neue, JetBrains_Mono, Outfit } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

// Force dynamic rendering - avoids static prerender conflicts with API fetches during Vercel build
export const dynamic = 'force-dynamic'

// Load fonts using Next.js font optimization
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
  preload: true
})

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-headline',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
  preload: true
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['monospace'],
  preload: true
})

export async function generateMetadata(): Promise<Metadata> {
  try {
    const data = await getSiteConfig()
    return buildSiteMetadata(data)
  } catch (error) {
    console.error('Failed to generate metadata:', error)
    return buildSiteMetadata(null)
  }
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  let siteConfig: any = null

  try {
    siteConfig = await getSiteConfig()
  } catch (error) {
    console.error('Failed to load site config:', error)
    // Continue with null siteConfig - app should still work
  }
  const pixelId = await getFacebookPixelId()
  const { forLightMode, forDarkMode } = getLogosForThemeModes(siteConfig?.logo ?? {})
  const logoPreloadLight = forLightMode.startsWith('/')
    ? forLightMode
    : toAbsoluteSeoMediaUrl(forLightMode)
  const logoPreloadDark = forDarkMode.startsWith('/')
    ? forDarkMode
    : toAbsoluteSeoMediaUrl(forDarkMode)

  return (
    <html lang='en' suppressHydrationWarning className='bg-background'>
      <head>
        {/* Viewport optimization for mobile */}
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='mobile-web-app-capable' content='yes' />
        <meta name='apple-mobile-web-app-capable' content='yes' />

        {/* Preload both theme logos for instant theme switching */}
        <link rel='preload' as='image' href={logoPreloadLight} fetchPriority='high' />
        <link rel='preload' as='image' href={logoPreloadDark} fetchPriority='high' />

        {/* Google Fonts */}
        <link
          href='https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@500;600&display=swap'
          rel='stylesheet'
        />
        <link
          href='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap'
          rel='stylesheet'
        />
      </head>
      <body
        className={`${outfit.variable} ${bebasNeue.variable} ${jetbrainsMono.variable} font-outfit antialiased bg-background`}
        suppressHydrationWarning
      >
        {/* Google Translate config + loader (global) */}
        <Script
          id='translation-config'
          strategy='beforeInteractive'
          dangerouslySetInnerHTML={{
            __html: `
              window.__GOOGLE_TRANSLATION_CONFIG__ = {
                languages: [
                  { name: "en", title: "English" },
                  { name: "sv", title: "Swedish" },
                  { name: "no", title: "Norwegian" },
                  { name: "da", title: "Danish" },
                  { name: "fi", title: "Finnish" },
                  { name: "fr", title: "French" },
                  { name: "de", title: "German" },
                  { name: "es", title: "Spanish" },
                  { name: "it", title: "Italian" },
                  { name: "ru", title: "Russian" },
                  { name: "tr", title: "Turkish" },
                  { name: "ar", title: "Arabic" },
                  { name: "hi", title: "Hindi" },
                  { name: "zh", title: "Chinese" },
                  { name: "bn", title: "Bengali" },
                ],
                defaultLanguage: "en",
              };

              (function () {
                const COOKIE_NAME = "googtrans";
                const isIpAddress = (host) => /^\\d{1,3}(\\.\\d{1,3}){3}$/.test(host);
                const getDomainCandidates = () => {
                  if (typeof window === "undefined") return [undefined];
                  const host = window.location.hostname;
                  if (!host || host === "localhost" || isIpAddress(host)) return [undefined];
                  const parts = host.split(".");
                  const domains = new Set([undefined, host]);
                  for (let i = 1; i < parts.length; i += 1) domains.add("." + parts.slice(i).join("."));
                  return Array.from(domains);
                };
                const setLanguageCookie = (value) => {
                  if (typeof document === "undefined") return;
                  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
                  getDomainCandidates().forEach((domain) => {
                    const domainSegment = domain ? ";domain=" + domain : "";
                    document.cookie = COOKIE_NAME + "=" + value + ";path=/;expires=" + expires + domainSegment;
                  });
                };
                const readLanguageCookie = () => {
                  const cookieString = document.cookie || "";
                  const parts = cookieString.split(";").map((entry) => entry.trim());
                  for (let i = parts.length - 1; i >= 0; i -= 1) {
                    if (parts[i].startsWith(COOKIE_NAME + "=")) return parts[i].substring(COOKIE_NAME.length + 1);
                  }
                  return undefined;
                };
                window.TranslateInit = function() {
                  if (!window.__GOOGLE_TRANSLATION_CONFIG__) return;
                  const existing = readLanguageCookie();
                  if (existing) setLanguageCookie(existing);
                  else setLanguageCookie("/auto/" + (window.__GOOGLE_TRANSLATION_CONFIG__.defaultLanguage || "en"));
                  const config = window.__GOOGLE_TRANSLATION_CONFIG__;
                  new google.translate.TranslateElement({
                    pageLanguage: config.defaultLanguage,
                    includedLanguages: config.languages.map((l) => l.name).join(","),
                    autoDisplay: false,
                  }, "google_translate_element");
                };
              })();
            `
          }}
        />
        <Script
          id='google-translate-lib'
          src='https://translate.google.com/translate_a/element.js?cb=TranslateInit'
          strategy='afterInteractive'
        />
        {/* Must exist for the widget to initialize (kept hidden but present) */}
        <div
          id='google_translate_element'
          style={{
            position: 'absolute',
            left: '-9999px',
            top: '0',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            opacity: 0
          }}
        />

        {pixelId ? (
          <>
            <Script
              id='fb-pixel'
              strategy='afterInteractive'
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${pixelId}');
                  fbq('track', 'PageView');
                `
              }}
            />
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height='1'
                width='1'
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
                alt=''
              />
            </noscript>
          </>
        ) : null}

        <AuthProvider>
          <SiteProvider data={siteConfig}>{children}</SiteProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
