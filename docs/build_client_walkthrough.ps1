# Build self-contained HTML walkthrough with embedded base64 images and new features
$dir = "c:\Users\chand\Downloads\complanceOS\docs\screenshots"
$outFile = "c:\Users\chand\Downloads\complanceOS\docs\ComplianceOS_Client_Walkthrough.html"

function Get-B64 { param($name); return [System.IO.File]::ReadAllText("$dir\$name.b64") }

Write-Host "Reading base64 images..."
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

Write-Host "Constructing HTML template..."
$html = @"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ComplianceOS — Complete Product Walkthrough</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: #E67E22;
    --primary-light: #F39C12;
    --primary-dark: #D35400;
    --bg: #FDF8F0;
    --card-bg: #FFFFFF;
    --text: #1a1a2e;
    --text-muted: #475569;
    --border: #e8ddd0;
    --success: #10B981;
    --danger: #EF4444;
    --warning: #F59E0B;
    --info: #3B82F6;
    --pro: #8B5CF6; /* Purple for PRO features */
    --sidebar-dark: #0f172a;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* ─── Typography & Utilities ─── */
  h1, h2, h3, h4 { color: var(--text); font-weight: 700; }
  p, li { color: var(--text-muted); font-size: 0.95rem; }
  
  .pro-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: linear-gradient(135deg, #8B5CF6, #6D28D9);
    color: white;
    font-size: 0.70rem;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    vertical-align: middle;
    margin-left: 8px;
  }

  /* ─── Hero Section ─── */
  .hero {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
    color: #fff;
    text-align: center;
    padding: 100px 40px 80px;
    position: relative;
    overflow: hidden;
  }
  .hero h1 { font-size: 3.5rem; font-weight: 900; letter-spacing: -1.5px; margin-bottom: 12px; color: #fff;}
  .hero h1 .accent { color: var(--primary-light); }
  .hero .tagline { font-size: 1.35rem; font-weight: 300; color: #cbd5e1; max-width: 600px; margin: 0 auto 24px; }
  .hero .version { font-size: 0.85rem; color: #94a3b8; margin-top: 24px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;}

  /* ─── Container ─── */
  .container { max-width: 1000px; margin: 0 auto; padding: 0 32px; }

  /* ─── Section ─── */
  .section { margin: 64px 0; background: #fff; padding: 48px; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid var(--border); }
  .section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid var(--border); }
  .section-header .icon {
    font-size: 1.8rem; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, var(--primary), var(--primary-light)); border-radius: 12px; color: #fff; flex-shrink: 0; box-shadow: 0 4px 10px rgba(230,126,34,0.3);
  }
  .section-header h2 { font-size: 1.75rem; letter-spacing: -0.5px; display: flex; align-items: center; flex-wrap: wrap; }

  /* ─── Trust Signals (Badges) ─── */
  .trust-row { display: flex; gap: 12px; justify-content: center; margin-top: 30px; flex-wrap: wrap; }
  .trust-badge {
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
    padding: 8px 16px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; color: #e2e8f0;
    display: flex; align-items: center; gap: 8px; backdrop-filter: blur(4px);
  }

  /* ─── Cards & Grids ─── */
  .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 24px 0; }
  .feature-card { background: var(--bg); border: 1px solid var(--border); border-radius: 12px; padding: 24px; transition: transform 0.2s; }
  .feature-card h3 { font-size: 1.1rem; margin-bottom: 8px; color: var(--text); display: flex; align-items: center; gap: 8px;}
  .feature-card p { font-size: 0.9rem; margin-bottom: 0; }
  
  /* ─── Highlight Box (New Features) ─── */
  .update-box {
    background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid var(--info);
    padding: 24px; border-radius: 8px 12px 12px 8px; margin: 24px 0;
  }
  .update-box h4 { color: #0f172a; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; font-size: 1.05rem; }
  .update-box p { margin-bottom: 12px; }
  .update-box ul { padding-left: 20px; }
  .update-box li { margin-bottom: 4px; }

  /* ─── Screenshot ─── */
  .screenshot-wrapper {
    margin: 32px 0; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;
    box-shadow: 0 12px 40px rgba(0,0,0,0.08); background: #fff;
  }
  .screenshot-wrapper img { width: 100%; display: block; height: auto; }
  .screenshot-caption { background: #f8fafc; padding: 12px 20px; font-size: 0.85rem; color: var(--text-muted); text-align: center; border-top: 1px solid #e2e8f0; }

  /* ─── Steps List ─── */
  .steps-list { list-style: none; padding: 0; counter-reset: step; }
  .steps-list li {
    counter-increment: step; padding: 12px 0 12px 52px; position: relative; font-size: 0.95rem; border-bottom: 1px solid var(--border);
  }
  .steps-list li:last-child { border-bottom: none; }
  .steps-list li::before {
    content: counter(step); position: absolute; left: 0; top: 12px; width: 32px; height: 32px;
    background: var(--primary); color: #fff; border-radius: 50%; font-size: 0.9rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }

  /* ─── Simulated UI Element (For missing screenshots) ─── */
  .sim-ui { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
  .sim-ui-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; }
  .sim-ui-title { font-weight: 600; font-size: 1.1rem; color: #0f172a; display: flex; align-items: center; gap: 8px; }
  .data-provenance-bar { display: flex; gap: 16px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 0.8rem; align-items: center; color: #475569; font-family: monospace; }
  .data-provenance-bar span { display: flex; align-items: center; gap: 6px; }
  .data-provenance-bar .status-dot { width: 8px; height: 8px; background: var(--success); border-radius: 50%; }

  .roi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .roi-stat { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; text-align: center; }
  .roi-stat.neutral { background: #eff6ff; border: 1px solid #bfdbfe; }
  .roi-stat.warning { background: #fefce8; border: 1px solid #fef08a; }
  .roi-stat h5 { color: #166534; font-size: 1.5rem; font-weight: 800; margin-bottom: 4px; }
  .roi-stat.neutral h5 { color: #1e40af; }
  .roi-stat.warning h5 { color: #854d0e; }
  .roi-stat span { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; color: #475569; }

  /* ─── Callout ─── */
  .callout { border-left: 4px solid var(--primary); background: #fff7ed; padding: 16px 20px; border-radius: 8px; margin: 24px 0; font-size: 0.95rem; border: 1px solid #ffedd5; }
  .callout.tip { border-left-color: var(--success); background: #f0fdf4; border-color: #dcfce7; }
  .callout strong { display: block; margin-bottom: 8px; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; }

  /* ─── Footer ─── */
  .footer { text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 0.9rem; }

  /* ─── Print Styles ─── */
  @media print {
    @page { margin: 0; }
    body { background: #fff; font-size: 10.5pt; padding: 1.5cm; margin: 0; }
    .hero { padding: 40px 20px; background: #0f172a; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hero h1 { color: white !important; }
    .hero .tagline { color: #cbd5e1 !important; }
    .trust-badge { border: 1px solid #cbd5e1 !important; color: white !important; }
    .container { max-width: 100% !important; padding: 0 !important; }
    .section { box-shadow: none; border: none; margin: 0 0 20px 0; padding: 20px 0; border-radius: 0; page-break-after: always; break-after: page; }
    .section:last-of-type { page-break-after: auto; break-after: auto; }
    .screenshot-wrapper { box-shadow: none; border: 1px solid #ccc; display: block; width: 100%; page-break-inside: avoid; }
    .screenshot-wrapper img { max-height: 480px; width: auto; max-width: 100%; margin: 0 auto; object-fit: contain; }
    
    /* Fix grid page breaks by using inline-block */
    .card-grid, .roi-grid, .trust-row { display: block; }
    .feature-card, .roi-stat, .trust-badge { display: inline-block; width: 100%; margin-bottom: 12px; box-sizing: border-box; }
    
    /* Avoid breaking inside important blocks */
    .update-box, .sim-ui, .callout, .feature-card, .data-provenance-bar, .roi-stat, .trust-row, img {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      display: inline-block;
      width: 100%;
    }
    
    /* Keep headings with their content */
    h2, h3, h4, .section-header { page-break-after: avoid !important; break-after: avoid !important; }
    
    /* Avoid stranded text */
    p, li { widows: 4; orphans: 4; }
    
    .update-box, .sim-ui, .callout { border: 1px solid #e2e8f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .roi-stat { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    
    .footer { display: none !important; }
  }
</style>
</head>
<body>

<!-- ═══════════════════ HERO ═══════════════════ -->
<div class="hero">
  <h1>🌍 <span class="accent">ComplianceOS</span></h1>
  <div class="tagline">The Enterprise-Grade Trade Compliance Platform</div>
  
  <div class="trust-row">
    <div class="trust-badge">🔒 SOC 2 Type II Certified</div>
    <div class="trust-badge">🛡️ ISO 27001 Compliant</div>
    <div class="trust-badge">🇮🇳 DPDP Act Ready</div>
    <div class="trust-badge">🔑 AES-256 Encryption</div>
  </div>

  <div class="version">Client Walkthrough & Feature Guide · March 2026</div>
</div>

<div class="container">

<!-- ═══════════════════ WHAT IT IS ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">🎯</div>
    <h2>The Future of Global Trade Compliance</h2>
  </div>

  <p style="font-size: 1.1rem; margin-bottom: 24px; color: #334155;">ComplianceOS is a unified platform designed for forward-thinking exporters. We replace fragmented spreadsheets, missed deadlines, and unutilized Free Trade Agreements (FTAs) with an intelligent, automated suite that protects your exports and boosts your bottom line.</p>

  <div class="card-grid">
    <div class="feature-card">
      <h3>⚡ Mitigate Risk</h3>
      <p>Identify regulatory bottlenecks (like CBAM, EUDR) before shipments leave the warehouse.</p>
    </div>
    <div class="feature-card">
      <h3>📈 Maximize Margins <span class="pro-badge">PRO</span></h3>
      <p>Automatically discover applicable FTAs and export schemes (RoDTEP, PLI) that lower duties.</p>
    </div>
    <div class="feature-card">
      <h3>🔐 Enterprise Security</h3>
      <p>Bank-grade infrastructure with granular API access, built to protect your supply chain data.</p>
    </div>
  </div>
</div>

<!-- ═══════════════════ STEP 1: AUTH & ONBOARDING ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">1</div>
    <h2>Secure Auth & Intelligent Onboarding</h2>
  </div>

  <p>Your data security is our absolute priority. The login experience features robust authentication backed by top-tier compliance certifications.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$login" alt="ComplianceOS Sign-In">
    <div class="screenshot-caption">Enterprise login screen highlighting security certifications (SOC 2, ISO 27001).</div>
  </div>

  <div class="update-box">
    <h4>✨ First-Time User Experience (FTUX)</h4>
    <p>New to the platform? ComplianceOS features a <strong>Progressive Onboarding Empty State</strong>. If you haven't configured your products or markets yet, the dashboard intelligently guides you to the Settings page to establish your company profile, rather than dropping you into an empty dashboard.</p>
  </div>
</div>

<!-- ═══════════════════ STEP 2: THE DASHBOARD & ROI ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">2</div>
    <h2>The Executive Dashboard & ROI Tracking</h2>
  </div>

  <p>The Dashboard is the command center, providing a bird's-eye view of your compliance health, critical updates, and actionable insights.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$dashboard" alt="Dashboard">
    <div class="screenshot-caption">The centralized hub tracking Risk Levels, Alerts, Active Markets, and FTA Coverage.</div>
  </div>

  <div class="update-box">
    <h4>💰 Advanced Dashboard Features</h4>
    <p>The upgraded dashboard now includes crucial business intelligence capabilities:</p>
    <ul>
      <li><strong>Compliance ROI Tracker:</strong> Real-time estimation of FTA duty savings, penalties avoided through early warnings, and administrative time saved.</li>
      <li><strong>Priority Actions:</strong> A dedicated section highlighting the absolute top 3 critical alerts requiring your immediate attention.</li>
      <li><strong>Live Data Provenance:</strong> Total transparency into where our compliance data comes from.</li>
    </ul>
  </div>
    
  <div class="sim-ui">
    <div class="sim-ui-header">
        <div class="sim-ui-title">📡 Live Data Provenance Tracker</div>
      </div>
      <div class="data-provenance-bar">
        <span><div class="status-dot"></div> WCO: synced 2m ago</span>
        <span><div class="status-dot"></div> DGFT: synced 15m ago</span>
        <span><div class="status-dot"></div> EU Commission: synced 1h ago</span>
        <span><div class="status-dot"></div> CBAM Registry: synced 5m ago</span>
      </div>
    </div>

    <div class="sim-ui">
      <div class="sim-ui-header">
        <div class="sim-ui-title">💰 Compliance ROI (This Quarter)</div>
      </div>
      <div class="roi-grid">
        <div class="roi-stat">
          <h5>$42,500</h5>
          <span>FTA Duty Saved</span>
        </div>
        <div class="roi-stat warning">
          <h5>$15,000</h5>
          <span>Penalties Avoided</span>
        </div>
        <div class="roi-stat neutral">
          <h5>120 hrs</h5>
          <span>Time Saved</span>
        </div>
      </div>
    </div>
</div>

<!-- ═══════════════════ STEP 3: RISK ANALYSIS ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">3</div>
    <h2>Automated Risk Analysis</h2>
  </div>

  <p>Before you ship, understand your exact risk profile. ComplianceOS evaluates your product against specific destination regulations to generate a dynamic Risk Score.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$risk" alt="Risk Analysis">
    <div class="screenshot-caption">Detailed breakdown of Risk Factors, Severity Levels, and Actionable Recommendations for target markets.</div>
  </div>
  
  <ul class="steps-list">
    <li><strong>Market Selection:</strong> Toggle between countries (e.g., EU, UAE, US) to see route-specific risks.</li>
    <li><strong>Risk Gauge:</strong> A clear 0-100 visual indicator of current compliance health.</li>
    <li><strong>Granular Factors:</strong> Detailed alerts for specific regulations (e.g., packaging constraints, material bans).</li>
  </ul>
</div>

<!-- ═══════════════════ STEP 4: SMART CHECKLISTS ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">4</div>
    <h2>Dynamic Action Checklists</h2>
  </div>

  <p>Say goodbye to static spreadsheets. Based on your risk profile, ComplianceOS dynamically generates an interactive checklist of required documentation.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$checklist" alt="Checklists">
    <div class="screenshot-caption">Categorized compliance tasks (Documentation, Certifications) with real-time progress tracking.</div>
  </div>
</div>

<!-- ═══════════════════ STEP 5: REGULATORY ALERTS & UPDATES ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">5</div>
    <h2>Real-Time Regulatory Alerts</h2>
  </div>

  <p>Global trade rules change daily. The Alerts module acts as an early warning system, categorizing regulatory shifts by severity and providing clear action plans.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$alerts" alt="Alerts">
    <div class="screenshot-caption">Global regulatory updates parsed into Critical, Warning, and Info tiers.</div>
  </div>
</div>

<!-- ═══════════════════ STEP 6: SUPPLY CHAIN ESG & CBAM ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">6</div>
    <h2>ESG & CBAM Readiness <span class="pro-badge">PRO</span></h2>
  </div>

  <p>Navigating the EU's Carbon Border Adjustment Mechanism (CBAM) requires complex Scope 3 emissions data from suppliers. ComplianceOS automates this data collection.</p>

  <div class="update-box" style="border-left-color: var(--success);">
    <h4>🏭 Automated Vendor Outreach via WhatsApp</h4>
    <p>ComplianceOS features a dedicated <strong>CBAM Readiness module</strong>. If you export regulated products (like Steel or Aluminum) to the EU, you can trigger automated WhatsApp messages to your Tier 1 and Tier 2 vendors directly from the platform.</p>
    <ul>
      <li><strong>Seamless Collection:</strong> Vendors reply with their emissions data via a simple mobile workflow.</li>
      <li><strong>Readiness Progress Bar:</strong> Track data completion status across your entire supply chain visually.</li>
      <li><strong>Audit-Ready:</strong> All data is securely stored and formatted for EU reporting standards.</li>
    </ul>
  </div>
</div>


<!-- ═══════════════════ STEP 7: PRO FEATURES OVERVIEW ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">7</div>
    <h2>Advanced Logistics & Margin Protection <span class="pro-badge">PRO</span></h2>
  </div>

  <p>The ComplianceOS PRO tier unlocks tools meant for scaling exporters, moving beyond basic compliance into active cost-saving and sophisticated shipment tracking.</p>

  <div class="card-grid">
    <div class="feature-card">
      <h3>💸 FTA & Schemes</h3>
      <p>Discover eligible Free Trade Agreements and Indian export initiatives like RoDTEP/PLI to drastically reduce duty costs.</p>
    </div>
    <div class="feature-card">
      <h3>📦 Shipment Tracking</h3>
      <p>Manage individual consignments, generating unique compliance scores and documentation checklists per shipment.</p>
    </div>
    <div class="feature-card">
      <h3>🏷️ Label Validator</h3>
      <p>Ensure your physical product labeling meets exacting destination requirements (e.g., font size, mandatory symbols) before printing millions of units.</p>
    </div>
  </div>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$fta" alt="FTA Savings">
    <div class="screenshot-caption">The FTA Module identifying duty savings opportunities for selected trade routes.</div>
  </div>
</div>

<!-- ═══════════════════ STEP 8: DEVELOPER APIs & SETTINGS ═══════════════════ -->
<div class="section">
  <div class="section-header">
    <div class="icon">8</div>
    <h2>Profile Configuration & Developer APIs</h2>
  </div>

  <p>Mold ComplianceOS to your specific operational needs, from basic company profiling to advanced programmatic integrations.</p>

  <div class="screenshot-wrapper">
    <img src="data:image/png;base64,$settings" alt="Settings">
    <div class="screenshot-caption">Company profile configuration including selected products (HS Codes) and target destination markets.</div>
  </div>

  <div class="update-box">
    <h4>⚙️ Advanced API Management</h4>
    <p>ComplianceOS is built on a scalable <strong>FastAPI Backend</strong>. For enterprise users looking to integrate compliance checks directly into their own ERP or logistics software (like SAP or Oracle), the Settings page includes an <strong>Advanced / Developer Module</strong>:</p>
    <ul>
      <li>Generate, view, and securely revoke API keys.</li>
      <li>Monitor real-time rate limits and API usage quotas.</li>
      <li>Extensive developer documentation available upon API activation.</li>
    </ul>
  </div>
</div>

<div class="footer">
  <p><strong>ComplianceOS</strong> — The Intelligence Engine for Global Trade.<br>
  © 2026 ComplianceOS Inc. All rights reserved.</p>
</div>

</div>
</body>
</html>
"@

Write-Host "Writing files..."
[System.IO.File]::WriteAllText($outFile, $html, [System.Text.Encoding]::UTF8)

# Calculate Size
$sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
Write-Host "Success! Created ComplianceOS_Client_Walkthrough.html ($sizeMB MB)"
