<![CDATA[# Build self-contained HTML walkthrough with embedded base64 images
$dir = "c:\Users\chand\Downloads\complanceOS\docs\screenshots"

function Get-B64 { param($name); return [System.IO.File]::ReadAllText("$dir\$name.b64") }

$login = Get-B64 "01_login"
$signup = Get-B64 "02_signup"
$dashboard = Get-B64 "03_dashboard"
$risk = Get-B64 "04_risk_analysis"
$checklist = Get-B64 "05_checklist"
$alerts = Get-B64 "06_alerts"
$fta = Get-B64 "07_fta_schemes"
$shipments = Get-B64 "08_shipments"
$labelval = Get-B64 "09_label_validator"
$settings = Get-B64 "10_settings"

$html = @"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ComplianceOS — Product Walkthrough & Getting Started Guide</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: #E67E22;
    --primary-light: #F39C12;
    --primary-dark: #D35400;
    --bg: #FDF8F0;
    --card-bg: #FFFFFF;
    --text: #1a1a2e;
    --text-muted: #64748b;
    --border: #e8ddd0;
    --success: #10B981;
    --danger: #EF4444;
    --warning: #F59E0B;
    --info: #3B82F6;
    --sidebar-dark: #1e293b;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }

  /* ─── Hero Section ─── */
  .hero {
    background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%);
    color: #fff;
    text-align: center;
    padding: 80px 40px 60px;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 30% 50%, rgba(230,126,34,0.15) 0%, transparent 50%),
                radial-gradient(circle at 70% 80%, rgba(243,156,18,0.1) 0%, transparent 40%);
    pointer-events: none;
  }
  .hero h1 {
    font-size: 3rem;
    font-weight: 900;
    letter-spacing: -1px;
    margin-bottom: 8px;
    position: relative;
  }
  .hero h1 .accent { color: var(--primary-light); }
  .hero .tagline {
    font-size: 1.25rem;
    font-weight: 300;
    color: #cbd5e1;
    margin-bottom: 16px;
  }
  .hero .version {
    font-size: 0.8rem;
    color: #94a3b8;
    margin-top: 20px;
  }
  .hero .cta-line {
    font-size: 1.1rem;
    font-weight: 500;
    color: #f1c40f;
    margin-top: 12px;
  }

  /* ─── Container ─── */
  .container {
    max-width: 920px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* ─── Section ─── */
  .section {
    margin: 48px 0;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--border);
  }
  .section-header .icon {
    font-size: 1.6rem;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--primary), var(--primary-light));
    border-radius: 10px;
    color: #fff;
    flex-shrink: 0;
  }
  .section-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text);
  }
  .section-header h2 .step-num {
    color: var(--primary);
    font-weight: 800;
  }

  /* ─── Cards ─── */
  .card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 28px;
    margin-bottom: 24px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .card h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 12px;
    color: var(--text);
  }
  .card p, .card li {
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  /* ─── Screenshot ─── */
  .screenshot-wrapper {
    margin: 24px 0;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid var(--border);
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  }
  .screenshot-wrapper img {
    width: 100%;
    display: block;
  }
  .screenshot-caption {
    background: #f8f5f0;
    padding: 10px 16px;
    font-size: 0.82rem;
    color: var(--text-muted);
    text-align: center;
    border-top: 1px solid var(--border);
    font-style: italic;
  }

  /* ─── Feature Grid ─── */
  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
    margin: 24px 0;
  }
  .feature-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px;
    text-align: center;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .feature-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.08);
  }
  .feature-card .f-icon { font-size: 2rem; margin-bottom: 8px; }
  .feature-card .f-title { font-weight: 700; font-size: 0.95rem; margin-bottom: 6px; }
  .feature-card .f-desc { font-size: 0.82rem; color: var(--text-muted); }

  /* ─── Steps List ─── */
  .steps-list {
    list-style: none;
    padding: 0;
    counter-reset: step;
  }
  .steps-list li {
    counter-increment: step;
    padding: 10px 0 10px 44px;
    position: relative;
    font-size: 0.95rem;
    color: var(--text-muted);
    border-bottom: 1px solid #f0ebe3;
  }
  .steps-list li:last-child { border-bottom: none; }
  .steps-list li::before {
    content: counter(step);
    position: absolute;
    left: 0;
    top: 10px;
    width: 30px;
    height: 30px;
    background: var(--primary);
    color: #fff;
    border-radius: 50%;
    font-size: 0.8rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ─── Callout ─── */
  .callout {
    border-left: 4px solid var(--primary);
    background: #fef9f3;
    padding: 16px 20px;
    border-radius: 0 8px 8px 0;
    margin: 20px 0;
    font-size: 0.9rem;
  }
  .callout.tip { border-left-color: var(--success); background: #f0fdf4; }
  .callout.warning { border-left-color: var(--danger); background: #fef2f2; }
  .callout.info { border-left-color: var(--info); background: #eff6ff; }
  .callout strong { display: block; margin-bottom: 4px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
  .callout.tip strong { color: var(--success); }
  .callout.warning strong { color: var(--danger); }
  .callout.info strong { color: var(--info); }

  /* ─── Table ─── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 0.88rem;
  }
  th {
    background: var(--sidebar-dark);
    color: #fff;
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    font-size: 0.82rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  th:first-child { border-radius: 8px 0 0 0; }
  th:last-child { border-radius: 0 8px 0 0; }
  td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    color: var(--text-muted);
  }
  tr:nth-child(even) td { background: #faf8f5; }

  /* ─── Badge ─── */
  .badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .badge.critical { background: #fecaca; color: #dc2626; }
  .badge.warning { background: #fef3c7; color: #d97706; }
  .badge.info { background: #dbeafe; color: #2563eb; }
  .badge.success { background: #d1fae5; color: #059669; }

  /* ─── Why Section ─── */
  .pain-points {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
    margin: 20px 0;
  }
  .pain-point {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 14px;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .pain-point .pp-icon { font-size: 1.4rem; flex-shrink: 0; }
  .pain-point .pp-text { font-size: 0.85rem; color: var(--text-muted); }
  .pain-point .pp-text strong { color: var(--text); }

  /* ─── Value Props ─── */
  .value-list {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 10px;
    margin: 20px 0;
  }
  .value-list li {
    padding: 12px 16px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    font-size: 0.88rem;
    color: #166534;
  }

  /* ─── Navigation Guide ─── */
  .nav-guide {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin: 20px 0;
  }
  .nav-item {
    padding: 14px;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 8px;
    text-align: center;
    font-size: 0.85rem;
  }
  .nav-item .nav-num {
    display: block;
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .nav-item .nav-name {
    font-weight: 700;
    display: block;
    margin-bottom: 4px;
  }
  .nav-item .nav-desc {
    color: var(--text-muted);
    font-size: 0.78rem;
  }

  /* ─── FAQ ─── */
  .faq-item {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0ebe3;
  }
  .faq-item:last-child { border-bottom: none; }
  .faq-item .q {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--text);
    margin-bottom: 6px;
  }
  .faq-item .a {
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  /* ─── Footer / CTA ─── */
  .closing {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: #fff;
    text-align: center;
    padding: 60px 40px;
    margin-top: 60px;
  }
  .closing blockquote {
    max-width: 700px;
    margin: 0 auto 30px;
    font-size: 1.1rem;
    font-style: italic;
    line-height: 1.8;
    color: #cbd5e1;
  }
  .closing .signature {
    font-weight: 700;
    font-size: 1rem;
    color: var(--primary-light);
    margin-top: 16px;
  }
  .closing .cta-buttons {
    margin-top: 30px;
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .closing .cta-btn {
    display: inline-block;
    padding: 12px 28px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.9rem;
    text-decoration: none;
    transition: transform 0.2s;
  }
  .closing .cta-btn:hover { transform: translateY(-2px); }
  .closing .cta-btn.primary { background: var(--primary); color: #fff; }
  .closing .cta-btn.secondary { background: transparent; color: #fff; border: 1px solid #64748b; }
  .closing .tagline-final {
    margin-top: 30px;
    font-size: 0.85rem;
    color: #64748b;
  }

  /* ─── Divider ─── */
  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border), transparent);
    margin: 40px 0;
  }

  /* ─── Print Styles ─── */
  @media print {
    .hero { padding: 40px 20px; }
    .section { page-break-inside: avoid; }
    .screenshot-wrapper { box-shadow: none; }
  }
</style>
</head>
<body>

<!-- ═══════════════════ HERO ═══════════════════ -->
<div class="hero">
  <h1>🌍 <span class="accent">ComplianceOS</span></h1>
  <div class="tagline">Your All-in-One Trade Compliance Co-Pilot</div>
  <div class="cta-line">Stop worrying about regulations. Start growing your exports.</div>
  <div class="version">Product Walkthrough & Getting Started Guide · February 2026 · v1.0</div>
</div>

<div class="container">

<!-- ═══════════════════ WHY SECTION ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">🤔</div>
    <h2>Why Does ComplianceOS Exist?</h2>
  </div>

  <div class="card">
    <h3>International trade is complicated. It shouldn't be.</h3>
    <p>If you're an exporter or MSME, you already know the pain:</p>
  </div>

  <div class="pain-points">
    <div class="pain-point">
      <span class="pp-icon">📋</span>
      <div class="pp-text"><strong>Dozens of regulations</strong> to track across EU, US, UK, UAE, Japan, Australia — each with their own rules</div>
    </div>
    <div class="pain-point">
      <span class="pp-icon">⏰</span>
      <div class="pp-text"><strong>Changing deadlines</strong> for CBAM carbon reporting, Digital Product Passports, EUDR deforestation requirements</div>
    </div>
    <div class="pain-point">
      <span class="pp-icon">📝</span>
      <div class="pp-text"><strong>Mountains of paperwork</strong> — IEC certificates, GST/LUT, phytosanitary certificates, certificates of origin</div>
    </div>
    <div class="pain-point">
      <span class="pp-icon">💰</span>
      <div class="pp-text"><strong>Missed savings</strong> from Free Trade Agreements and schemes like RoDTEP and PLI</div>
    </div>
    <div class="pain-point">
      <span class="pp-icon">🚫</span>
      <div class="pp-text"><strong>Shipments stuck</strong> at customs because one label was wrong or one document was missing</div>
    </div>
    <div class="pain-point">
      <span class="pp-icon">🎯</span>
      <div class="pp-text"><strong>ComplianceOS solves all of this</strong> — turning trade compliance into a simple, guided process</div>
    </div>
  </div>
</div>

<!-- ═══════════════════ WHAT WE HANDLE ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">🎯</div>
    <h2>What Does ComplianceOS Handle?</h2>
  </div>

  <div class="feature-grid">
    <div class="feature-card">
      <div class="f-icon">🔍</div>
      <div class="f-title">Risk Analysis</div>
      <div class="f-desc">Know your compliance risk score <em>before</em> you ship</div>
    </div>
    <div class="feature-card">
      <div class="f-icon">✅</div>
      <div class="f-title">Smart Checklists</div>
      <div class="f-desc">Auto-generated, country-specific document checklists</div>
    </div>
    <div class="feature-card">
      <div class="f-icon">🔔</div>
      <div class="f-title">Regulatory Alerts</div>
      <div class="f-desc">Real-time notifications about rules, deadlines, and changes</div>
    </div>
    <div class="feature-card">
      <div class="f-icon">💸</div>
      <div class="f-title">FTA & Scheme Savings</div>
      <div class="f-desc">Discover trade agreements and government schemes that save you money</div>
    </div>
    <div class="feature-card">
      <div class="f-icon">📦</div>
      <div class="f-title">Shipment Tracking</div>
      <div class="f-desc">Track every shipment's compliance status from start to finish</div>
    </div>
    <div class="feature-card">
      <div class="f-icon">🏷️</div>
      <div class="f-title">Label Validation</div>
      <div class="f-desc">Verify product labels meet destination-country rules before printing</div>
    </div>
  </div>
</div>

<!-- ═══════════════════ WHY TRY US ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">🏆</div>
    <h2>Why Should You Try ComplianceOS?</h2>
  </div>

  <div class="callout warning">
    <strong>⚠ The risk is real</strong>
    One missed deadline or one wrong label can cost you weeks of delay and lakhs in penalties.
  </div>

  <ul class="value-list">
    <li>✅ <strong>Save hours every week</strong> — No more checking 20 different government websites</li>
    <li>✅ <strong>Prevent shipment delays</strong> — Catch missing documents before they become problems</li>
    <li>✅ <strong>Save money on duties</strong> — Automatically discover FTA benefits and export schemes</li>
    <li>✅ <strong>Stay ahead of regulations</strong> — Get alerts 90 days before deadlines hit</li>
    <li>✅ <strong>Go paperless</strong> — Track everything digitally, no more spreadsheets</li>
    <li>✅ <strong>Sleep better</strong> — Know your compliance is handled by a system that never forgets</li>
  </ul>
</div>

<div class="divider"></div>

<!-- ═══════════════════ GUIDE HEADER ═══════════════════ -->
<div style="text-align:center; margin: 40px 0;">
  <h2 style="font-size: 1.8rem; font-weight: 800;">📖 Step-by-Step Guide</h2>
  <p style="color: var(--text-muted); margin-top: 8px;">Let's walk through everything together — no prior experience needed!</p>
</div>

<!-- ═══════════════════ STEP 1: SIGN UP ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">🆕</div>
    <h2><span class="step-num">Step 1:</span> Create Your Account</h2>
  </div>

  <p style="color: var(--text-muted); margin-bottom: 16px;">The very first thing you need to do is create a free account. It takes less than 30 seconds.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$login" alt="ComplianceOS Sign-In Page">
    <div class="screenshot-caption">The ComplianceOS Sign-In page — enter your email and password to access your dashboard</div>
  </div>

  <div class="card">
    <h3>How to get started:</h3>
    <ol class="steps-list">
      <li>Open ComplianceOS in your web browser</li>
      <li>Click <strong>"Sign Up"</strong> to create a new account</li>
      <li>Enter your <strong>Full Name</strong>, <strong>Email</strong>, and <strong>Password</strong></li>
      <li>Click the orange <strong>"Create Account"</strong> button</li>
      <li>Check your email for a <strong>confirmation link</strong> and click it</li>
      <li>Come back and <strong>Sign In</strong> with your new credentials</li>
    </ol>
  </div>

  <div class="callout tip">
    <strong>💡 Tip</strong>
    Already have an account? Simply enter your email and password on the Sign In page and click the orange button. That's it — you're in!
  </div>
</div>

<!-- ═══════════════════ STEP 2: DASHBOARD ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">📊</div>
    <h2><span class="step-num">Step 2:</span> Your Compliance Dashboard</h2>
  </div>

  <p style="color: var(--text-muted); margin-bottom: 16px;">After signing in, you'll land on your <strong>Dashboard</strong> — your command center for all trade compliance.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$dashboard" alt="ComplianceOS Dashboard">
    <div class="screenshot-caption">The Compliance Dashboard — your command center showing risk overview, alerts, markets, and FTA coverage at a glance</div>
  </div>

  <div class="card">
    <h3>What each section tells you:</h3>
    <table>
      <tr><th>Section</th><th>What It Means</th><th>Why It Matters</th></tr>
      <tr><td><strong>Overall Risk</strong></td><td>Your compliance health score (0–100)</td><td>Green = safe · Orange = pay attention · Red = act now!</td></tr>
      <tr><td><strong>Critical Alerts</strong></td><td>Urgent regulatory changes needing attention</td><td>Click to see approaching deadlines</td></tr>
      <tr><td><strong>Markets</strong></td><td>Countries you export to with their status</td><td>See which markets need work at a glance</td></tr>
      <tr><td><strong>Active FTAs</strong></td><td>Trade agreements that apply to your products</td><td>These can save you significant import duty!</td></tr>
      <tr><td><strong>Quick Actions</strong></td><td>One-click buttons to jump to key features</td><td>Fast access to Risk Analysis, Checklists, and Alerts</td></tr>
      <tr><td><strong>Recent Alerts</strong></td><td>Latest regulatory updates affecting your business</td><td>Stay informed without checking government websites</td></tr>
    </table>
  </div>

  <div class="callout info">
    <strong>ℹ Navigation</strong>
    Look at the <strong>sidebar on the left</strong> — this is how you move between different sections of ComplianceOS. We'll explore each one now.
  </div>
</div>

<!-- ═══════════════════ STEP 3: RISK ANALYSIS ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">🔍</div>
    <h2><span class="step-num">Step 3:</span> Risk Analysis</h2>
  </div>

  <p style="color: var(--text-muted); margin-bottom: 16px;">Click <strong>"Risk Analysis"</strong> in the sidebar — this shows you exactly what risks exist for your products and markets.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$risk" alt="ComplianceOS Risk Analysis">
    <div class="screenshot-caption">Risk Analysis page — see risk factors and recommendations for each target market</div>
  </div>

  <div class="card">
    <h3>How to use it:</h3>
    <ol class="steps-list">
      <li>Your product and selected markets are shown at the top</li>
      <li>The <strong>Risk Gauge</strong> shows your overall score for each country</li>
      <li>Below, <strong>Risk Factors</strong> show what specific regulations affect you</li>
      <li>Click any factor to see <strong>detailed recommendations</strong></li>
      <li>Compare different markets to understand where your risks are highest</li>
    </ol>
  </div>

  <table>
    <tr><th>Risk Factor Examples</th><th>Severity</th><th>What It Means</th></tr>
    <tr><td>CBAM Carbon Reporting</td><td><span class="badge critical">High</span></td><td>EU requires carbon emission data for steel, aluminum, cement</td></tr>
    <tr><td>ESG Scope 3 Disclosure</td><td><span class="badge warning">Medium</span></td><td>Some markets require supply chain sustainability reporting</td></tr>
    <tr><td>Active FTA Benefits</td><td><span class="badge success">Positive</span></td><td>A trade agreement that <em>reduces</em> your import duties!</td></tr>
  </table>
</div>

<!-- ═══════════════════ STEP 4: CHECKLISTS ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">✅</div>
    <h2><span class="step-num">Step 4:</span> Compliance Checklists</h2>
  </div>

  <p style="color: var(--text-muted); margin-bottom: 16px;">Click <strong>"Checklists"</strong> — your auto-generated to-do list for every shipment. Never miss a document again.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$checklist" alt="ComplianceOS Checklists">
    <div class="screenshot-caption">Interactive compliance checklists with progress tracking — organized by document category</div>
  </div>

  <div class="card">
    <h3>How to use it:</h3>
    <ol class="steps-list">
      <li>Choose your <strong>target market</strong> using the country tabs at the top</li>
      <li>See the <strong>progress bar</strong> showing how many items you've completed</li>
      <li>Items are organised into categories: Documentation, Certifications, Indian Compliance</li>
      <li><strong>Click any item</strong> to mark it as complete ✓</li>
      <li>Watch the progress bar fill up as you check off items!</li>
    </ol>
  </div>

  <div class="callout tip">
    <strong>💡 Smart Checklists</strong>
    The checklist adapts automatically based on your product and destination. Exporting food to the EU? It includes FSSAI and phytosanitary certificates. Exporting chemicals to Japan? Different safety certifications appear. You don't need to remember — ComplianceOS remembers for you.
  </div>
</div>

<!-- ═══════════════════ STEP 5: ALERTS ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">🔔</div>
    <h2><span class="step-num">Step 5:</span> Regulatory Alerts</h2>
  </div>

  <p style="color: var(--text-muted); margin-bottom: 16px;">Click <strong>"Alerts"</strong> — your early warning system. Stay ahead of regulatory changes that affect your shipments.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$alerts" alt="ComplianceOS Alerts">
    <div class="screenshot-caption">Regulatory alerts filtered by severity — Critical, Warning, and Informational updates</div>
  </div>

  <div class="card">
    <h3>How to use it:</h3>
    <ol class="steps-list">
      <li>Use the <strong>filter buttons</strong> at the top — All, Critical, Warning, or Info</li>
      <li>Each alert shows <strong>what's happening</strong>, <strong>how urgent</strong> it is, and the <strong>deadline</strong></li>
      <li>Click any alert to see <strong>detailed information</strong> and regulation citations</li>
      <li>Each alert includes <strong>clear action items</strong> — exactly what steps you need to take</li>
    </ol>
  </div>

  <table>
    <tr><th>Alert Examples</th><th>Severity</th><th>Action Required</th></tr>
    <tr><td>EU Digital Product Passport</td><td><span class="badge critical">Critical</span></td><td>Register products in EU database before deadline</td></tr>
    <tr><td>CBAM Carbon Reporting Q1</td><td><span class="badge warning">Warning</span></td><td>Submit quarterly emission data by filing date</td></tr>
    <tr><td>EUDR Deforestation Rules</td><td><span class="badge critical">Critical</span></td><td>Prepare supply chain documentation</td></tr>
    <tr><td>India-UK FTA Negotiations</td><td><span class="badge info">Info</span></td><td>Monitor for updates — potential new trade benefits</td></tr>
  </table>

  <div class="callout warning">
    <strong>⚠ Important</strong>
    Never ignore Critical alerts! These have tight deadlines and failing to comply can result in shipments being held at borders, heavy fines, or export bans.
  </div>
</div>

<!-- ═══════════════════ STEP 6: FTA & SCHEMES ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">💸</div>
    <h2><span class="step-num">Step 6:</span> FTA & Schemes — Save Money</h2>
  </div>

  <p style="color: var(--text-muted); margin-bottom: 16px;">Click <strong>"FTA & Schemes"</strong> — discover Free Trade Agreements and government export schemes that reduce your duties.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$fta" alt="ComplianceOS FTA & Schemes">
    <div class="screenshot-caption">FTA & Schemes analysis — see active trade agreements and potential duty savings for your products</div>
  </div>

  <div class="card">
    <h3>What you'll find here:</h3>
    <ol class="steps-list">
      <li><strong>FTA Cards</strong> — Each card shows the agreement name, status (Active / Under Negotiation), and duty savings</li>
      <li><strong>Tariff Comparison</strong> — See standard rates vs. preferential rates side by side</li>
      <li><strong>Indian Export Schemes</strong> — Discover government incentives like RoDTEP, PLI, and Advance Authorization</li>
      <li><strong>Savings Calculator</strong> — See potential duty savings for your specific product routes</li>
    </ol>
  </div>

  <div class="callout tip">
    <strong>💰 Did you know?</strong>
    Many exporters miss out on lakhs of rupees in duty savings simply because they don't file for preferential tariff rates under active FTAs. ComplianceOS identifies these savings automatically!
  </div>
</div>

<!-- ═══════════════════ STEP 7: SHIPMENTS ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">📦</div>
    <h2><span class="step-num">Step 7:</span> Shipment Tracking</h2>
  </div>

  <p style="color: var(--text-muted); margin-bottom: 16px;">Click <strong>"Shipments"</strong> — create and track individual shipments with per-shipment compliance scores.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$shipments" alt="ComplianceOS Shipments">
    <div class="screenshot-caption">Shipment tracking — each shipment shows product, destination, date, status, and compliance score</div>
  </div>

  <div class="card">
    <h3>How to use it:</h3>
    <ol class="steps-list">
      <li>Click the orange <strong>"+ New Shipment"</strong> button at the top right</li>
      <li>Enter the <strong>Shipment Name</strong>, <strong>Product</strong>, <strong>Destination</strong>, and <strong>Date</strong></li>
      <li>Click <strong>"Create Shipment"</strong> — ComplianceOS auto-generates a checklist and risk score</li>
      <li>Monitor the <strong>compliance score</strong> — it updates as you check off documentation items</li>
      <li>Click the dropdown arrow on any shipment to see full details</li>
    </ol>
  </div>

  <div class="callout warning">
    <strong>⚠ Compliance Score Guide</strong>
    A score below 50% means the shipment is NOT ready. Complete the remaining checklist items before shipping to avoid costly delays at customs.
  </div>
</div>

<!-- ═══════════════════ STEP 8: LABEL VALIDATOR ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">🏷️</div>
    <h2><span class="step-num">Step 8:</span> Label Validator</h2>
  </div>

  <p style="color: var(--text-muted); margin-bottom: 16px;">Click <strong>"Label Validator"</strong> — incorrect labeling is one of the <strong>top reasons</strong> shipments get held at customs.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$labelval" alt="ComplianceOS Label Validator">
    <div class="screenshot-caption">Label Validator — check your product labels against destination-country requirements rule by rule</div>
  </div>

  <div class="card">
    <h3>How to use it:</h3>
    <ol class="steps-list">
      <li>Select your <strong>Product Category</strong> from the dropdown</li>
      <li>Choose the <strong>Destination Country</strong> from the country tabs (EU, US, UK, UAE, Japan, Australia)</li>
      <li>ComplianceOS loads the <strong>exact labeling rules</strong> — organized by Language, Origin, Identification, and Environmental categories</li>
      <li><strong>Toggle each requirement</strong> to check if your label meets it — watch the compliance score update in real-time</li>
      <li>Click the dropdown arrow on any rule to see the <strong>specific regulation</strong> it comes from</li>
      <li>Use <strong>"Mark All Compliant"</strong> when all labels are verified, or <strong>"Reset All"</strong> to start fresh</li>
    </ol>
  </div>

  <div class="callout tip">
    <strong>💡 Pro Tip</strong>
    Try switching between destination countries! The requirements change entirely — EU might require official language labeling while UAE requires Arabic text and Halal certification. Always validate BEFORE printing.
  </div>
</div>

<!-- ═══════════════════ STEP 9: SETTINGS ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">⚙️</div>
    <h2><span class="step-num">Step 9:</span> Settings & Configuration</h2>
  </div>

  <p style="color: var(--text-muted); margin-bottom: 16px;">Click <strong>"Settings"</strong> at the bottom of the sidebar — configure ComplianceOS to match your business.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$settings" alt="ComplianceOS Settings">
    <div class="screenshot-caption">Settings — configure your company profile, product categories, target markets, and API integrations</div>
  </div>

  <div class="card">
    <h3>What to configure:</h3>
    <table>
      <tr><th>Setting</th><th>What to Enter</th><th>Why It Matters</th></tr>
      <tr><td><strong>Company Profile</strong></td><td>Name, size (micro/small/medium/large), IEC number</td><td>Risk scores adjust based on company size</td></tr>
      <tr><td><strong>Product Categories</strong></td><td>What you export: Steel, Textiles, Food, Chemicals, etc.</td><td>Determines which regulations apply to you</td></tr>
      <tr><td><strong>Target Markets</strong></td><td>Countries you export to: EU, US, UK, UAE, Japan, Australia</td><td>Generates country-specific checklists and alerts</td></tr>
      <tr><td><strong>API Keys</strong></td><td>Integration keys for external data sources</td><td>Advanced feature for customs system integration</td></tr>
    </table>
  </div>

  <div class="callout info">
    <strong>ℹ Quick Note</strong>
    You can change these settings anytime. As your business grows and you enter new markets, come back and update your profile — ComplianceOS will immediately recalculate everything.
  </div>
</div>

<div class="divider"></div>

<!-- ═══════════════════ NAVIGATION GUIDE ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">🗺️</div>
    <h2>Quick Navigation Guide</h2>
  </div>

  <div class="nav-guide">
    <div class="nav-item">
      <span class="nav-num">1</span>
      <span class="nav-name">📊 Dashboard</span>
      <span class="nav-desc">The big picture at a glance</span>
    </div>
    <div class="nav-item">
      <span class="nav-num">2</span>
      <span class="nav-name">🔍 Risk Analysis</span>
      <span class="nav-desc">Understand risks before shipping</span>
    </div>
    <div class="nav-item">
      <span class="nav-num">3</span>
      <span class="nav-name">✅ Checklists</span>
      <span class="nav-desc">Track documents per market</span>
    </div>
    <div class="nav-item">
      <span class="nav-num">4</span>
      <span class="nav-name">🔔 Alerts</span>
      <span class="nav-desc">Stay ahead of changes</span>
    </div>
    <div class="nav-item">
      <span class="nav-num">5</span>
      <span class="nav-name">💸 FTA & Schemes</span>
      <span class="nav-desc">Discover duty savings</span>
    </div>
    <div class="nav-item">
      <span class="nav-num">6</span>
      <span class="nav-name">📦 Shipments</span>
      <span class="nav-desc">Track individual shipments</span>
    </div>
    <div class="nav-item">
      <span class="nav-num">7</span>
      <span class="nav-name">🏷️ Label Validator</span>
      <span class="nav-desc">Verify labels before printing</span>
    </div>
    <div class="nav-item">
      <span class="nav-num">8</span>
      <span class="nav-name">⚙️ Settings</span>
      <span class="nav-desc">Configure your profile</span>
    </div>
  </div>
</div>

<!-- ═══════════════════ FAQ ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">❓</div>
    <h2>Frequently Asked Questions</h2>
  </div>

  <div class="card">
    <div class="faq-item">
      <div class="q">Do I need to be a compliance expert to use ComplianceOS?</div>
      <div class="a">Not at all! ComplianceOS is designed for exporters of all sizes. The platform explains every regulation in plain language and tells you exactly what to do.</div>
    </div>
    <div class="faq-item">
      <div class="q">Which countries does ComplianceOS support?</div>
      <div class="a">We currently cover <strong>EU, US, UK, UAE, Japan, and Australia</strong> — the major export destinations for Indian businesses. We're constantly expanding.</div>
    </div>
    <div class="faq-item">
      <div class="q">How does ComplianceOS know what regulations apply to me?</div>
      <div class="a">Based on your product categories and target markets in Settings, ComplianceOS automatically maps the applicable regulations, generates relevant checklists, and surfaces the right alerts.</div>
    </div>
    <div class="faq-item">
      <div class="q">Can multiple team members use ComplianceOS?</div>
      <div class="a">Yes! Each team member can create their own account and work on compliance together.</div>
    </div>
    <div class="faq-item">
      <div class="q">What if a regulation changes?</div>
      <div class="a">ComplianceOS monitors regulatory changes in real-time. You'll receive an alert the moment something changes that affects your exports.</div>
    </div>
    <div class="faq-item">
      <div class="q">Is my data secure?</div>
      <div class="a">Yes. ComplianceOS uses enterprise-grade security with encrypted data storage and secure authentication. Your compliance data is private and protected.</div>
    </div>
  </div>
</div>

</div><!-- end container -->

<!-- ═══════════════════ CLOSING ═══════════════════ -->
<div class="closing">
  <blockquote>
    "Trade should be about growing your business — not fighting paperwork.<br><br>
    At ComplianceOS, we've built everything you need to navigate the complex world of international trade compliance. From risk analysis to label validation, from regulatory alerts to duty savings — we've got you covered.<br><br>
    And if you ever feel stuck, remember: <strong style="color:#F39C12;">we're here to help with everything we can to make trade easy.</strong><br>
    Because when trade becomes simpler, businesses thrive, economies grow, and the world gets a little more connected."
  </blockquote>
  <div class="signature">— The ComplianceOS Team 🌏</div>

  <div class="cta-buttons">
    <a href="https://app.avalara-india.com" class="cta-btn primary">🚀 Get Started Free</a>
    <a href="mailto:contact@complianceos.com" class="cta-btn secondary">📧 Schedule a Demo</a>
  </div>

  <div class="tagline-final">ComplianceOS — Trade compliance, simplified. Always. ✨</div>
</div>

</body>
</html>
"@

# Write the HTML file
[System.IO.File]::WriteAllText("c:\Users\chand\Downloads\complanceOS\ComplianceOS_Product_Walkthrough.html", $html, [System.Text.Encoding]::UTF8)
Write-Host "HTML file created successfully!"
Write-Host "Size: $((Get-Item 'c:\Users\chand\Downloads\complanceOS\ComplianceOS_Product_Walkthrough.html').Length / 1MB) MB"
]]>
