// ============================================================================
// Masters against a real database: RLS across companies, required fields,
// duplicates, and the rule the whole feature rests on -- editing or deleting a
// master never changes an issued invoice.
//
// Runs only against a LOCAL Supabase stack (`npm run test:integration`):
//   LOCAL_SUPABASE_URL=http://127.0.0.1:55321 LOCAL_SUPABASE_ANON_KEY=... \
//     npm run test:integration
// It signs up throwaway users, so it refuses any URL that is not localhost.
// .env.local points at production; that is exactly what this guard is for.
// ============================================================================

import { describe, it, expect, beforeAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { applyBank, applyBuyer, applyProduct, applySignatory, bankAccountFromRow, buyerFromRow, productFromRow, signatoryFromRow } from './masters'
import { invoiceHeaderToRow, invoiceLinesToRows, type InvoiceHeaderInput, type InvoiceLineInput } from './invoices'

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
  const email = `masters-${randomUUID()}@example.test`
  const { error } = await db.auth.signUp({ email, password: 'local-test-only-9x!' })
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

const uniq = () => randomUUID().slice(0, 8)

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p
  if (error) throw new Error(error.message)
  if (data === null || data === undefined) throw new Error('expected rows back, got none')
  return data
}

/**
 * The write must be refused BY A RULE: a constraint (23xxx: not-null, check,
 * unique) or RLS / privilege (42501). Any other error -- a missing table, a
 * typo'd column -- would make a refusal test pass for the wrong reason.
 */
async function refused(p: PromiseLike<{ error: { message: string; code?: string } | null }>): Promise<string> {
  const { error } = await p
  expect(error, 'expected the database to refuse this write').not.toBeNull()
  expect(error!.code, `refused for the wrong reason: ${error!.message}`).toMatch(/^(23\d{3}|42501)$/)
  return error!.message
}

// ── RLS ──────────────────────────────────────────────────────────────────────

const TABLES = {
  buyers: () => ({ name: `Hafen ${uniq()}`, country: 'Germany' }),
  products: () => ({ description: `Tube ${uniq()}`, hs_code: '73041910', uom: 'KGS' }),
  bank_accounts: () => ({ bank_name: 'SBI', account_number: uniq() }),
  signatories: () => ({ name: `Signer ${uniq()}` }),
} as const

describe.each(Object.keys(TABLES) as (keyof typeof TABLES)[])('RLS on %s', table => {
  it('keeps one company\'s rows invisible and untouchable to another, and to anon', async () => {
    const mine = await must(A.db.from(table).insert({ company_id: A.companyId, ...TABLES[table]() }).select().single())

    // B cannot see it
    expect(await must(B.db.from(table).select('id').eq('id', mine.id))).toEqual([])

    // B cannot change or delete it: RLS filters the row out, nothing is touched
    await B.db.from(table).update({ company_id: B.companyId }).eq('id', mine.id)
    await B.db.from(table).delete().eq('id', mine.id)
    const still = await must(A.db.from(table).select('*').eq('id', mine.id).single())
    expect(still).toEqual(mine)

    // B cannot plant a row in A's company
    await refused(B.db.from(table).insert({ company_id: A.companyId, ...TABLES[table]() }))

    // A cannot move its own row into B's company
    await refused(A.db.from(table).update({ company_id: B.companyId }).eq('id', mine.id))

    // Signed-out visitors get nothing
    const { data: anonData, error: anonErr } = await client().from(table).select('id')
    expect(anonErr !== null || (anonData ?? []).length === 0).toBe(true)
  })
})

// ── Required fields and formats ──────────────────────────────────────────────

describe('the database refuses incomplete masters', () => {
  it('buyers need a non-blank name and a country', async () => {
    const c = A.companyId
    await refused(A.db.from('buyers').insert({ company_id: c, country: 'Germany' }))
    await refused(A.db.from('buyers').insert({ company_id: c, name: '   ', country: 'Germany' }))
    await refused(A.db.from('buyers').insert({ company_id: c, name: `X ${uniq()}` }))
    await refused(A.db.from('buyers').insert({ company_id: c, name: `X ${uniq()}`, country: 'DE', currency: 'EURO' }))
    await refused(A.db.from('buyers').insert({ company_id: c, name: `X ${uniq()}`, country: 'DE', incoterm: 'FOT' }))
  })

  it('products need description, a 4-8 digit HS, a unit and a price that is not negative', async () => {
    const c = A.companyId
    await refused(A.db.from('products').insert({ company_id: c, hs_code: '7304', uom: 'KGS' }))
    await refused(A.db.from('products').insert({ company_id: c, description: 'x', hs_code: '73', uom: 'KGS' }))
    await refused(A.db.from('products').insert({ company_id: c, description: 'x', hs_code: '7304', uom: ' ' }))
    await refused(A.db.from('products').insert({ company_id: c, description: 'x', hs_code: '7304', uom: 'KGS', unit_price: -1 }))
  })

  it('bank accounts need a bank and account, and valid IFSC / SWIFT', async () => {
    const c = A.companyId
    await refused(A.db.from('bank_accounts').insert({ company_id: c, account_number: uniq() }))
    await refused(A.db.from('bank_accounts').insert({ company_id: c, bank_name: 'SBI' }))
    await refused(A.db.from('bank_accounts').insert({ company_id: c, bank_name: 'SBI', account_number: uniq(), ifsc: 'SBIN1234' }))
    await refused(A.db.from('bank_accounts').insert({ company_id: c, bank_name: 'SBI', account_number: uniq(), swift: 'SBI' }))
  })

  it('signatories need a name', async () => {
    await refused(A.db.from('signatories').insert({ company_id: A.companyId, designation: 'Director' }))
    await refused(A.db.from('signatories').insert({ company_id: A.companyId, name: ' ' }))
  })
})

// ── Duplicates ───────────────────────────────────────────────────────────────

describe('duplicates within a company are refused; the same master in another company is fine', () => {
  it('buyers: same name and country, ignoring case and spaces', async () => {
    const n = `Hafen ${uniq()}`
    await must(A.db.from('buyers').insert({ company_id: A.companyId, name: n, country: 'Germany' }).select())
    expect(await refused(A.db.from('buyers').insert({ company_id: A.companyId, name: ` ${n.toUpperCase()} `, country: 'germany' })))
      .toContain('buyers_unique_name_country')
    await must(A.db.from('buyers').insert({ company_id: A.companyId, name: n, country: 'Netherlands' }).select())
    await must(B.db.from('buyers').insert({ company_id: B.companyId, name: n, country: 'Germany' }).select())
  })

  it('products: same description and HS', async () => {
    const d = `Tube ${uniq()}`
    await must(A.db.from('products').insert({ company_id: A.companyId, description: d, hs_code: '73041910', uom: 'KGS' }).select())
    expect(await refused(A.db.from('products').insert({ company_id: A.companyId, description: `${d.toLowerCase()} `, hs_code: '73041910', uom: 'MTR' })))
      .toContain('products_unique_description_hs')
    await must(A.db.from('products').insert({ company_id: A.companyId, description: d, hs_code: '73041990', uom: 'KGS' }).select())
  })

  it('bank accounts: same bank and account number, ignoring spaces', async () => {
    const acct = `1234${uniq()}`
    await must(A.db.from('bank_accounts').insert({ company_id: A.companyId, bank_name: 'State Bank of India', account_number: acct }).select())
    expect(await refused(A.db.from('bank_accounts').insert({
      company_id: A.companyId, bank_name: 'state bank of india ', account_number: `${acct.slice(0, 4)} ${acct.slice(4)}`,
    }))).toContain('bank_accounts_unique_account')
  })

  it('signatories: same name, ignoring case', async () => {
    const n = `Anita ${uniq()}`
    await must(A.db.from('signatories').insert({ company_id: A.companyId, name: n }).select())
    expect(await refused(A.db.from('signatories').insert({ company_id: A.companyId, name: n.toUpperCase() })))
      .toContain('signatories_unique_name')
  })

  it('at most one default bank and one default signatory per company', async () => {
    const C = await signUp()
    await must(C.db.from('bank_accounts').insert({ company_id: C.companyId, bank_name: 'SBI', account_number: uniq(), is_default: true }).select())
    expect(await refused(C.db.from('bank_accounts').insert({ company_id: C.companyId, bank_name: 'HDFC', account_number: uniq(), is_default: true })))
      .toContain('bank_accounts_one_default')
    await must(C.db.from('signatories').insert({ company_id: C.companyId, name: 'One', is_default: true }).select())
    expect(await refused(C.db.from('signatories').insert({ company_id: C.companyId, name: 'Two', is_default: true })))
      .toContain('signatories_one_default')
    // Non-defaults are unlimited
    await must(C.db.from('signatories').insert({ company_id: C.companyId, name: 'Three', is_default: false }).select())
    await must(C.db.from('signatories').insert({ company_id: C.companyId, name: 'Four', is_default: false }).select())
  })
})

// ── Prefill, issue, then change every master ─────────────────────────────────

const blankHeader = (): InvoiceHeaderInput => ({
  kind: 'commercial', invoiceNumber: `M/${uniq()}`.slice(0, 16), invoiceDate: '2026-09-20', irn: '',
  exporterName: 'Meridian Tubes', exporterAddress: 'Pune', exporterGstin: '', exporterIec: 'AAECM4512R', exporterStateCode: '27',
  exporterBankName: '', exporterBankBranch: '', exporterBankAccount: '', exporterBankIfsc: '', exporterBankSwift: '', exporterBankAdCode: '',
  buyerName: '', buyerAddress: '', buyerCountry: '', buyerTaxId: '',
  consigneeName: '', consigneeAddress: '', consigneeCountry: '',
  incoterm: 'FOB', incotermPlace: 'Nhava Sheva', portOfLoading: 'INNSA1', portOfDischarge: 'DEHAM', destinationCountry: 'Germany',
  originCountry: 'India', paymentTerms: '', currency: 'USD', fxRateInr: '83.45', fxRateDate: '2026-09-20',
  freightAmount: '', insuranceAmount: '', signatoryName: '', signatoryDesignation: '',
})

const blankLine = (): InvoiceLineInput => ({
  description: '', hsCode: '', quantity: '1000', uom: '', unitPrice: '',
  marks: '', packageCount: '', packageKind: '', netWeightKg: '', grossWeightKg: '',
})

describe('an issued invoice never changes when its masters do', () => {
  it('copies master values into a draft, issues it, and survives every master being edited and deleted', async () => {
    const { db, companyId } = A
    const buyerRow = await must(db.from('buyers').insert({
      company_id: companyId, name: `Hafen ${uniq()}`, address: 'Hafenstr. 1', country: 'Germany', tax_id: 'DE123456789',
      payment_terms: '30% advance', currency: 'USD', incoterm: 'FOB',
    }).select().single())
    const productRow = await must(db.from('products').insert({
      company_id: companyId, description: `Seamless tube ${uniq()}`, hs_code: '73041910', uom: 'KGS', unit_price: 2.5,
    }).select().single())
    const bankRow = await must(db.from('bank_accounts').insert({
      company_id: companyId, bank_name: 'State Bank of India', branch: 'Pune Main', account_number: `0000${uniq()}`,
      ifsc: 'SBIN0001234', swift: 'SBININBB', ad_code: '0510001',
    }).select().single())
    const sigRow = await must(db.from('signatories').insert({
      company_id: companyId, name: `Anita ${uniq()}`, designation: 'Director',
    }).select().single())

    // Prefill exactly as the Invoices view does
    const h = applySignatory(applyBank(applyBuyer(blankHeader(), buyerFromRow(buyerRow)), bankAccountFromRow(bankRow)), signatoryFromRow(sigRow))
    const { rows: lineRows, errors } = invoiceLinesToRows([applyProduct(blankLine(), productFromRow(productRow))])
    expect(errors).toEqual([])

    const inv = await must(db.from('invoices').insert({ company_id: companyId, ...invoiceHeaderToRow(h) }).select().single())
    await must(db.from('invoice_line_items').insert(lineRows.map(r => ({ ...r, invoice_id: inv.id, company_id: companyId }))).select())

    // The draft carries copies of the master values
    expect(inv).toMatchObject({
      buyer_name: buyerRow.name, buyer_address: 'Hafenstr. 1', buyer_country: 'Germany', buyer_tax_id: 'DE123456789',
      payment_terms: '30% advance', exporter_bank_account: bankRow.account_number, exporter_bank_ifsc: 'SBIN0001234',
      signatory_name: sigRow.name, signatory_designation: 'Director',
    })

    await must(db.from('invoices').update({ status: 'issued' }).eq('id', inv.id).select())
    const snapshot = await must(db.from('invoices').select('*').eq('id', inv.id).single())
    const snapshotLines = await must(db.from('invoice_line_items').select('*').eq('invoice_id', inv.id).order('line_no'))
    expect(snapshot.status).toBe('issued')
    expect(snapshotLines[0]).toMatchObject({ description: productRow.description, hs_code: '73041910', uom: 'KGS', unit_price: 2.5 })

    // Edit every master...
    await must(db.from('buyers').update({ name: `Renamed ${uniq()}`, address: 'New street', country: 'France', tax_id: 'FR1' }).eq('id', buyerRow.id).select())
    await must(db.from('products').update({ description: 'Renamed product', hs_code: '73049000', uom: 'MTR', unit_price: 9 }).eq('id', productRow.id).select())
    await must(db.from('bank_accounts').update({ bank_name: 'HDFC', account_number: `9999${uniq()}`, ifsc: 'HDFC0000001' }).eq('id', bankRow.id).select())
    await must(db.from('signatories').update({ name: `Someone ${uniq()}`, designation: 'Partner' }).eq('id', sigRow.id).select())

    expect(await must(db.from('invoices').select('*').eq('id', inv.id).single())).toEqual(snapshot)
    expect(await must(db.from('invoice_line_items').select('*').eq('invoice_id', inv.id).order('line_no'))).toEqual(snapshotLines)

    // ...then delete every master: nothing references them, so nothing is blocked or cascaded
    for (const [t, id] of [['buyers', buyerRow.id], ['products', productRow.id], ['bank_accounts', bankRow.id], ['signatories', sigRow.id]] as const) {
      expect(await must(db.from(t).delete().eq('id', id).select())).toHaveLength(1)
    }

    expect(await must(db.from('invoices').select('*').eq('id', inv.id).single())).toEqual(snapshot)
    expect(await must(db.from('invoice_line_items').select('*').eq('invoice_id', inv.id).order('line_no'))).toEqual(snapshotLines)
  })

  it('refuses a direct change to the signatory on an issued invoice', async () => {
    const { db, companyId } = A
    const inv = await must(db.from('invoices').insert({
      company_id: companyId, ...invoiceHeaderToRow({ ...blankHeader(), buyerName: 'Hafen', buyerCountry: 'Germany', signatoryName: 'Anita' }),
    }).select().single())
    await must(db.from('invoice_line_items').insert({ ...invoiceLinesToRows([{ ...blankLine(), description: 'Tube', hsCode: '7304', uom: 'KGS', unitPrice: '1' }]).rows[0], invoice_id: inv.id, company_id: companyId }).select())
    await must(db.from('invoices').update({ status: 'issued' }).eq('id', inv.id).select())

    expect(await refused(db.from('invoices').update({ signatory_name: 'Someone else' }).eq('id', inv.id))).toMatch(/cannot be edited|immutable/)
    expect(await refused(db.from('invoices').update({ signatory_designation: 'Partner' }).eq('id', inv.id))).toMatch(/cannot be edited|immutable/)
    expect((await must(db.from('invoices').select('signatory_name').eq('id', inv.id).single())).signatory_name).toBe('Anita')
  })

  it('leaves the signatory of a draft editable', async () => {
    const { db, companyId } = A
    const inv = await must(db.from('invoices').insert({ company_id: companyId, ...invoiceHeaderToRow(blankHeader()) }).select().single())
    expect(inv.signatory_name).toBeNull()
    await must(db.from('invoices').update({ signatory_name: 'Anita' }).eq('id', inv.id).select())
  })
})
