// ============================================================================
// Branches: GST numbers invoices per GSTIN per financial year, so two GSTINs of
// one company may each issue "EXP/001". Everything else about the numbering
// rule must hold exactly as before: same GSTIN + same FY is refused (ignoring
// case and spaces), invoices with no GSTIN collide with each other AND with
// every branch, the FY turns on 1 April, and cancelled numbers stay reserved.
//
// Runs only against a LOCAL Supabase stack (`npm run test:integration`):
//   LOCAL_SUPABASE_URL=http://127.0.0.1:55321 LOCAL_SUPABASE_ANON_KEY=... \
//     npm run test:integration
// It signs up throwaway users, so it refuses any URL that is not localhost.
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { invoiceHeaderToRow, invoiceLinesToRows, type InvoiceHeaderInput } from './invoices'
import { planShippingBillImport, type ImportInvoice } from './sb-import'

const URL_ = process.env.LOCAL_SUPABASE_URL ?? ''
const ANON = process.env.LOCAL_SUPABASE_ANON_KEY ?? ''

if (!URL_ || !ANON) {
  throw new Error('Set LOCAL_SUPABASE_URL and LOCAL_SUPABASE_ANON_KEY to a local stack (supabase status) to run these tests.')
}
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(URL_)) {
  throw new Error(`Refusing to run database tests against ${URL_}: local stack only.`)
}

const client = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false, storageKey: randomUUID() } })

async function signUp(): Promise<{ db: SupabaseClient; companyId: string }> {
  const db = client()
  const { error } = await db.auth.signUp({ email: `branches-${randomUUID()}@example.test`, password: 'local-test-only-9x!' })
  if (error) throw error
  const { data, error: e2 } = await db.from('user_profiles').select('company_id').single()
  if (e2) throw e2
  return { db, companyId: data.company_id as string }
}

let A: { db: SupabaseClient; companyId: string }
let B: { db: SupabaseClient; companyId: string }

beforeAll(async () => {
  A = await signUp()
  B = await signUp()
})

const GST_MH = '27AAECM4512R1Z2'
const GST_GJ = '24AAECM4512R1Z8'
const num = () => `B/${randomUUID().slice(0, 8)}`

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  if (data === null || data === undefined) throw new Error('expected rows back, got none')
  return data
}

/**
 * Refused by the NUMBERING rule specifically: a unique violation naming the
 * index or the blank-GSTIN guard. Anything else (a check constraint, RLS, a
 * typo'd column) would let a test pass for the wrong reason.
 */
async function refusedAsDuplicate(p: PromiseLike<{ error: { message: string; code?: string } | null }>): Promise<void> {
  const { error } = await p
  expect(error, 'expected the database to refuse this number').not.toBeNull()
  expect(error!.code, `refused for the wrong reason: ${error!.message}`).toBe('23505')
  expect(error!.message).toMatch(/invoices_number_unique_per_fy|invoices_number_blank_gstin/)
}

const header = (over: Partial<InvoiceHeaderInput> = {}): InvoiceHeaderInput => ({
  kind: 'commercial', invoiceNumber: '', invoiceDate: '2026-09-20', irn: '',
  exporterName: 'Meridian Tubes', exporterAddress: 'Pune', exporterGstin: '', exporterIec: 'AAECM4512R', exporterStateCode: '',
  exporterBankName: '', exporterBankBranch: '', exporterBankAccount: '', exporterBankIfsc: '', exporterBankSwift: '', exporterBankAdCode: '',
  buyerName: 'Hafen GmbH', buyerAddress: '', buyerCountry: 'Germany', buyerTaxId: '',
  consigneeName: '', consigneeAddress: '', consigneeCountry: '',
  incoterm: 'FOB', incotermPlace: '', portOfLoading: '', portOfDischarge: '', destinationCountry: '',
  originCountry: 'India', paymentTerms: '', currency: 'USD', fxRateInr: '83.45', fxRateDate: '2026-09-20',
  freightAmount: '', insuranceAmount: '', signatoryName: '', signatoryDesignation: '',
  ...over,
})

/** A draft as the app writes it. `raw` overrides columns AFTER the app's mapping, to test what a direct API write can store. */
const draft = (db: SupabaseClient, companyId: string, over: Partial<InvoiceHeaderInput>, raw: Record<string, unknown> = {}) =>
  db.from('invoices').insert({ company_id: companyId, ...invoiceHeaderToRow(header(over)), ...raw }).select().single()

async function issued(db: SupabaseClient, companyId: string, over: Partial<InvoiceHeaderInput>) {
  const inv = await must(draft(db, companyId, over))
  const { rows } = invoiceLinesToRows([{
    description: 'Seamless tube', hsCode: '73041910', quantity: '10', uom: 'KGS', unitPrice: '2',
    marks: '', packageCount: '', packageKind: '', netWeightKg: '', grossWeightKg: '',
  }])
  await must(db.from('invoice_line_items').insert(rows.map(r => ({ ...r, invoice_id: inv.id, company_id: companyId }))).select())
  return must(db.from('invoices').update({ status: 'issued' }).eq('id', inv.id).select().single())
}

// ── The loosening ────────────────────────────────────────────────────────────

describe('two GSTINs of one company', () => {
  it('may each use the same number in the same financial year, and issue it', async () => {
    const n = num()
    const mh = await issued(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH })
    const gj = await issued(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_GJ })
    expect([mh.status, gj.status]).toEqual(['issued', 'issued'])
    expect([mh.exporter_gstin, gj.exporter_gstin]).toEqual([GST_MH, GST_GJ])
  })
})

// ── What must still be refused ───────────────────────────────────────────────

describe('the same GSTIN in the same financial year', () => {
  it('is refused, ignoring case and spaces in the number and the GSTIN', async () => {
    const n = num()
    await must(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: ` ${n.toLowerCase()} `, exporterGstin: GST_MH }))
    // Written directly, past the app's upper-casing: the index must normalise on its own.
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n }, { exporter_gstin: ` ${GST_MH.toLowerCase()} ` }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n }, { exporter_gstin: `${GST_MH.slice(0, 7)} ${GST_MH.slice(7)}` }))
  })

  it('is refused across proforma and commercial only within the same kind, as before', async () => {
    const n = num()
    await must(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH }))
    await must(draft(A.db, A.companyId, { kind: 'proforma', invoiceNumber: n, exporterGstin: GST_MH }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { kind: 'proforma', invoiceNumber: n, exporterGstin: GST_MH }))
  })
})

describe('invoices with no GSTIN', () => {
  it('collide with each other, whether the GSTIN is NULL, empty or blank', async () => {
    const n = num()
    await must(draft(A.db, A.companyId, { invoiceNumber: n }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n }, { exporter_gstin: '' }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n }, { exporter_gstin: '   ' }))
  })

  it('collide with every branch: a blank GSTIN could be any of them', async () => {
    const n1 = num()
    await must(draft(A.db, A.companyId, { invoiceNumber: n1, exporterGstin: GST_MH }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n1 }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n1 }, { exporter_gstin: ' ' }))

    const n2 = num()
    await must(draft(A.db, A.companyId, { invoiceNumber: n2 }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n2, exporterGstin: GST_GJ }))
  })
})

describe('editing a draft cannot dodge the rule', () => {
  it('refuses moving a draft onto a taken number, date or GSTIN, including by clearing the GSTIN', async () => {
    const n = num()
    await must(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH }))
    const gj = await must(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_GJ }))

    await refusedAsDuplicate(A.db.from('invoices').update({ exporter_gstin: GST_MH }).eq('id', gj.id))
    await refusedAsDuplicate(A.db.from('invoices').update({ exporter_gstin: null }).eq('id', gj.id))
    await refusedAsDuplicate(A.db.from('invoices').update({ exporter_gstin: '' }).eq('id', gj.id))

    const other = await must(draft(A.db, A.companyId, { invoiceNumber: num(), exporterGstin: GST_MH, invoiceDate: '2026-05-01' }))
    await refusedAsDuplicate(A.db.from('invoices').update({ invoice_number: n.toLowerCase(), invoice_date: '2026-09-21' }).eq('id', other.id))

    const blank = await must(draft(A.db, A.companyId, { invoiceNumber: n, invoiceDate: '2025-09-20' }))
    await refusedAsDuplicate(A.db.from('invoices').update({ invoice_date: '2026-09-20' }).eq('id', blank.id))

    // The untouched draft still saves: an unchanged key never trips the rule.
    await must(A.db.from('invoices').update({ buyer_name: 'Other GmbH' }).eq('id', gj.id).select().single())
  })
})

describe('the financial year turns on 1 April', () => {
  it('31 March and 1 April are different years; 1 April and the next 31 March are the same', async () => {
    const n = num()
    await must(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH, invoiceDate: '2026-03-31' }))
    await must(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH, invoiceDate: '2026-04-01' }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH, invoiceDate: '2027-03-31' }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH, invoiceDate: '2025-04-01' }))
  })

  it('a blank-GSTIN number in one year does not block a branch in the next', async () => {
    const n = num()
    await must(draft(A.db, A.companyId, { invoiceNumber: n, invoiceDate: '2026-03-31' }))
    await must(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH, invoiceDate: '2026-04-01' }))
  })
})

describe('cancelled numbers stay reserved', () => {
  it('for the same GSTIN and for a blank one, but not for another branch', async () => {
    const n = num()
    const mh = await issued(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH })
    const cancelled = await must(A.db.from('invoices').update({ status: 'cancelled', cancel_reason: 'Wrong buyer' }).eq('id', mh.id).select().single())
    expect(cancelled.status).toBe('cancelled')

    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH }))
    await refusedAsDuplicate(draft(A.db, A.companyId, { invoiceNumber: n }))
    await must(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_GJ }))
  })

  it('an issued blank-GSTIN invoice can still be cancelled and relinked', async () => {
    const inv = await issued(A.db, A.companyId, { invoiceNumber: num() })
    const c = await must(A.db.from('invoices').update({ status: 'cancelled', cancel_reason: 'Duplicate' }).eq('id', inv.id).select().single())
    expect(c.status).toBe('cancelled')
    await must(A.db.from('invoices').update({ shipment_id: null }).eq('id', inv.id).select().single())
  })
})

describe('numbering is per company', () => {
  it('another company may use the same number, GSTIN or none, without affecting this one', async () => {
    const n = num()
    await must(draft(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH }))
    await must(draft(B.db, B.companyId, { invoiceNumber: n, exporterGstin: GST_MH }))
    await must(draft(B.db, B.companyId, { invoiceNumber: num() }))
    const blankInB = num()
    await must(draft(B.db, B.companyId, { invoiceNumber: blankInB }))
    await must(draft(A.db, A.companyId, { invoiceNumber: blankInB, exporterGstin: GST_GJ }))
  })
})

// ── The shipping bill import against real branch invoices ────────────────────

describe('shipping bill import with two branches on one number', () => {
  it('links the invoice of the GSTIN on the row, and refuses a row with no GSTIN as ambiguous', async () => {
    const n = num()
    const mh = await issued(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_MH })
    const gj = await issued(A.db, A.companyId, { invoiceNumber: n, exporterGstin: GST_GJ })

    // Same query as bulkImportShippingBills in api.ts
    const invoices = await must(A.db.from('invoices')
      .select('id, shipment_id, kind, status, invoice_number, invoice_date, exporter_gstin')
      .eq('company_id', A.companyId)) as ImportInvoice[]

    const base = { date: '2026-09-22', hsCode: '73041910', fobValue: 20, currency: 'USD', description: 'Tube', country: 'DE', buyerName: 'Hafen GmbH' }
    const ctx = { companyId: A.companyId, companyIec: 'AAECM4512R', invoices, shipments: [], rateFor: () => ({ rate: 1, matchType: 'exact' as const }) }

    const toGj = planShippingBillImport([{ ...base, shippingBillNo: '7000001', invoiceNumber: n.toLowerCase(), invoiceDate: '2026-09-20', gstin: ` ${GST_GJ.toLowerCase()}` }], ctx)
    expect(toGj.rejected).toEqual([])
    expect(toGj.actions).toHaveLength(1)
    expect(toGj.actions[0]).toMatchObject({ kind: 'insert', linkInvoiceId: gj.id })

    const toMh = planShippingBillImport([{ ...base, shippingBillNo: '7000002', invoiceNumber: n, invoiceDate: '2026-09-20', gstin: GST_MH }], ctx)
    expect(toMh.actions[0]).toMatchObject({ kind: 'insert', linkInvoiceId: mh.id })

    const noGstin = planShippingBillImport([{ ...base, shippingBillNo: '7000003', invoiceNumber: n, invoiceDate: '2026-09-20' }], ctx)
    expect(noGstin.actions).toEqual([])
    expect(noGstin.rejected[0].reason).toMatch(/more than one GSTIN/)
  })
})
