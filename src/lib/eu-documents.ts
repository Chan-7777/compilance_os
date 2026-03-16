// ============================================================================
// EU Export Compliance Documents — generates EU-specific export documents
// Opens a styled HTML page in a new tab and triggers the print dialog
// Follows the same pattern as src/lib/deal-pack.ts
// ============================================================================

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface GSPStatementData {
  exporterName: string
  exporterAddress: string
  exporterIEC: string
  buyerName: string
  buyerCountry: string
  productDescription: string
  hsCode: string
  quantity: string
  unit: string
  invoiceNumber: string
  invoiceDate: string
  shipmentValue: number
  currency: string
  mfnRate: number
  gspRate: number
  originDeclaration: string
}

export interface EUInvoiceData {
  invoiceNumber: string
  invoiceDate: string
  exporterName: string
  exporterAddress: string
  exporterIEC: string
  exporterGSTIN?: string
  buyerName: string
  buyerAddress: string
  buyerEORI?: string
  buyerVAT?: string
  productDescription: string
  hsCode: string
  quantity: string
  unit: string
  unitPrice: number
  totalValue: number
  currency: string
  countryOfOrigin: string
  incoterms: string
  portOfLoading: string
  portOfDischarge: string
  paymentTerms: string
  grossWeight: string
  netWeight: string
  packages: string
  declarationText: string
}

export interface REXData {
  rexNumber: string
  exporterName: string
  exporterAddress: string
  exporterIEC: string
  productDescription: string
  hsCode: string
  invoiceNumber: string
  invoiceDate: string
  shipmentValue: number
  currency: string
  originCriteria: string
}

export interface EUDRData {
  operatorName: string
  operatorAddress: string
  productDescription: string
  hsCode: string
  commodityType: string
  countryOfProduction: string
  geoCoordinates?: string
  invoiceNumber: string
  quantity: string
  declarationDate: string
  traceabilitySystem: string
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function openAndPrint(html: string): void {
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

function today(): string {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

function refNo(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`
}

/** Shared base CSS used across all four documents */
const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 13px; line-height: 1.5; }
  .page { max-width: 820px; margin: 0 auto; padding: 44px; }

  .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: flex-start; }
  .brand { font-size: 10px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #888; margin-bottom: 5px; }
  .title { font-size: 22px; font-weight: 900; color: #1a1a1a; }
  .subtitle { font-size: 12px; color: #666; margin-top: 4px; font-style: italic; }
  .meta { text-align: right; font-size: 11px; color: #888; line-height: 1.8; }
  .meta strong { color: #1a1a1a; }

  .section { margin-bottom: 26px; page-break-inside: avoid; }
  .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #aaa; border-bottom: 1px solid #e8e8e8; padding-bottom: 7px; margin-bottom: 14px; }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }

  .data-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #aaa; margin-bottom: 4px; }
  .data-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }
  .data-value.mono { font-family: 'Courier New', monospace; font-size: 14px; }

  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th { text-align: left; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #bbb; padding: 0 10px 7px 0; border-bottom: 2px solid #1a1a1a; }
  td { padding: 7px 10px 7px 0; border-bottom: 1px solid #f0f0f0; vertical-align: top; color: #333; }
  tr:last-child td { border-bottom: none; }

  .pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .pill-green { background: #dcfce7; color: #15803d; }
  .pill-blue { background: #dbeafe; color: #1d4ed8; }
  .pill-yellow { background: #fef9c3; color: #a16207; }
  .pill-gray { background: #f1f5f9; color: #64748b; }

  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; }
  .info-box.blue { background: #eff6ff; border-color: #bfdbfe; }
  .info-box.green { background: #f0fdf4; border-color: #bbf7d0; }

  .savings-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-top: 12px; }
  .savings-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #166534; margin-bottom: 3px; }
  .savings-amount { font-size: 26px; font-weight: 900; font-family: 'Courier New', monospace; color: #16a34a; }

  .declaration-box { border: 2px solid #1a1a1a; border-radius: 6px; padding: 16px 20px; margin: 16px 0; font-size: 12px; line-height: 1.7; color: #222; background: #fafafa; font-style: italic; }

  .sig-block { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
  .sig-line { border-top: 1px solid #1a1a1a; margin-top: 48px; padding-top: 7px; font-size: 11px; color: #666; }

  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #bbb; }
  .footer-brand { font-weight: 800; color: #888; letter-spacing: 1.5px; text-transform: uppercase; font-size: 10px; }

  @media print {
    .page { padding: 24px; }
    .no-print { display: none !important; }
    @page { margin: 20mm; }
  }
`

const PRINT_BUTTONS = `
  <div class="no-print" style="margin-bottom:20px;display:flex;gap:10px">
    <button onclick="window.print()" style="padding:10px 20px;background:#1a1a1a;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">Print / Save as PDF</button>
    <button onclick="window.close()" style="padding:10px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:6px;font-size:13px;cursor:pointer">Close</button>
  </div>
`

// ── 1. GSP Statement on Origin ────────────────────────────────────────────────

export function generateGSPStatement(data: GSPStatementData): void {
  const ref = refNo('GSP')
  const generatedOn = today()

  const originDeclaration = data.originDeclaration ||
    'The exporter of the products covered by this document declares that, except where otherwise clearly indicated, these products are of Indian preferential origin.'

  const dutySavings = Math.round(((data.mfnRate - data.gspRate) / 100) * data.shipmentValue)
  const savingsPositive = dutySavings > 0

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>GSP Statement on Origin — ${data.invoiceNumber}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="page">

  ${PRINT_BUTTONS}

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">ComplianceOS — EU Export Documents</div>
      <div class="title">Statement on Origin</div>
      <div class="subtitle">EU GSP / REX System — EUR.1 Equivalent</div>
    </div>
    <div class="meta">
      <div><strong>${ref}</strong></div>
      <div>Generated: ${generatedOn}</div>
      <div>Invoice: <strong>${data.invoiceNumber}</strong></div>
      <div>Invoice Date: ${data.invoiceDate}</div>
    </div>
  </div>

  <!-- Reference notice -->
  <div class="info-box blue" style="margin-bottom:24px">
    <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1d4ed8;margin-bottom:4px">EUR.1 Equivalent — India-EU Generalised System of Preferences</div>
    <div style="font-size:12px;color:#1e3a8a">This statement on origin is issued under EU GSP Regulation No 978/2012. India is a designated beneficiary country eligible for preferential duty treatment on qualifying goods.</div>
  </div>

  <!-- Exporter & Buyer -->
  <div class="section">
    <div class="section-title">Parties</div>
    <div class="grid-2">
      <div class="info-box">
        <div class="data-label" style="margin-bottom:8px">Exporter (India)</div>
        <div class="data-value" style="font-size:14px;margin-bottom:4px">${data.exporterName}</div>
        <div style="font-size:12px;color:#555;white-space:pre-line">${data.exporterAddress}</div>
        <div style="margin-top:8px"><span class="data-label">IEC: </span><span style="font-family:'Courier New',monospace;font-size:12px">${data.exporterIEC}</span></div>
      </div>
      <div class="info-box">
        <div class="data-label" style="margin-bottom:8px">Buyer (EU)</div>
        <div class="data-value" style="font-size:14px;margin-bottom:4px">${data.buyerName}</div>
        <div style="font-size:12px;color:#555">${data.buyerCountry}</div>
      </div>
    </div>
  </div>

  <!-- Product Details -->
  <div class="section">
    <div class="section-title">Product Details</div>
    <table>
      <thead>
        <tr>
          <th>HS Code</th>
          <th>Description of Goods</th>
          <th>Quantity</th>
          <th>Unit</th>
          <th>Invoice Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-family:'Courier New',monospace;font-weight:600">${data.hsCode}</td>
          <td>${data.productDescription}</td>
          <td style="font-family:'Courier New',monospace">${data.quantity}</td>
          <td>${data.unit}</td>
          <td style="font-family:'Courier New',monospace">${data.currency} ${data.shipmentValue.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Origin Declaration -->
  <div class="section">
    <div class="section-title">Origin Declaration</div>
    <div class="declaration-box">${originDeclaration}</div>
  </div>

  <!-- Duty Analysis -->
  <div class="section">
    <div class="section-title">Duty Rate Analysis</div>
    <div class="grid-2">
      <div>
        <div class="grid-2" style="gap:12px">
          <div>
            <div class="data-label">MFN (Standard) Rate</div>
            <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:900;color:#ef4444">${data.mfnRate}%</div>
          </div>
          <div>
            <div class="data-label">GSP Preferential Rate</div>
            <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:900;color:#10b981">${data.gspRate}%</div>
          </div>
        </div>
      </div>
      <div>
        ${savingsPositive ? `<div class="savings-box">
          <div class="savings-label">Estimated Duty Savings (this shipment)</div>
          <div class="savings-amount">${data.currency} ${dutySavings.toLocaleString('en-IN')}</div>
          <div style="font-size:10px;color:#15803d;margin-top:4px">Based on (${data.mfnRate}% − ${data.gspRate}%) × ${data.currency} ${data.shipmentValue.toLocaleString('en-IN')}</div>
        </div>` : `<div class="info-box">
          <div class="data-label">Savings</div>
          <div style="font-size:12px;color:#666;margin-top:4px">No duty differential — MFN and GSP rates are equal for this commodity.</div>
        </div>`}
      </div>
    </div>
  </div>

  <!-- Signature Block -->
  <div class="sig-block">
    <div>
      <div class="data-label">Place &amp; Date</div>
      <div class="data-value" style="margin-top:4px">India, ${generatedOn}</div>
      <div class="sig-line">Authorised Signatory</div>
    </div>
    <div>
      <div class="data-label">Exporter's Stamp &amp; Signature</div>
      <div class="sig-line">Name, Designation &amp; Company Seal</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">ComplianceOS — EU Export Intelligence</div>
    <div>Valid under EU GSP Regulation No 978/2012. India is a beneficiary country. Ref: ${ref}</div>
  </div>

</div>
</body>
</html>`

  openAndPrint(html)
}

// ── 2. EU Customs-Compliant Commercial Invoice ────────────────────────────────

export function generateEUCommercialInvoice(data: EUInvoiceData): void {
  const ref = refNo('INV-EU')
  const generatedOn = today()

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>EU Commercial Invoice — ${data.invoiceNumber}</title>
<style>${BASE_CSS}
  .inv-header-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 22px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
  .inv-number { font-family: 'Courier New', monospace; font-size: 28px; font-weight: 900; color: #1a1a1a; letter-spacing: -1px; }
  tfoot td { font-weight: 700; font-size: 13px; border-top: 2px solid #1a1a1a !important; border-bottom: none; padding-top: 10px; }
</style>
</head>
<body>
<div class="page">

  ${PRINT_BUTTONS}

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">ComplianceOS — EU Export Documents</div>
      <div class="title">Commercial Invoice</div>
      <div class="subtitle">EU Customs-Compliant — All Required Fields Included</div>
    </div>
    <div class="meta">
      <div><strong>${ref}</strong></div>
      <div>Generated: ${generatedOn}</div>
    </div>
  </div>

  <!-- Invoice ID bar -->
  <div class="inv-header-box">
    <div>
      <div class="data-label">Invoice Number</div>
      <div class="inv-number">${data.invoiceNumber}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">Date: ${data.invoiceDate}</div>
    </div>
    <div style="text-align:right">
      <div class="data-label" style="margin-bottom:6px">Incoterms</div>
      <span class="pill pill-blue" style="font-size:13px;padding:5px 14px">${data.incoterms}</span>
      <div style="margin-top:10px"><div class="data-label">Payment Terms</div><div class="data-value">${data.paymentTerms}</div></div>
    </div>
  </div>

  <!-- Exporter & Buyer -->
  <div class="section">
    <div class="section-title">Parties</div>
    <div class="grid-2">
      <div class="info-box">
        <div class="data-label" style="margin-bottom:8px">Exporter / Seller</div>
        <div class="data-value" style="font-size:15px;margin-bottom:6px">${data.exporterName}</div>
        <div style="font-size:12px;color:#555;white-space:pre-line;margin-bottom:8px">${data.exporterAddress}</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          <div><span class="data-label">IEC: </span><span style="font-family:'Courier New',monospace;font-size:12px">${data.exporterIEC}</span></div>
          ${data.exporterGSTIN ? `<div><span class="data-label">GSTIN: </span><span style="font-family:'Courier New',monospace;font-size:12px">${data.exporterGSTIN}</span></div>` : ''}
        </div>
      </div>
      <div class="info-box">
        <div class="data-label" style="margin-bottom:8px">Buyer / Consignee</div>
        <div class="data-value" style="font-size:15px;margin-bottom:6px">${data.buyerName}</div>
        <div style="font-size:12px;color:#555;white-space:pre-line;margin-bottom:8px">${data.buyerAddress}</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${data.buyerEORI ? `<div><span class="data-label">EORI: </span><span style="font-family:'Courier New',monospace;font-size:12px">${data.buyerEORI}</span></div>` : ''}
          ${data.buyerVAT ? `<div><span class="data-label">VAT No: </span><span style="font-family:'Courier New',monospace;font-size:12px">${data.buyerVAT}</span></div>` : ''}
        </div>
      </div>
    </div>
  </div>

  <!-- Shipment Route -->
  <div class="section">
    <div class="section-title">Shipment Details</div>
    <div class="grid-3">
      <div><div class="data-label">Port of Loading</div><div class="data-value">${data.portOfLoading}</div></div>
      <div><div class="data-label">Port of Discharge</div><div class="data-value">${data.portOfDischarge}</div></div>
      <div><div class="data-label">Country of Origin</div><div class="data-value">${data.countryOfOrigin}</div></div>
      <div><div class="data-label">Gross Weight</div><div class="data-value">${data.grossWeight}</div></div>
      <div><div class="data-label">Net Weight</div><div class="data-value">${data.netWeight}</div></div>
      <div><div class="data-label">No. of Packages</div><div class="data-value">${data.packages}</div></div>
    </div>
  </div>

  <!-- Goods Table -->
  <div class="section">
    <div class="section-title">Description of Goods</div>
    <table>
      <thead>
        <tr>
          <th>HS Code</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Unit Price</th>
          <th style="text-align:right">Total Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-family:'Courier New',monospace;font-weight:600">${data.hsCode}</td>
          <td>${data.productDescription}</td>
          <td style="font-family:'Courier New',monospace">${data.quantity}</td>
          <td>${data.unit}</td>
          <td style="font-family:'Courier New',monospace">${data.currency} ${data.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="font-family:'Courier New',monospace;text-align:right;font-weight:600">${data.currency} ${data.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="text-align:right;padding-right:10px;border-top:2px solid #1a1a1a;padding-top:10px">TOTAL INVOICE VALUE</td>
          <td style="font-family:'Courier New',monospace;text-align:right;font-size:15px;font-weight:900;border-top:2px solid #1a1a1a;padding-top:10px">${data.currency} ${data.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Customs Declarations -->
  <div class="section">
    <div class="section-title">Customs Declaration</div>
    <div class="declaration-box">${data.declarationText}</div>
  </div>

  <!-- Signature Block -->
  <div class="sig-block">
    <div>
      <div class="data-label">Place &amp; Date</div>
      <div class="data-value" style="margin-top:4px">India, ${data.invoiceDate}</div>
      <div class="sig-line">Authorised Signatory</div>
    </div>
    <div>
      <div class="data-label">Company Seal &amp; Signature</div>
      <div class="sig-line">Name, Designation</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">ComplianceOS — EU Export Intelligence</div>
    <div>EU customs-compliant invoice. Ref: ${ref}</div>
  </div>

</div>
</body>
</html>`

  openAndPrint(html)
}

// ── 3. REX Supplier's Declaration ────────────────────────────────────────────

export function generateREXDeclaration(data: REXData): void {
  const ref = refNo('REX')
  const generatedOn = today()

  const originExplanation = data.originCriteria.toLowerCase().includes('wholly')
    ? 'The product is entirely grown, harvested, extracted, or manufactured in India without incorporating materials from any other country.'
    : 'The product has undergone sufficient processing or transformation in India, conferring Indian origin in accordance with EU GSP rules of origin.'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>REX Declaration — ${data.invoiceNumber}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="page">

  ${PRINT_BUTTONS}

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">ComplianceOS — EU Export Documents</div>
      <div class="title">REX Supplier's Declaration</div>
      <div class="subtitle">Registered Exporter System — EU Preferential Origin</div>
    </div>
    <div class="meta">
      <div><strong>${ref}</strong></div>
      <div>Generated: ${generatedOn}</div>
      <div>Invoice: <strong>${data.invoiceNumber}</strong></div>
      <div>Invoice Date: ${data.invoiceDate}</div>
    </div>
  </div>

  <!-- REX Registration Banner -->
  <div class="info-box blue" style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1d4ed8;margin-bottom:4px">Registered Exporter Number</div>
      <div style="font-family:'Courier New',monospace;font-size:28px;font-weight:900;color:#1e3a8a;letter-spacing:2px">${data.rexNumber}</div>
    </div>
    <span class="pill pill-blue" style="font-size:12px;padding:6px 16px">REX Registered</span>
  </div>

  <!-- Exporter Details -->
  <div class="section">
    <div class="section-title">Registered Exporter Details</div>
    <div class="info-box">
      <div class="grid-3">
        <div>
          <div class="data-label">Exporter Name</div>
          <div class="data-value" style="font-size:14px">${data.exporterName}</div>
        </div>
        <div>
          <div class="data-label">IEC Number</div>
          <div style="font-family:'Courier New',monospace;font-size:14px;font-weight:600">${data.exporterIEC}</div>
        </div>
        <div>
          <div class="data-label">Address</div>
          <div style="font-size:12px;color:#555">${data.exporterAddress}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Product & Invoice Details -->
  <div class="section">
    <div class="section-title">Product &amp; Shipment Details</div>
    <table>
      <thead>
        <tr>
          <th>HS Code</th>
          <th>Description of Goods</th>
          <th>Invoice Value</th>
          <th>Currency</th>
          <th>Origin Criteria</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-family:'Courier New',monospace;font-weight:600">${data.hsCode}</td>
          <td>${data.productDescription}</td>
          <td style="font-family:'Courier New',monospace">${data.shipmentValue.toLocaleString('en-IN')}</td>
          <td>${data.currency}</td>
          <td><span class="pill pill-green">${data.originCriteria}</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Origin Criteria Explanation -->
  <div class="section">
    <div class="section-title">Origin Criteria</div>
    <div class="info-box">
      <div class="data-label" style="margin-bottom:6px">Applied Criterion: ${data.originCriteria}</div>
      <div style="font-size:12px;color:#444;line-height:1.7">${originExplanation}</div>
    </div>
  </div>

  <!-- Declaration Text -->
  <div class="section">
    <div class="section-title">Supplier's Declaration</div>
    <div class="declaration-box">
      The exporter of the products covered by this document (Registered Exporter No. <strong>${data.rexNumber}</strong>) declares that, except where otherwise clearly indicated, these products are of Indian preferential origin under the EU Generalised System of Preferences (GSP). The origin criterion applied is: <strong>${data.originCriteria}</strong>.
      <br><br>
      This declaration applies to invoice <strong>${data.invoiceNumber}</strong> dated <strong>${data.invoiceDate}</strong> for goods with a total value of <strong>${data.currency} ${data.shipmentValue.toLocaleString('en-IN')}</strong>.
    </div>
  </div>

  <!-- Signature Block -->
  <div class="sig-block">
    <div>
      <div class="data-label">Place &amp; Date</div>
      <div class="data-value" style="margin-top:4px">India, ${generatedOn}</div>
      <div class="sig-line">Authorised Signatory</div>
    </div>
    <div>
      <div class="data-label">REX Registered Exporter — Seal &amp; Signature</div>
      <div class="sig-line">Name, Designation &amp; REX No. ${data.rexNumber}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">ComplianceOS — EU Export Intelligence</div>
    <div>Issued under EU REX system. For GSP preferential tariff claims at EU customs. Ref: ${ref}</div>
  </div>

</div>
</body>
</html>`

  openAndPrint(html)
}

// ── 4. EUDR Due Diligence Statement ──────────────────────────────────────────

export function generateEUDRDueDiligenceStatement(data: EUDRData): void {
  const ref = refNo('EUDR')
  const generatedOn = today()
  const ddRef = `DD-${data.hsCode.replace(/\./g, '')}-${Date.now().toString(36).toUpperCase()}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>EUDR Due Diligence Statement — ${data.invoiceNumber}</title>
<style>${BASE_CSS}
  .eudr-badge { display:inline-flex; align-items:center; gap:8px; background:#f0fdf4; border:1.5px solid #86efac; border-radius:8px; padding:10px 18px; }
  .eudr-badge-text { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#15803d; }
  .warning-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:14px 18px; margin-bottom:16px; }
  .warning-label { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#b45309; margin-bottom:4px; }
</style>
</head>
<body>
<div class="page">

  ${PRINT_BUTTONS}

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">ComplianceOS — EU Export Documents</div>
      <div class="title">EUDR Due Diligence Statement</div>
      <div class="subtitle">EU Deforestation Regulation (EU) 2023/1115 — Operator Declaration</div>
    </div>
    <div class="meta">
      <div><strong>${ref}</strong></div>
      <div>Generated: ${generatedOn}</div>
      <div>Invoice: <strong>${data.invoiceNumber}</strong></div>
      <div>DD Ref: <strong>${ddRef}</strong></div>
    </div>
  </div>

  <!-- Compliance Banner -->
  <div class="info-box green" style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#15803d;margin-bottom:4px">Regulatory Compliance</div>
      <div style="font-size:13px;color:#166534;font-weight:600">EU Deforestation Regulation (EU) 2023/1115 — Due Diligence Statement</div>
      <div style="font-size:11px;color:#166534;margin-top:4px">This statement confirms compliance obligations for relevant commodities entering the EU market.</div>
    </div>
    <div class="eudr-badge">
      <div style="width:10px;height:10px;background:#16a34a;border-radius:50%"></div>
      <div class="eudr-badge-text">EUDR Compliant</div>
    </div>
  </div>

  <!-- Operator Details -->
  <div class="section">
    <div class="section-title">Operator Details</div>
    <div class="info-box">
      <div class="grid-2">
        <div>
          <div class="data-label">Operator Name</div>
          <div class="data-value" style="font-size:15px;margin-bottom:8px">${data.operatorName}</div>
          <div class="data-label">Operator Address</div>
          <div style="font-size:12px;color:#555;white-space:pre-line">${data.operatorAddress}</div>
        </div>
        <div>
          <div class="data-label">Due Diligence Reference</div>
          <div style="font-family:'Courier New',monospace;font-size:16px;font-weight:700;margin-bottom:8px">${ddRef}</div>
          <div class="data-label">Declaration Date</div>
          <div class="data-value">${data.declarationDate}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Product & Commodity Details -->
  <div class="section">
    <div class="section-title">Product &amp; Commodity Details</div>
    <table>
      <thead>
        <tr>
          <th>HS Code</th>
          <th>Product Description</th>
          <th>Commodity Type</th>
          <th>Quantity</th>
          <th>Country of Production</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-family:'Courier New',monospace;font-weight:600">${data.hsCode}</td>
          <td>${data.productDescription}</td>
          <td><span class="pill pill-yellow">${data.commodityType}</span></td>
          <td>${data.quantity}</td>
          <td>${data.countryOfProduction}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Traceability & Geolocation -->
  <div class="section">
    <div class="section-title">Traceability Information</div>
    <div class="grid-2">
      <div class="info-box">
        <div class="data-label">Traceability System / Certification</div>
        <div class="data-value" style="margin-top:6px;font-size:14px">${data.traceabilitySystem}</div>
        <div style="font-size:11px;color:#666;margin-top:6px">Third-party certification scheme used to verify origin and non-deforestation compliance.</div>
      </div>
      <div class="info-box">
        <div class="data-label">Geolocation of Production Area</div>
        ${data.geoCoordinates
          ? `<div style="font-family:'Courier New',monospace;font-size:13px;font-weight:600;margin-top:6px">${data.geoCoordinates}</div>
             <div style="font-size:11px;color:#666;margin-top:6px">GPS coordinates of production plot(s) as required under Article 9 of EUDR.</div>`
          : `<div style="font-size:12px;color:#92400e;margin-top:6px;font-style:italic">GPS coordinates not provided. Required for full EUDR Article 9 compliance — contact supplier to obtain plot-level geolocation data.</div>`}
      </div>
    </div>
  </div>

  <!-- Non-Deforestation Declaration -->
  <div class="section">
    <div class="section-title">Declaration of Non-Deforestation</div>
    <div class="declaration-box">
      I, the undersigned, acting as the responsible operator for the products described in this document, hereby declare that:
      <br><br>
      1. The products covered by this due diligence statement (invoice <strong>${data.invoiceNumber}</strong>) have not been produced on land subject to deforestation or forest degradation after 31 December 2020, in accordance with Article 3 of EU Regulation 2023/1115.
      <br><br>
      2. The relevant commodities — classified as <strong>${data.commodityType}</strong> — have been produced in compliance with the applicable legislation of the country of production (<strong>${data.countryOfProduction}</strong>), including land use rights, environmental, and human rights laws.
      <br><br>
      3. Due diligence has been exercised in accordance with Article 8 of Regulation (EU) 2023/1115, and records are retained and available for inspection by competent authorities for a period of five (5) years.
      <br><br>
      4. Traceability information is maintained through: <strong>${data.traceabilitySystem}</strong>.
      <br><br>
      Due Diligence Reference: <strong>${ddRef}</strong>
    </div>
  </div>

  ${!data.geoCoordinates ? `
  <!-- Warning: Missing Geolocation -->
  <div class="warning-box">
    <div class="warning-label">Attention — Missing Geolocation Data</div>
    <div style="font-size:12px;color:#78350f;line-height:1.6">
      Article 9(1)(d) of EUDR requires geolocation data (GPS coordinates) for each plot of land where the commodity was produced. This statement is incomplete without this information. Obtain plot-level coordinates from your supplier before submitting to EU customs or TRACES NT.
    </div>
  </div>` : ''}

  <!-- Signature Block -->
  <div class="sig-block">
    <div>
      <div class="data-label">Place &amp; Date</div>
      <div class="data-value" style="margin-top:4px">${data.declarationDate}</div>
      <div class="sig-line">Operator / Authorised Representative</div>
    </div>
    <div>
      <div class="data-label">Operator Seal &amp; Signature</div>
      <div class="sig-line">Name, Title &amp; DD Ref: ${ddRef}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">ComplianceOS — EU Export Intelligence</div>
    <div>Issued under EU Regulation 2023/1115 (EUDR). Retain for 5 years. Ref: ${ref}</div>
  </div>

</div>
</body>
</html>`

  openAndPrint(html)
}
