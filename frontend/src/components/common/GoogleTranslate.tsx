'use client'

import Script from 'next/script'
import { useCallback, useEffect } from 'react'

declare global {
  interface Window {
    google: any
    googleTranslateElementInit: () => void
    googleTranslateReady?: boolean
  }
}

interface GoogleTranslateProps {
  autoDetect?: boolean
  defaultLanguage?: string
  includedLanguages?: string[]
}

export default function GoogleTranslate({
  autoDetect = true,
  defaultLanguage = 'en',
  includedLanguages = []
}: GoogleTranslateProps) {
  useEffect(() => {
    // Check if already initialized
    if (window.google?.translate?.TranslateElement) {
      initializeWidget()
      return
    }

    // Initialize Google Translate Widget
    window.googleTranslateElementInit = () => {
      initializeWidget()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDetect, defaultLanguage, includedLanguages])

  const initializeWidget = useCallback(() => {
    if (typeof window === 'undefined' || !window.google?.translate) {
      return
    }

    try {
      // Initialize the widget
      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: includedLanguages.join(','),
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false // Prevent auto-display of banner
        },
        'google_translate_element'
      )

      // Remove banner frame if it appears
      const removeBanner = () => {
        const banners = document.querySelectorAll('.goog-te-banner-frame')
        banners.forEach((banner) => {
          if (banner.parentNode) {
            banner.parentNode.removeChild(banner)
          }
        })

        const bodyTop = document.querySelector('body')
        if (bodyTop) {
          bodyTop.style.top = '0'
          bodyTop.style.position = 'static'
        }
      }

      // Remove banner immediately and on mutation
      setTimeout(removeBanner, 100)
      setTimeout(removeBanner, 500)
      setTimeout(removeBanner, 1000)

      // Watch for banner appearing and remove it
      const observer = new MutationObserver(() => {
        removeBanner()
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true
      })
    } catch (error) {
      console.error('[GoogleTranslate] Failed to initialize widget:', error)
    }
  }, [includedLanguages])

  return (
    <>
      {/* Google Translate Script */}
      <Script
        src='https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
        strategy='afterInteractive'
        onLoad={() => console.log('📥 Google Translate script loaded')}
        onError={(e) => console.error('❌ Failed to load Google Translate script', e)}
      />

      {/* Google Translate Widget Container - must be visible for widget to render */}
      <div id='google_translate_element' style={{ opacity: 0, height: 0, overflow: 'hidden' }} />

      {/* Hide Google Translate branding (optional) */}
      <style jsx global>{`
        /* Hide the translate element visually but keep it in DOM */
        #google_translate_element {
          position: absolute;
          pointer-events: none;
          z-index: -1;
        }

        /* Hide Google Translate banner completely */
        .goog-te-banner-frame {
          display: none !important;
        }

        /* Hide the banner frame completely */
        body > .skiptranslate {
          display: none !important;
        }

        /* Prevent banner from showing at all */
        iframe.goog-te-banner-frame {
          display: none !important;
        }

        /* Reset top spacing caused by banner */
        body {
          top: 0 !important;
          position: static !important;
        }

        /* Ensure body is not affected by translate widget */
        body.translated-ltr {
          top: 0 !important;
        }

        body.translated-rtl {
          top: 0 !important;
        }

        /* Hide "Powered by Google" */
        .goog-logo-link {
          display: none !important;
        }

        .goog-te-gadget {
          color: transparent !important;
        }

        /* Hide the original "Show original" button/text that appears */
        .goog-te-banner-frame.skiptranslate {
          display: none !important;
        }

        /* Style the select dropdown */
        .goog-te-combo {
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          background-color: white;
          cursor: pointer;
          outline: none;
        }

        .goog-te-combo:hover {
          border-color: #3b82f6;
        }

        .goog-te-combo:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </>
  )
}
