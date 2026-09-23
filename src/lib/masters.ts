// ============================================================================
// Masters — buyers, products, bank accounts and signatories a company reuses
// across invoices (tables from migration 20260924000001).
//
// A master only PREFILLS a draft. Picking one copies its values into the
// draft form; the invoice stores those values, never a link to the master.
// There is deliberately no foreign key from invoices to any master: editing
// or deleting a master cannot reach an invoice, and an issued invoice is
// frozen by invoices_guard() regardless.
// ============================================================================

import { supabase } from './supabase'
import type { InvoiceHeaderInput, InvoiceLineInput } from './invoices'

export interface Buyer {
  id: string
  name: string
  address: string | null
  country: string
  taxId: string | null
  /** Defaults copied into a draft only when set. */
  paymentTerms: string | null
  currency: string | null
  incoterm: string | null
}

export interface Product {
  id: string
  description: string
  hsCode: string
  uom: string
  /** Default price in whatever currency the exporter quotes; copied only when set. */
  unitPrice: number | null
}

export interface BankAccount {
  id: string
  bankName: string
  branch: string | null
  accountNumber: string
  ifsc: string | null
  swift: string | null
  adCode: string | null
  isDefault: boolean
}

export interface Signatory {
  id: string
  name: string
  designation: string | null
  isDefault: boolean
}

export interface BuyerInput {
  name: string; address: string; country: string; taxId: string
  paymentTerms: string; currency: string; incoterm: string
}
export interface ProductInput { description: string; hsCode: string; uom: string; unitPrice: string }
export interface BankAccountInput {
  bankName: string; branch: string; accountNumber: string
  ifsc: string; swift: string; adCode: string; isDefault: boolean
}
export interface SignatoryInput { name: string; designation: string; isDefault: boolean }

export const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'] as const

// ── Prefill (pure, tested) ───────────────────────────────────────────────────

const s = (v: string | null) => v ?? ''

/**
 * Copy a buyer into the draft's buyer block. The whole block is replaced so no
 * field of a previously picked buyer survives; trade-term defaults are copied
 * only when the buyer has them. A currency change clears the typed exchange
 * rate: a USD rate left on a EUR invoice would misstate every rupee figure.
 */
export function applyBuyer(h: InvoiceHeaderInput, b: Buyer): InvoiceHeaderInput {
  const next: InvoiceHeaderInput = {
    ...h,
    buyerName: b.name,
    buyerAddress: s(b.address),
    buyerCountry: b.country,
    buyerTaxId: s(b.taxId),
  }
  if (b.paymentTerms) next.paymentTerms = b.paymentTerms
  if (b.incoterm) next.incoterm = b.incoterm
  if (b.currency && b.currency !== h.currency.trim().toUpperCase()) {
    next.currency = b.currency
    next.fxRateInr = ''
    next.fxRateDate = ''
  }
  return next
}

/** Copy a buyer record into the consignee block only. */
export function applyConsignee(h: InvoiceHeaderInput, b: Buyer): InvoiceHeaderInput {
  return { ...h, consigneeName: b.name, consigneeAddress: s(b.address), consigneeCountry: b.country }
}

export function applyBank(h: InvoiceHeaderInput, b: BankAccount): InvoiceHeaderInput {
  return {
    ...h,
    exporterBankName: b.bankName,
    exporterBankBranch: s(b.branch),
    exporterBankAccount: b.accountNumber,
    exporterBankIfsc: s(b.ifsc),
    exporterBankSwift: s(b.swift),
    exporterBankAdCode: s(b.adCode),
  }
}

export function applySignatory(h: InvoiceHeaderInput, sig: Signatory): InvoiceHeaderInput {
  return { ...h, signatoryName: sig.name, signatoryDesignation: s(sig.designation) }
}

/** Fill a line's goods fields. Quantity, marks, packages and weights stay per shipment. */
export function applyProduct(l: InvoiceLineInput, p: Product): InvoiceLineInput {
  return {
    ...l,
    description: p.description,
    hsCode: p.hsCode,
    uom: p.uom,
    unitPrice: p.unitPrice === null ? l.unitPrice : String(p.unitPrice),
  }
}

/** For a NEW draft only: the company's default bank and signatory, if marked. */
export function applyDefaults(h: InvoiceHeaderInput, banks: BankAccount[], signatories: Signatory[]): InvoiceHeaderInput {
  let next = h
  const bank = banks.find(b => b.isDefault)
  if (bank) next = applyBank(next, bank)
  const sig = signatories.find(x => x.isDefault)
  if (sig) next = applySignatory(next, sig)
  return next
}

// ── Form -> row, with the database's rules said in words first ───────────────

type Row = Record<string, unknown>
type Mapped = { row: Row; errors: string[] }

const text = (v: string) => (v.trim() === '' ? null : v.trim())
const upper = (v: string) => (v.trim() === '' ? null : v.trim().toUpperCase())

export function buyerToRow(i: BuyerInput): Mapped {
  const errors: string[] = []
  const row = {
    name: text(i.name),
    address: text(i.address),
    country: text(i.country),
    tax_id: text(i.taxId),
    payment_terms: text(i.paymentTerms),
    currency: upper(i.currency),
    incoterm: upper(i.incoterm),
  }
  if (!row.name) errors.push('Buyer name is required')
  if (!row.country) errors.push('Country is required')
  if (row.currency && !/^[A-Z]{3}$/.test(row.currency)) errors.push('Currency must be a 3-letter code like USD')
  if (row.incoterm && !(INCOTERMS as readonly string[]).includes(row.incoterm)) errors.push('Incoterm must be one of the Incoterms 2020 rules')
  return { row, errors }
}

export function productToRow(i: ProductInput): Mapped {
  const errors: string[] = []
  const hs = i.hsCode.replace(/[\s.]/g, '')
  const priceText = i.unitPrice.trim().replace(/,/g, '')
  const price = priceText === '' ? null : Number(priceText)
  const row = { description: text(i.description), hs_code: hs, uom: text(i.uom), unit_price: price }
  if (!row.description) errors.push('Description is required')
  if (!/^[0-9]{4,8}$/.test(hs)) errors.push('HS code must be 4 to 8 digits')
  if (!row.uom) errors.push('Unit is required')
  if (price !== null && !(Number.isFinite(price) && price >= 0)) errors.push('Unit price must be 0 or more')
  return { row, errors }
}

export function bankAccountToRow(i: BankAccountInput): Mapped {
  const errors: string[] = []
  const account = i.accountNumber.replace(/\s/g, '')
  const row = {
    bank_name: text(i.bankName),
    branch: text(i.branch),
    account_number: account === '' ? null : account,
    ifsc: upper(i.ifsc),
    swift: upper(i.swift),
    ad_code: text(i.adCode),
    is_default: i.isDefault,
  }
  if (!row.bank_name) errors.push('Bank name is required')
  if (!row.account_number) errors.push('Account number is required')
  if (row.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(row.ifsc)) errors.push('IFSC must be 11 characters, like SBIN0001234')
  if (row.swift && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(row.swift)) errors.push('SWIFT / BIC must be 8 or 11 characters, like SBININBB')
  return { row, errors }
}

export function signatoryToRow(i: SignatoryInput): Mapped {
  const row = { name: text(i.name), designation: text(i.designation), is_default: i.isDefault }
  return { row, errors: row.name ? [] : ['Signatory name is required'] }
}

// ── Row -> master ────────────────────────────────────────────────────────────

const str = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : String(v))

export function buyerFromRow(r: Row): Buyer {
  return {
    id: String(r.id), name: String(r.name), address: str(r.address), country: String(r.country),
    taxId: str(r.tax_id), paymentTerms: str(r.payment_terms), currency: str(r.currency), incoterm: str(r.incoterm),
  }
}

export function productFromRow(r: Row): Product {
  const price = r.unit_price === null || r.unit_price === undefined ? null : Number(r.unit_price)
  return {
    id: String(r.id), description: String(r.description), hsCode: String(r.hs_code), uom: String(r.uom),
    unitPrice: price !== null && Number.isFinite(price) ? price : null,
  }
}

export function bankAccountFromRow(r: Row): BankAccount {
  return {
    id: String(r.id), bankName: String(r.bank_name), branch: str(r.branch), accountNumber: String(r.account_number),
    ifsc: str(r.ifsc), swift: str(r.swift), adCode: str(r.ad_code), isDefault: r.is_default === true,
  }
}

export function signatoryFromRow(r: Row): Signatory {
  return { id: String(r.id), name: String(r.name), designation: str(r.designation), isDefault: r.is_default === true }
}

// ── Errors ───────────────────────────────────────────────────────────────────

const CONSTRAINT_MESSAGES: [string, string][] = [
  ['buyers_unique_name_country', 'A buyer with this name and country already exists.'],
  ['products_unique_description_hs', 'A product with this description and HS code already exists.'],
  ['bank_accounts_unique_account', 'This bank account is already saved.'],
  ['signatories_unique_name', 'A signatory with this name already exists.'],
  ['bank_accounts_one_default', 'Only one bank account can be the default.'],
  ['signatories_one_default', 'Only one signatory can be the default.'],
]

export function friendlyMasterError(message: string): string {
  for (const [name, words] of CONSTRAINT_MESSAGES) if (message.includes(name)) return words
  return message
}

// ── Database calls ───────────────────────────────────────────────────────────

export type MasterTable = 'buyers' | 'products' | 'bank_accounts' | 'signatories'

export interface Masters {
  buyers: Buyer[]
  products: Product[]
  banks: BankAccount[]
  signatories: Signatory[]
}

export const NO_MASTERS: Masters = { buyers: [], products: [], banks: [], signatories: [] }

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(friendlyMasterError(error?.message ?? fallback))
}

export async function loadMasters(companyId: string): Promise<Masters> {
  const [b, p, k, s2] = await Promise.all([
    supabase.from('buyers').select('*').eq('company_id', companyId).order('name'),
    supabase.from('products').select('*').eq('company_id', companyId).order('description'),
    supabase.from('bank_accounts').select('*').eq('company_id', companyId).order('bank_name'),
    supabase.from('signatories').select('*').eq('company_id', companyId).order('name'),
  ])
  for (const r of [b, p, k, s2]) if (r.error) fail(r.error, 'Could not load masters')
  return {
    buyers: (b.data ?? []).map(buyerFromRow),
    products: (p.data ?? []).map(productFromRow),
    banks: (k.data ?? []).map(bankAccountFromRow),
    signatories: (s2.data ?? []).map(signatoryFromRow),
  }
}

/**
 * Insert (id null) or update one master. Marking a bank or signatory default
 * first clears the company's current default; the partial unique index
 * refuses two, so a failure here leaves at most one, never two.
 */
export async function saveMaster(table: MasterTable, companyId: string, id: string | null, row: Row): Promise<void> {
  if ((table === 'bank_accounts' || table === 'signatories') && row.is_default === true) {
    let clear = supabase.from(table).update({ is_default: false }).eq('company_id', companyId).eq('is_default', true)
    if (id) clear = clear.neq('id', id)
    const { error } = await clear
    if (error) fail(error, 'Could not change the default')
  }
  const { error } = id
    ? await supabase.from(table).update(row).eq('id', id)
    : await supabase.from(table).insert({ ...row, company_id: companyId })
  if (error) fail(error, 'Could not save')
}

/** Nothing references a master, so deleting one never touches an invoice. */
export async function deleteMaster(table: MasterTable, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) fail(error, 'Could not delete')
}
