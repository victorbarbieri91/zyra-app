'use client'

import { useEffect } from 'react'

export function RegisterSW() {
  useEffect(() => {
    const registerSW = async () => {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          console.log('SW registered:', registration.scope)
          // Check for updates periodically
          setInterval(() => {
            registration.update()
          }, 60 * 60 * 1000) // Every hour
        }
      } catch (error) {
        console.warn('SW registration failed (non-critical):', error)
      }
    }
    registerSW()
  }, [])

  return null
}
