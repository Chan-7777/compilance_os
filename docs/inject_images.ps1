$dir = "c:\Users\chand\Downloads\complanceOS\docs\screenshots"
$outFile = "c:\Users\chand\Downloads\complanceOS\ComplianceOS_Product_Walkthrough.html"

# Read template
$html = Get-Content $outFile -Raw

# Replace placeholders with base64
$names = @("01_login","02_signup","03_dashboard","04_risk_analysis","05_checklist","06_alerts","07_fta_schemes","08_shipments","09_label_validator","10_settings")
$placeholders = @("{{IMG_LOGIN}}","{{IMG_SIGNUP}}","{{IMG_DASHBOARD}}","{{IMG_RISK}}","{{IMG_CHECKLIST}}","{{IMG_ALERTS}}","{{IMG_FTA}}","{{IMG_SHIPMENTS}}","{{IMG_LABELVAL}}","{{IMG_SETTINGS}}")

for ($i = 0; $i -lt $names.Count; $i++) {
    $b64 = [System.IO.File]::ReadAllText("$dir\$($names[$i]).b64")
    $html = $html.Replace($placeholders[$i], $b64)
    Write-Host "Replaced $($placeholders[$i]) ($($b64.Length) chars)"
}

[System.IO.File]::WriteAllText($outFile, $html, [System.Text.Encoding]::UTF8)
Write-Host "Done! File size: $([math]::Round((Get-Item $outFile).Length / 1MB, 2)) MB"
