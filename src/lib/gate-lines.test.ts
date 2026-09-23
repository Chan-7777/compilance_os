import { describe, it, expect, vi, beforeEach } from 'vitest'

// runGateCheck talks to Supabase for tariff rows, sanctions and emissions.
// Tariff rows come back empty (defaults apply) and every buyer screens clear,
// so the only thing that differs between HS codes is CBAM scope.
const { invoke } = vi.hoisted(() => ({
  invoke: vi.fn(async (name: string) =>
    name === 'sanctions-check' ? { data: { risk_level: 'clear', matches: [] } } : { data: null }),
}))
vi.mock('./supabase', () => {
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.maybeSingle = async () => ({ data: null })
  return { supabase: { from: () => chain, functions: { invoke } } }
})

import { runGateCheck } from './api'
import { generateChecklist } from '@/utils/checklist-generator'
import { calculateRiskScore } from '@/utils/risk-scoring'
import type { Shipment, CompanyProfile } from '@/types'

const profile: CompanyProfile = { name: 'Meridian', size: 'medium' }
const allChecked = Object.fromEntries(generateChecklist('Valves and tubes', 'EU').map(c => [String(c.id), true]))

// Primary line is a valve (8481, not CBAM). A smaller line is hot-rolled steel
// (7208, CBAM Annex I). Only the per-line check can see the steel.
const shipment: Shipment = {
  id: 's1', name: 'EU order 14', product: 'Valves and tubes', country: 'EU', date: '2026-09-15',
  status: 'pending', hsCode: '84819090', buyerName: 'Acme GmbH',
}

beforeEach(() => invoke.mockClear())

describe('runGateCheck over invoice lines', () => {
  it('precondition: the non-HS parts of the check pass for this shipment', () => {
    expect(calculateRiskScore(shipment.product, shipment.country, profile).score).toBeLessThan(50)
  })

  it('single-HS shipment (no invoice) is unchanged: primary HS only', async () => {
    const r = await runGateCheck(shipment, allChecked, profile)
    expect(r.gate_status).toBe('approved')
    expect(r.hs_validation.hs_code).toBe('84819090')
    expect(r.cbam_scope?.applies).toBe(false)
    expect(r.per_hs).toBeUndefined()
  })

  it('checks every distinct line HS code; the worst status wins', async () => {
    const r = await runGateCheck({ ...shipment, lineHsCodes: ['84819090', '72081000'] }, allChecked, profile)
    expect(r.gate_status).toBe('pending')
    expect(r.blocking_reasons.some(x => /CBAM/.test(x) && /72081000/.test(x))).toBe(true)
    expect(r.hs_validation.hs_code).toBe('84819090, 72081000')
    expect(r.per_hs?.map(p => [p.hs_code, p.gate_status])).toEqual([
      ['84819090', 'approved'],
      ['72081000', 'pending'],
    ])
  })

  it('screens the buyer once, not once per HS code', async () => {
    await runGateCheck({ ...shipment, lineHsCodes: ['84819090', '72081000', '73041910'] }, allChecked, profile)
    expect(invoke.mock.calls.filter(c => c[0] === 'sanctions-check')).toHaveLength(1)
  })
})
