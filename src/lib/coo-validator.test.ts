import { describe, it, expect, vi, beforeEach } from 'vitest'

const invoke = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }))

import { validateCoOPreflight } from './coo-validator'
import type { Shipment, CompanyProfile } from '@/types'

const baseCompany: CompanyProfile = {
  name: 'Acme Exports Pvt Ltd',
  size: 'small',
  iec: 'IEC1234567',
  state: 'Gujarat',
}

const baseShipment: Shipment = {
  id: 'ship-1',
  name: 'Hot-rolled steel coils',
  product: 'steel',
  country: 'AE',
  date: '2026-09-01',
  status: 'pending',
  hsCode: '72081000',
  portOfLoading: 'Mundra',
  uom: 'KGS',
  invoiceNumber: 'INV-001',
  invoiceDate: '2026-08-30',
}

const baseApplicationData = {
  tradeAgreementId: 'INDIA_UAE_CEPA',
  preferenceCriterion: 'CTH',
  destinationCountryIso: 'AE',
  rollUpAbsorption: true,
}

beforeEach(() => {
  invoke.mockReset()
})

describe('validateCoOPreflight', () => {
  it('passes a fully valid payload with a clean DEL screen', async () => {
    invoke.mockResolvedValue({ data: { risk_level: 'clear', matches: [], query_name: baseCompany.name, checked_at: '' }, error: null })

    const result = await validateCoOPreflight(baseShipment, baseCompany, baseApplicationData)

    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('blocks when the company matches the Denied Entity List', async () => {
    invoke.mockResolvedValue({
      data: { risk_level: 'block', matches: [{ uid: '1', name: 'Acme Exports', matched_as: 'Acme Exports', entity_type: 'company', program: 'OFAC SDN', score: 95 }], query_name: baseCompany.name, checked_at: '' },
      error: null,
    })

    const result = await validateCoOPreflight(baseShipment, baseCompany, baseApplicationData)

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'company.iec' }))
  })

  it('flags an unrecognised port of loading', async () => {
    invoke.mockResolvedValue({ data: { risk_level: 'clear', matches: [] }, error: null })

    const result = await validateCoOPreflight(
      { ...baseShipment, portOfLoading: 'Nowhere Port' },
      baseCompany,
      baseApplicationData
    )

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'shipment.portOfLoading' }))
  })

  it('flags an unrecognised trade agreement id', async () => {
    invoke.mockResolvedValue({ data: { risk_level: 'clear', matches: [] }, error: null })

    const result = await validateCoOPreflight(baseShipment, baseCompany, { ...baseApplicationData, tradeAgreementId: 'NOT_REAL' })

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'tradeAgreementId' }))
  })

  it('requires reasonRetrospective when the shipment date is in the future', async () => {
    invoke.mockResolvedValue({ data: { risk_level: 'clear', matches: [] }, error: null })

    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const result = await validateCoOPreflight({ ...baseShipment, date: futureDate }, baseCompany, baseApplicationData)

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'shipment.reasonRetrospective' }))
  })

  it('rejects a non-8-digit HS code', async () => {
    invoke.mockResolvedValue({ data: { risk_level: 'clear', matches: [] }, error: null })

    const result = await validateCoOPreflight({ ...baseShipment, hsCode: '7208' }, baseCompany, baseApplicationData)

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'shipment.hsCode' }))
  })

  it('requires an IEC on the company before screening', async () => {
    const result = await validateCoOPreflight(baseShipment, { ...baseCompany, iec: undefined }, baseApplicationData)

    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ field: 'company.iec' }))
    expect(invoke).not.toHaveBeenCalled()
  })
})
