export function generateRoDTEPReport(
  hsCode: string,
  exportValue: number,
  rate: number,
  companyName: string
): void {
  const entitlement = Math.round(exportValue * (rate / 100))
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const refNo = `RODTEP-${Date.now().toString(36).toUpperCase()}`

  const fmtINR = (v: number) => {
    if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`
    if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(2)} L`
    return `₹${v.toLocaleString('en-IN')}`
  }

  const chapter = parseInt(hsCode.replace(/\D/g, '').slice(0, 2), 10)
  const notif60Flag = !isNaN(chapter) && chapter >= 25

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>RoDTEP Recovery Estimate — ${companyName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 13px; line-height: 1.5; }
  .page { max-width: 820px; margin: 0 auto; padding: 44px; }
  .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 10px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #888; margin-bottom: 5px; }
  .title { font-size: 22px; font-weight: 900; color: #1a1a1a; }
  .meta { text-align: right; font-size: 11px; color: #888; line-height: 1.8; }
  .meta strong { color: #1a1a1a; }
  .hero { background: #F0FDF4; border: 2px solid #86EFAC; border-radius: 12px; padding: 28px 32px; margin-bottom: 28px; display: flex; gap: 40px; flex-wrap: wrap; }
  .hero-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #15803D; margin-bottom: 6px; }
  .hero-value { font-size: 36px; font-weight: 900; font-family: 'Courier New', monospace; color: #15803D; line-height: 1; }
  .hero-sub { font-size: 11px; color: #16A34A; margin-top: 4px; }
  .section { margin-bottom: 26px; page-break-inside: avoid; }
  .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #aaa; border-bottom: 1px solid #e8e8e8; padding-bottom: 7px; margin-bottom: 14px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .data-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #aaa; margin-bottom: 4px; }
  .data-value { font-size: 14px; font-weight: 600; color: #1a1a1a; }
  .data-value.mono { font-family: 'Courier New', monospace; font-size: 15px; }
  .flag { background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #92400E; margin-bottom: 20px; }
  .flag strong { color: #C2410C; }
  .footer { border-top: 1px solid #e8e8e8; padding-top: 16px; margin-top: 32px; font-size: 10px; color: #aaa; display: flex; justify-content: space-between; }
  .footer-brand { font-weight: 800; color: #888; letter-spacing: 1px; text-transform: uppercase; }
  .no-print { margin-bottom: 20px; display: flex; gap: 10px; }
  @media print { .page { padding: 24px; } .no-print { display: none !important; } }
</style>
</head>
<body>
<div class="page">
  <div class="no-print">
    <button onclick="window.print()" style="padding:10px 20px;background:#15803D;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">Print / Save as PDF</button>
    <button onclick="window.close()" style="padding:10px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:6px;font-size:13px;cursor:pointer">Close</button>
  </div>
  <div class="header">
    <div>
      <div class="brand">ComplianceOS</div>
      <div class="title">RoDTEP Recovery Estimate</div>
    </div>
    <div class="meta">
      <div><strong>${refNo}</strong></div>
      <div>Generated: ${today}</div>
      <div>Exporter: <strong>${companyName || 'Exporter'}</strong></div>
    </div>
  </div>
  <div class="hero">
    <div class="hero-item">
      <div class="hero-label">Estimated Entitlement</div>
      <div class="hero-value">${fmtINR(entitlement)}</div>
      <div class="hero-sub">On export value of ${fmtINR(exportValue)}</div>
    </div>
    <div class="hero-item">
      <div class="hero-label">RoDTEP Rate</div>
      <div class="hero-value">${rate}%</div>
      <div class="hero-sub">of FOB export value</div>
    </div>
    <div class="hero-item">
      <div class="hero-label">HS Code</div>
      <div class="hero-value" style="font-size:24px">${hsCode}</div>
      <div class="hero-sub">Appendix 4R / Notification 60</div>
    </div>
  </div>
  ${notif60Flag ? `<div class="flag"><strong>Notification 60/2025-26 applies:</strong> RoDTEP rates for HS chapters 25+ were revised (effective Feb 2026). The rate shown reflects the updated schedule. Verify with your IEC-registered CHA before filing claims.</div>` : ''}
  <div class="section">
    <div class="section-title">Calculation Breakdown</div>
    <div class="grid-2">
      <div><div class="data-label">Export Value (FOB)</div><div class="data-value mono">${fmtINR(exportValue)}</div></div>
      <div><div class="data-label">RoDTEP Rate</div><div class="data-value mono">${rate}% of FOB</div></div>
      <div><div class="data-label">Entitlement</div><div class="data-value mono" style="color:#15803D">${fmtINR(entitlement)}</div></div>
      <div><div class="data-label">Scheme</div><div class="data-value">RoDTEP — Appendix 4R</div></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">How to Claim</div>
    <ol style="padding-left:18px;font-size:12.5px;color:#444;line-height:2">
      <li>Declare RoDTEP claim in shipping bill at the time of export</li>
      <li>LEO (Let Export Order) issued by Customs</li>
      <li>Credit transferred to ICEGATE RoDTEP scrip ledger within 30 days</li>
      <li>Scrips can be used to pay Basic Customs Duty on imports</li>
    </ol>
  </div>
  <div class="footer">
    <div class="footer-brand">ComplianceOS — Export Intelligence</div>
    <div>Indicative estimate only. Verify rates with CBIC/DGFT before filing claims.</div>
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
