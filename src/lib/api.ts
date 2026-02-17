import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Make an authenticated API call to the FastAPI backend.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `API error: ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── Risk ──────────────────────────────────────────────────────
export function fetchRiskScore(product: string, country: string, companySize: string) {
  return apiFetch<any>('/api/v1/risk-score', {
    method: 'POST',
    body: JSON.stringify({ product, country, company_size: companySize }),
  })
}

// ─── Checklist ─────────────────────────────────────────────────
export function fetchChecklist(product: string, country: string) {
  return apiFetch<any>('/api/v1/checklist', {
    method: 'POST',
    body: JSON.stringify({ product, country }),
  })
}

// ─── Alerts ────────────────────────────────────────────────────
export function fetchAlerts(countries: string[], product: string) {
  const params = new URLSearchParams({
    countries: countries.join(','),
    product,
  })
  return apiFetch<any>(`/api/v1/alerts?${params}`)
}

// ─── FTA Savings ───────────────────────────────────────────────
export function fetchFTASavings(
  country: string,
  shipmentValue: number,
  hsCode?: string,
  product?: string
) {
  return apiFetch<any>('/api/v1/fta-savings', {
    method: 'POST',
    body: JSON.stringify({
      country,
      shipment_value: shipmentValue,
      hs_code: hsCode,
      product,
    }),
  })
}

// ─── Shipments ─────────────────────────────────────────────────
export function fetchShipments() {
  return apiFetch<any[]>('/api/v1/shipments')
}

export function createShipment(data: {
  name: string
  product: string
  country: string
  date: string
  notes?: string
}) {
  return apiFetch<any>('/api/v1/shipments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateShipment(id: string, data: Record<string, any>) {
  return apiFetch<any>(`/api/v1/shipments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteShipment(id: string) {
  return apiFetch<void>(`/api/v1/shipments/${id}`, { method: 'DELETE' })
}

// ─── HS Lookup ─────────────────────────────────────────────────
export function fetchHSLookup(hsCode: string) {
  return apiFetch<any>(`/api/v1/hs-lookup/${hsCode}`)
}

// ─── Batch Risk Score ─────────────────────────────────────────
export function fetchBatchRiskScore(
  product: string,
  countries: string[],
  companySize: string
) {
  return apiFetch<{
    results: Array<{
      country: string
      score: number
      level: string
      factors: Array<{ category: string; severity: string; detail: string }>
      recommendations: string[]
    }>
  }>('/api/v1/risk-score/batch', {
    method: 'POST',
    body: JSON.stringify({ product, countries, company_size: companySize }),
  })
}

// ─── Batch FTA Savings ────────────────────────────────────────
export function fetchBatchFTASavings(
  countries: string[],
  shipmentValue: number,
  product?: string,
  hsCode?: string
) {
  return apiFetch<{ results: any[] }>('/api/v1/fta-savings/batch', {
    method: 'POST',
    body: JSON.stringify({
      countries,
      shipment_value: shipmentValue,
      product,
      hs_code: hsCode,
    }),
  })
}

// ─── Countries ───────────────────────────────────────────────
export function fetchCountries() {
  return apiFetch<{
    countries: Array<{
      code: string
      name: string
      flag: string
    }>
  }>('/api/v1/countries')
}

// ─── FTA Agreements & Export Schemes ─────────────────────────
export function fetchFTAAgreements() {
  return apiFetch<{
    agreements: Array<{
      country_code: string
      name: string
      status: string
      preferential_tariff: boolean
      effective_date?: string
      round?: string
      notes?: string
    }>
  }>('/api/v1/fta-agreements')
}

export function fetchExportSchemes() {
  return apiFetch<{
    schemes: Array<{
      name: string
      description: string
      status: string
    }>
  }>('/api/v1/export-schemes')
}

// ─── Admin: Scraper Status ────────────────────────────────────
export function fetchScraperStatus() {
  return apiFetch<{ jobs: any[] }>('/api/v1/admin/scraper-status')
}

export function triggerScraper(scraperName: string) {
  return apiFetch<{ status: string }>(`/api/v1/admin/scraper-trigger/${scraperName}`, {
    method: 'POST',
  })
}

// ─── Blob Fetch Helper ───────────────────────────────────────
async function apiFetchBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `API error: ${res.status}`)
  }

  return res.blob()
}

// ─── Compliance Gate ──────────────────────────────────────────
export function runGateCheck(shipmentId: string) {
  return apiFetch<any>(`/api/v1/shipments/${shipmentId}/gate-check`, {
    method: 'POST',
  })
}

export function getGateStatus(shipmentId: string) {
  return apiFetch<any>(`/api/v1/shipments/${shipmentId}/gate-check`)
}

export function downloadCOOPdf(shipmentId: string): Promise<Blob> {
  return apiFetchBlob(`/api/v1/shipments/${shipmentId}/coo-pdf`)
}

export function validateHSCode(hsCode: string, product?: string) {
  return apiFetch<any>('/api/v1/hs-validate', {
    method: 'POST',
    body: JSON.stringify({ hs_code: hsCode, product }),
  })
}

// ─── API Keys ─────────────────────────────────────────────────
export function fetchAPIKeys() {
  return apiFetch<any[]>('/api/v1/api-keys')
}

export function createAPIKey(name: string) {
  return apiFetch<{ key: string; id: string }>('/api/v1/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function revokeAPIKey(id: string) {
  return apiFetch<void>(`/api/v1/api-keys/${id}`, { method: 'DELETE' })
}
