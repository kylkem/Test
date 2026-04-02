import { useState, useEffect } from 'react'

/**
 * Shows an "Add to Home Screen" prompt.
 *  - On iOS/iPadOS: shows manual instructions (Safari doesn't fire beforeinstallprompt)
 *  - On Chrome/Edge/Android: captures and triggers the native install prompt
 */
export default function InstallBanner() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone === true) return  // iOS standalone

    const iOS = /ipad|iphone|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

    if (iOS) {
      // Only show once per session
      if (!sessionStorage.getItem('install-banner-dismissed')) {
        setIsIOS(true)
        setShow(true)
      }
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!localStorage.getItem('install-banner-dismissed')) setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    setDeferredPrompt(null)
  }

  const dismiss = () => {
    setShow(false)
    if (isIOS) sessionStorage.setItem('install-banner-dismissed', '1')
    else localStorage.setItem('install-banner-dismissed', '1')
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
      left: '50%', transform: 'translateX(-50%)',
      background: '#1e3a5f', color: 'white',
      borderRadius: 16, padding: '14px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      zIndex: 9999, maxWidth: 480, width: 'calc(100% - 32px)',
      animation: 'slideUp 0.3s ease',
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <span style={{ fontSize: 32, flexShrink: 0 }}>💰</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
          Install BudgetWise
        </div>
        {isIOS ? (
          <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.4 }}>
            Tap <strong>Share</strong> <span style={{ fontSize: 15 }}>⎙</span> then
            &ldquo;<strong>Add to Home Screen</strong>&rdquo; to install.
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Add to your home screen for offline access.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {!isIOS && (
          <button onClick={handleInstall} style={{
            background: '#2563eb', color: 'white', border: 'none',
            borderRadius: 8, padding: '8px 16px', fontWeight: 600,
            fontSize: 14, cursor: 'pointer', minHeight: 44,
          }}>
            Install
          </button>
        )}
        <button onClick={dismiss} style={{
          background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none',
          borderRadius: 8, padding: '8px 12px', fontSize: 18,
          cursor: 'pointer', minHeight: 44, minWidth: 44,
        }}>
          ✕
        </button>
      </div>
    </div>
  )
}
