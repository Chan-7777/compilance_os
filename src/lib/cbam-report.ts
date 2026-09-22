// ============================================================================
// CBAM Quarterly Declaration — builds the per-consignment embedded-emissions
// report an EU importer needs from its Indian supplier under Regulation
// (EU) 2023/956. Opens as a printable page (same pattern as rodtep-report.ts).
// ============================================================================

import type { CBAMSector } from '@/data/cbam-hs-codes'

export interface CBAMConsignment {
  shippingBillNo: string | null
  date: string
  hsCode: string
  description: string
  sector: CBAMSector
  weightTonnes: number
  weightSource: 'declared' | 'estimated'
  co2eTonnes: number
  emissionsSource: 'climatiq' | 'default'
  intensity: number  // tCO2e per tonne of goods
}

// Indicative default specific-emission intensities (tCO2e per tonne) used
// ONLY when no actual installation data or Climatiq estimate is available.
// These are placeholders for the customer to replace with real data — the
// EU applies its own default values (with mark-ups) when actuals are absent.
export const CBAM_DEFAULT_INTENSITY: Record<CBAMSector, number> = {
  'Iron and steel': 2.1,
  'Aluminium': 9.0,
  'Cement': 0.7,
  'Fertilisers': 2.0,
  'Hydrogen': 10.0,
  'Electricity': 0.7,
}

export function quarterOf(dateISO: string): string {
  const d = new Date(dateISO)
  return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`
}

export function generateCBAMDeclaration(
  consignments: CBAMConsignment[],
  quarter: string,
  exporter: { name: string; iec?: string; gstin?: string; address?: string; city?: string; state?: string },
  carbonPriceEUR = 65
): void {
  const refNo = `CBAM-${quarter.replace(/\s/g, '')}-${Date.now().toString(36).toUpperCase()}`
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const totalWeight = consignments.reduce((s, c) => s + c.weightTonnes, 0)
  const totalCO2e = consignments.reduce((s, c) => s + c.co2eTonnes, 0)
  const estimatedCount = consignments.filter(c => c.emissionsSource === 'default' || c.weightSource === 'estimated').length
  const bySector = new Map<CBAMSector, { weight: number; co2e: number; n: number }>()
  for (const c of consignments) {
    const cur = bySector.get(c.sector) ?? { weight: 0, co2e: 0, n: 0 }
    bySector.set(c.sector, { weight: cur.weight + c.weightTonnes, co2e: cur.co2e + c.co2eTonnes, n: cur.n + 1 })
  }
  const f2 = (n: number) => n.toFixed(2)
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const rows = consignments.map(c => `
    <tr>
      <td>${esc(c.shippingBillNo ?? '—')}</td>
      <td>${esc(c.date)}</td>
      <td class="mono">${esc(c.hsCode)}</td>
      <td>${esc(c.description)}</td>
      <td>${esc(c.sector)}</td>
      <td class="num">${f2(c.weightTonnes)}${c.weightSource === 'estimated' ? '<sup>e</sup>' : ''}</td>
      <td class="num">${f2(c.intensity)}</td>
      <td class="num">${f2(c.co2eTonnes)}${c.emissionsSource === 'default' ? '<sup>d</sup>' : ''}</td>
    </tr>`).join('')

  const sectorRows = [...bySector.entries()].map(([sector, v]) => `
    <tr><td>${esc(sector)}</td><td class="num">${v.n}</td><td class="num">${f2(v.weight)}</td><td class="num">${f2(v.co2e)}</td><td class="num">€${Math.round(v.co2e * carbonPriceEUR).toLocaleString('en-IN')}</td></tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>CBAM Embedded Emissions Declaration — ${esc(exporter.name)} — ${esc(quarter)}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Helvetica Neue',Arial,sans-serif; color:#1a1a1a; background:#fff; font-size:12px; line-height:1.5; }
  .page { max-width:960px; margin:0 auto; padding:40px; }
  .header { border-bottom:3px solid #1a1a1a; padding-bottom:16px; margin-bottom:24px; display:flex; justify-content:space-between; }
  .brand { font-size:10px; font-weight:800; letter-spacing:3px; text-transform:uppercase; color:#888; margin-bottom:4px; }
  .title { font-size:20px; font-weight:900; }
  .sub { font-size:12px; color:#555; margin-top:4px; }
  .meta { text-align:right; font-size:11px; color:#888; line-height:1.8; } .meta strong { color:#1a1a1a; }
  .hero { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
  .kpi { background:#F0FDFA; border:1px solid #99F6E4; border-radius:10px; padding:14px 16px; }
  .kpi-label { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:#0F766E; margin-bottom:4px; }
  .kpi-value { font-size:24px; font-weight:900; font-family:'Courier New',monospace; color:#0F766E; line-height:1; }
  .kpi-sub { font-size:10px; color:#0F766E; margin-top:4px; }
  .section { margin-bottom:24px; page-break-inside:avoid; }
  .section-title { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:2px; color:#aaa; border-bottom:1px solid #e8e8e8; padding-bottom:6px; margin-bottom:12px; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:1px; color:#888; padding:6px 8px; border-bottom:2px solid #e8e8e8; }
  td { padding:6px 8px; border-bottom:1px solid #f0f0f0; vertical-align:top; }
  td.num, th.num { text-align:right; font-family:'Courier New',monospace; }
  td.mono { font-family:'Courier New',monospace; }
  tfoot td { font-weight:800; border-top:2px solid #1a1a1a; }
  .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  .data-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:#aaa; margin-bottom:2px; }
  .data-value { font-size:13px; font-weight:600; }
  .flag { background:#FFF7ED; border:1px solid #FED7AA; border-radius:8px; padding:10px 14px; font-size:11px; color:#92400E; margin-bottom:18px; }
  .flag strong { color:#C2410C; }
  .decl { font-size:11px; color:#444; line-height:1.7; }
  .sig { display:flex; justify-content:space-between; margin-top:36px; }
  .sig div { width:45%; border-top:1px solid #666; padding-top:6px; font-size:10px; color:#666; }
  .footer { border-top:1px solid #e8e8e8; padding-top:12px; margin-top:28px; font-size:10px; color:#aaa; display:flex; justify-content:space-between; }
  .no-print { margin-bottom:18px; display:flex; gap:10px; }
  @media print { .page { padding:20px; } .no-print { display:none !important; } }
</style></head>
<body><div class="page">
  <div class="no-print">
    <button onclick="window.print()" style="padding:10px 20px;background:#0F766E;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">Print / Save as PDF</button>
    <button onclick="window.close()" style="padding:10px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:6px;font-size:13px;cursor:pointer">Close</button>
  </div>
  <div class="header">
    <div>
      <div class="brand">ComplianceOS</div>
      <div class="title">CBAM Embedded Emissions Declaration</div>
      <div class="sub">Supplier communication under Regulation (EU) 2023/956 · Reporting period ${esc(quarter)}</div>
    </div>
    <div class="meta">
      <div><strong>${refNo}</strong></div>
      <div>Generated: ${today}</div>
      <div>Carbon price assumed: <strong>€${carbonPriceEUR}/tCO₂e</strong></div>
    </div>
  </div>

  <div class="hero">
    <div class="kpi"><div class="kpi-label">Consignments</div><div class="kpi-value">${consignments.length}</div><div class="kpi-sub">EU-bound, CBAM Annex I</div></div>
    <div class="kpi"><div class="kpi-label">Goods shipped</div><div class="kpi-value">${f2(totalWeight)}</div><div class="kpi-sub">tonnes</div></div>
    <div class="kpi"><div class="kpi-label">Embedded emissions</div><div class="kpi-value">${f2(totalCO2e)}</div><div class="kpi-sub">tCO₂e (direct)</div></div>
    <div class="kpi"><div class="kpi-label">Indicative levy exposure</div><div class="kpi-value">€${Math.round(totalCO2e * carbonPriceEUR).toLocaleString('en-IN')}</div><div class="kpi-sub">before free-allocation & CPS credit</div></div>
  </div>

  ${estimatedCount > 0 ? `<div class="flag"><strong>${estimatedCount} of ${consignments.length} consignments use estimated values</strong> (<sup>e</sup> weight estimated from FOB value, <sup>d</sup> default emission intensity). The EU applies its own default values with a mark-up when actual installation data is not provided. Replace estimates with actual production data from your plant before your importer files.</div>` : ''}

  <div class="section">
    <div class="section-title">Declarant (Supplier / Operator of Installation)</div>
    <div class="grid-2">
      <div><div class="data-label">Legal name</div><div class="data-value">${esc(exporter.name || '—')}</div></div>
      <div><div class="data-label">IEC / GSTIN</div><div class="data-value">${esc(exporter.iec ?? '—')} / ${esc(exporter.gstin ?? '—')}</div></div>
      <div><div class="data-label">Installation location</div><div class="data-value">${esc([exporter.address, exporter.city, exporter.state].filter(Boolean).join(', ') || 'India')}</div></div>
      <div><div class="data-label">Country of origin</div><div class="data-value">India (IN)</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Summary by CBAM sector</div>
    <table>
      <thead><tr><th>Sector</th><th class="num">Consignments</th><th class="num">Tonnes</th><th class="num">tCO₂e</th><th class="num">Indicative levy</th></tr></thead>
      <tbody>${sectorRows}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${consignments.length}</td><td class="num">${f2(totalWeight)}</td><td class="num">${f2(totalCO2e)}</td><td class="num">€${Math.round(totalCO2e * carbonPriceEUR).toLocaleString('en-IN')}</td></tr></tfoot>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Consignment-level embedded emissions</div>
    <table>
      <thead><tr><th>Shipping bill</th><th>Date</th><th>CN / HS</th><th>Goods</th><th>Sector</th><th class="num">Tonnes</th><th class="num">tCO₂e / t</th><th class="num">tCO₂e</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Declaration</div>
    <p class="decl">The undersigned declares that the specific embedded emissions stated above for goods listed in Annex I of Regulation (EU) 2023/956 have been determined in accordance with the methodology in Implementing Regulation (EU) 2023/1773, that values marked <sup>d</sup> are default values pending actual installation monitoring data, and that this information is provided to the EU importer / authorised CBAM declarant for the purpose of its quarterly CBAM report.</p>
    <div class="sig"><div>Authorised signatory, ${esc(exporter.name || 'Exporter')}</div><div>Date / Place</div></div>
  </div>

  <div class="footer">
    <div><strong>ComplianceOS</strong> — Export Intelligence</div>
    <div>Direct emissions only. Indicative levy excludes EU free-allocation phase-in and any carbon price paid in India. Not a substitute for verified MRV data.</div>
  </div>
</div></body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}
