// ============================================================================
// Bank-Ready Export Deal Pack — generates a lender-facing compliance report
// Opens a styled HTML page in a new tab and triggers the print dialog
// ============================================================================

import { calculateRiskScore } from '@/utils/risk-scoring'
import { generateChecklist } from '@/utils/checklist-generator'
import { FTA_DATABASE } from '@/data/fta'
import { REGULATORY_DB } from '@/data/regulatory-db'
import type { Shipment, CompanyProfile, CountryCode } from '@/types'

const MFN_RATES: Record<string, number> = {
  EU: 7.5, US: 5.0, UK: 6.0, UAE: 5.0, Japan: 4.0, Australia: 5.0,
}

const CBAM_PRODUCTS = ['steel', 'chemicals', 'aluminium', 'cement', 'fertilizer', 'electricity']

export function generateBankReadyDealPack(
  shipment: Shipment,
  companyProfile: CompanyProfile,
  checkedItems: Record<string, boolean>
): void {
  const risk = calculateRiskScore(shipment.product, shipment.country, companyProfile)
  const checklist = generateChecklist(shipment.product, shipment.country)
  const total = checklist.length
  const completed = checklist.filter(c => checkedItems[String(c.id)]).length
  const criticalPending = checklist.filter(
    c => c.priority === 'critical' && !checkedItems[String(c.id)]
  ).length
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0

  const fta = FTA_DATABASE[shipment.country as CountryCode]
  const mfnRate = MFN_RATES[shipment.country] ?? 5.0
  const prefRate = fta?.preferentialTariff ? Math.max(0, mfnRate - 3.5) : mfnRate
  const shipmentValue = shipment.shipmentValue || 0
  const ftaSavings = fta?.preferentialTariff
    ? Math.round(shipmentValue * ((mfnRate - prefRate) / 100))
    : 0

  const countryData = REGULATORY_DB[shipment.country as CountryCode]
  const cbamApplicable = !!(countryData?.cbam?.active && CBAM_PRODUCTS.includes(shipment.product))

  // ── Gate determination ────────────────────────────────────────────────────
  let gateStatus: 'APPROVED' | 'CONDITIONAL' | 'BLOCKED'
  let gateColor: string
  const gateReasons: string[] = []

  if (risk.score >= 70 || criticalPending > 2 || completionPct < 40) {
    gateStatus = 'BLOCKED'
    gateColor = '#ef4444'
    if (risk.score >= 70) gateReasons.push(`Risk score is high (${risk.score}/100) — lender approval unlikely`)
    if (criticalPending > 2) gateReasons.push(`${criticalPending} critical compliance items are incomplete`)
    if (completionPct < 40) gateReasons.push(`Checklist only ${completionPct}% complete — below 40% minimum`)
  } else if (risk.score >= 50 || criticalPending > 0 || completionPct < 75) {
    gateStatus = 'CONDITIONAL'
    gateColor = '#f59e0b'
    if (risk.score >= 50) gateReasons.push(`Moderate risk score (${risk.score}/100) — lender review required`)
    if (criticalPending > 0) gateReasons.push(`${criticalPending} critical item(s) pending — resolve before disbursement`)
    if (completionPct < 75) gateReasons.push(`Checklist at ${completionPct}% — below 75% threshold`)
  } else {
    gateStatus = 'APPROVED'
    gateColor = '#10b981'
    gateReasons.push(`All critical compliance items verified`)
    gateReasons.push(`Risk score within acceptable range (${risk.score}/100)`)
    gateReasons.push(`Checklist ${completionPct}% complete`)
  }

  const riskColor = risk.level === 'high' ? '#ef4444' : risk.level === 'medium' ? '#f59e0b' : '#10b981'
  const progressColor = completionPct >= 75 ? '#10b981' : completionPct >= 40 ? '#f59e0b' : '#ef4444'

  const refNo = `COS-${shipment.id.toUpperCase().slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Bank-Ready Export Deal Pack — ${shipment.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 13px; line-height: 1.5; }
  .page { max-width: 820px; margin: 0 auto; padding: 44px; }

  .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 10px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #888; margin-bottom: 5px; }
  .title { font-size: 22px; font-weight: 900; color: #1a1a1a; }
  .meta { text-align: right; font-size: 11px; color: #888; line-height: 1.8; }
  .meta strong { color: #1a1a1a; }

  .gate-banner { padding: 18px 22px; border-radius: 10px; margin-bottom: 30px; display: flex; align-items: flex-start; gap: 24px; border: 2px solid ${gateColor}44; background: ${gateColor}0d; }
  .gate-left { flex-shrink: 0; }
  .gate-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: ${gateColor}cc; margin-bottom: 4px; }
  .gate-status { font-size: 32px; font-weight: 900; color: ${gateColor}; font-family: 'Courier New', monospace; letter-spacing: -1px; }
  .gate-reasons { list-style: none; padding: 0; }
  .gate-reasons li { font-size: 12px; color: #444; padding: 2px 0; display: flex; gap: 6px; }
  .gate-reasons li::before { content: '→'; color: ${gateColor}; font-weight: 700; flex-shrink: 0; }

  .section { margin-bottom: 26px; page-break-inside: avoid; }
  .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #aaa; border-bottom: 1px solid #e8e8e8; padding-bottom: 7px; margin-bottom: 14px; }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

  .data-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #aaa; margin-bottom: 4px; }
  .data-value { font-size: 14px; font-weight: 600; color: #1a1a1a; }
  .data-value.mono { font-family: 'Courier New', monospace; font-size: 15px; }
  .data-value.cap { text-transform: capitalize; }

  .score-num { font-size: 54px; font-weight: 900; font-family: 'Courier New', monospace; color: ${riskColor}; line-height: 1; }
  .score-denom { font-size: 20px; color: #ccc; font-family: 'Courier New', monospace; }
  .score-level { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; color: ${riskColor}; }

  .progress-track { background: #eee; border-radius: 99px; height: 7px; margin-top: 7px; }
  .progress-fill { height: 7px; border-radius: 99px; background: ${progressColor}; width: ${completionPct}%; }

  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #bbb; padding: 0 10px 7px 0; border-bottom: 1px solid #eee; }
  td { padding: 6px 10px 6px 0; border-bottom: 1px solid #f5f5f5; vertical-align: top; color: #333; }

  .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 5px; vertical-align: middle; flex-shrink: 0; }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .pill-green { background: #dcfce7; color: #15803d; }
  .pill-red { background: #fee2e2; color: #b91c1c; }
  .pill-yellow { background: #fef9c3; color: #a16207; }
  .pill-gray { background: #f1f5f9; color: #64748b; }

  .savings-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-top: 12px; }
  .savings-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #166534; margin-bottom: 3px; }
  .savings-amount { font-size: 22px; font-weight: 900; font-family: 'Courier New', monospace; color: #16a34a; }

  .rec-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .rec-list li { display: flex; gap: 10px; font-size: 12px; color: #444; align-items: flex-start; }
  .rec-num { font-family: 'Courier New', monospace; font-size: 10px; color: #bbb; padding-top: 1px; flex-shrink: 0; }

  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #bbb; }
  .footer-brand { font-weight: 800; color: #888; letter-spacing: 1.5px; text-transform: uppercase; font-size: 10px; }

  @media print {
    .page { padding: 24px; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Print button (hidden on print) -->
  <div class="no-print" style="margin-bottom:20px;display:flex;gap:10px">
    <button onclick="window.print()" style="padding:10px 20px;background:#1a1a1a;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">Print / Save as PDF</button>
    <button onclick="window.close()" style="padding:10px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:6px;font-size:13px;cursor:pointer">Close</button>
  </div>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">ComplianceOS</div>
      <div class="title">Bank-Ready Export Deal Pack</div>
    </div>
    <div class="meta">
      <div><strong>${refNo}</strong></div>
      <div>Generated: ${today}</div>
      <div>Exporter: <strong>${companyProfile.name || 'Exporter'}</strong></div>
      <div>Company size: ${companyProfile.size}</div>
    </div>
  </div>

  <!-- Gate Status -->
  <div class="gate-banner">
    <div class="gate-left">
      <div class="gate-label">Pre-Shipment Compliance Gate</div>
      <div class="gate-status">${gateStatus}</div>
    </div>
    <ul class="gate-reasons">
      ${gateReasons.map(r => `<li>${r}</li>`).join('')}
    </ul>
  </div>

  <!-- Shipment Details -->
  <div class="section">
    <div class="section-title">Shipment Details</div>
    <div class="grid-3">
      <div><div class="data-label">Shipment Name</div><div class="data-value">${shipment.name}</div></div>
      <div><div class="data-label">Product</div><div class="data-value cap">${shipment.product}</div></div>
      <div><div class="data-label">Destination</div><div class="data-value">${countryData?.flag || ''} ${countryData?.name || shipment.country}</div></div>
      <div><div class="data-label">Ship Date</div><div class="data-value">${shipment.date}</div></div>
      ${shipment.hsCode ? `<div><div class="data-label">HS Code</div><div class="data-value mono">${shipment.hsCode}</div></div>` : ''}
      ${shipmentValue > 0 ? `<div><div class="data-label">Shipment Value</div><div class="data-value mono">₹${shipmentValue.toLocaleString('en-IN')}</div></div>` : ''}
    </div>
  </div>

  <!-- Risk Assessment -->
  <div class="section">
    <div class="section-title">Compliance Risk Assessment</div>
    <div class="grid-2">
      <div>
        <div style="display:flex;align-items:baseline;gap:6px">
          <span class="score-num">${risk.score}</span>
          <span class="score-denom">/100</span>
        </div>
        <div class="score-level">${risk.level} risk</div>
      </div>
      <div>
        <table>
          <thead><tr><th>Factor</th><th>Severity</th><th>Detail</th></tr></thead>
          <tbody>
            ${risk.factors.slice(0, 7).map(f => {
              const dotColor = f.severity === 'high' ? '#ef4444' : f.severity === 'medium' ? '#f59e0b' : f.severity === 'positive' ? '#10b981' : '#94a3b8'
              return `<tr>
                <td style="font-weight:600;white-space:nowrap">${f.category}</td>
                <td><span class="dot" style="background:${dotColor}"></span>${f.severity}</td>
                <td style="color:#666;font-size:11px">${f.detail}</td>
              </tr>`
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Checklist Progress -->
  <div class="section">
    <div class="section-title">Compliance Checklist Progress</div>
    <div class="grid-4">
      <div>
        <div class="data-label">Completion</div>
        <div class="data-value mono">${completionPct}%</div>
        <div class="progress-track"><div class="progress-fill"></div></div>
      </div>
      <div><div class="data-label">Verified</div><div class="data-value mono">${completed} / ${total}</div></div>
      <div>
        <div class="data-label">Critical Pending</div>
        <div class="data-value mono" style="color:${criticalPending > 0 ? '#ef4444' : '#10b981'}">${criticalPending}</div>
      </div>
      <div>
        <div class="data-label">Status</div>
        <div style="margin-top:4px">
          <span class="pill ${completionPct >= 75 && criticalPending === 0 ? 'pill-green' : completionPct >= 40 ? 'pill-yellow' : 'pill-red'}">
            ${completionPct >= 75 && criticalPending === 0 ? 'On Track' : completionPct >= 40 ? 'In Progress' : 'Needs Attention'}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- FTA Eligibility -->
  <div class="section">
    <div class="section-title">Free Trade Agreement Eligibility</div>
    <div class="grid-2">
      <div>
        <div class="data-label">Agreement</div>
        <div class="data-value" style="margin-bottom:8px">${fta?.name || 'No active FTA'}</div>
        <span class="pill ${fta?.preferentialTariff ? 'pill-green' : fta?.status === 'Under Negotiation' ? 'pill-yellow' : 'pill-gray'}">
          ${fta?.preferentialTariff ? 'Preferential Tariff Available' : fta?.status || 'No FTA'}
        </span>
        ${fta?.effectiveDate ? `<div style="font-size:11px;color:#aaa;margin-top:6px">Effective: ${fta.effectiveDate}</div>` : ''}
        <div style="font-size:11px;color:#888;margin-top:8px">${fta?.notes || ''}</div>
      </div>
      <div>
        ${fta?.preferentialTariff ? `
        <div class="grid-2" style="gap:10px;margin-bottom:12px">
          <div><div class="data-label">MFN Rate</div><div class="data-value mono">${mfnRate}%</div></div>
          <div><div class="data-label">Preferential Rate</div><div class="data-value mono">${prefRate.toFixed(1)}%</div></div>
        </div>
        ${ftaSavings > 0 ? `<div class="savings-box">
          <div class="savings-label">Estimated Duty Savings on this Shipment</div>
          <div class="savings-amount">₹${ftaSavings.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#15803d;margin-top:3px">Certificate of Origin required to unlock</div>
        </div>` : ''}
        ` : `<div><div class="data-label">Notes</div><div style="font-size:12px;color:#666;margin-top:4px">Standard MFN rates apply. ${fta?.notes || ''}</div></div>`}
      </div>
    </div>
  </div>

  <!-- CBAM Status -->
  <div class="section">
    <div class="section-title">CBAM Carbon Border Adjustment Status</div>
    <div class="grid-2">
      <div>
        <div class="data-label">Applicability</div>
        <div style="margin-top:6px">
          <span class="pill ${cbamApplicable ? 'pill-red' : 'pill-green'}">
            ${cbamApplicable ? 'CBAM Applicable' : 'Not in CBAM Scope'}
          </span>
        </div>
      </div>
      <div>
        <div class="data-label">Requirement</div>
        <div style="font-size:12px;color:#555;margin-top:4px">
          ${cbamApplicable
            ? 'Embedded emissions declaration required. Verified carbon data must be provided to EU importer before shipment.'
            : `${shipment.product.charAt(0).toUpperCase() + shipment.product.slice(1)} to ${shipment.country} is currently outside CBAM scope. Monitor for regulatory expansion.`}
        </div>
      </div>
    </div>
  </div>

  <!-- Recommendations -->
  ${risk.recommendations.length > 0 ? `
  <div class="section">
    <div class="section-title">Recommended Actions Before Financing</div>
    <ul class="rec-list">
      ${risk.recommendations.map((r, i) => `<li><span class="rec-num">${String(i + 1).padStart(2, '0')}</span>${r}</li>`).join('')}
    </ul>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">ComplianceOS — Export Intelligence</div>
    <div>For informational use only. Verify with qualified compliance counsel before financing decisions.</div>
  </div>

</div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
