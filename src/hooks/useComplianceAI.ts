import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface AIState {
  loading: boolean
  answer: string | null
  error: string | null
}

export function useComplianceAI() {
  const [states, setStates] = useState<Record<string, AIState>>({})

  const explainItem = useCallback(async (
    itemId: string | number,
    item: string,
    options: { hsCode?: string | null; product?: string; countries?: readonly string[] | string[] }
  ) => {
    const key = String(itemId)

    // Toggle off if already showing
    if (states[key]?.answer !== null && states[key] !== undefined) {
      setStates(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      return
    }

    setStates(prev => ({ ...prev, [key]: { loading: true, answer: null, error: null } }))

    try {
      const { data, error } = await supabase.functions.invoke('compliance-ai', {
        body: { item, hsCode: options.hsCode, product: options.product, countries: options.countries },
      })

      if (error || !data?.answer) {
        setStates(prev => ({ ...prev, [key]: { loading: false, answer: null, error: 'Could not get explanation' } }))
        return
      }

      setStates(prev => ({ ...prev, [key]: { loading: false, answer: data.answer, error: null } }))
    } catch {
      setStates(prev => ({ ...prev, [key]: { loading: false, answer: null, error: 'Network error — try again' } }))
    }
  }, [states])

  return { states, explainItem }
}
