import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { DesignSystemDemo } from './components/DesignSystemDemo'
import { colors } from '@theme/index'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Capture 10% of sessions for replay (100% on errors)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Don't send PII
    beforeSend(event: Sentry.ErrorEvent) {
      if (event.user) {
        delete event.user.email
        delete event.user.ip_address
      }
      return event
    },
  })
}

const isDemo = new URLSearchParams(window.location.search).has('demo')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDemo ? <DesignSystemDemo /> : <Sentry.ErrorBoundary
      fallback={
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: 16,
          fontFamily: 'sans-serif', color: colors.text,
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Something went wrong</div>
          <div style={{ fontSize: '0.875rem', color: colors.textMuted }}>
            Our team has been notified. Please refresh to continue.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px', backgroundColor: colors.primary, color: colors.white,
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            Refresh
          </button>
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>}
  </StrictMode>,
)
