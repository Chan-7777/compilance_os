// ============================================================================
// useToast Hook - Toast notification manager
// ============================================================================

import { useState, useCallback } from 'react'

export interface ToastMessage {
    id: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
}

export function useToast() {
    const [toasts, setToasts] = useState<ToastMessage[]>([])

    const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
        const id = `toast-${Date.now()}-${Math.random()}`
        setToasts(prev => [...prev, { id, message, type }])

        // Auto-remove after delay
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 3500)
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const success = useCallback((message: string) => showToast(message, 'success'), [showToast])
    const error = useCallback((message: string) => showToast(message, 'error'), [showToast])
    const info = useCallback((message: string) => showToast(message, 'info'), [showToast])
    const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast])

    return {
        toasts,
        showToast,
        removeToast,
        success,
        error,
        info,
        warning,
    }
}
