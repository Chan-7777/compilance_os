import sys
import json
import csv
import time
import argparse
from datetime import datetime
from playwright.sync_api import sync_playwright
import re

ROO_KEYWORDS = ['CTH', 'CTSH', 'CC ', 'Wholly', 'Value Addition', 'RVC', 'Product Specific']

def clean_roo_text(raw_text):
    """Extract just the Rule of Origin (PSR) from raw tab-separated row text."""
    if not raw_text or raw_text == '-' or raw_text == 'N/A':
        return 'N/A'
    
    # Split by tabs and filter noise
    parts = [p.strip() for p in raw_text.split('\t') if p.strip() and p.strip() != '-']
    
    # Find the part containing the actual rule
    for part in parts:
        for keyword in ROO_KEYWORDS:
            if keyword in part:
                # Skip if it's just the agreement name or a number
                try:
                    float(part)
                    continue
                except ValueError:
                    if 'Agreement' not in part and 'CEPA' not in part:
                        return part
    
    return raw_text[:200] if raw_text else 'N/A'

def extract_tariff_data(hs_code, country_code="ae", headless=True):
    """
    Extracts tariff and CEPA data for a given HS code from Trade Connect (trade.gov.in).
    Targets exports from India to the specified partner country.
    """
    results = {
        "hs_code": hs_code,
        "country": country_code.upper(),
        "product_description": "N/A",
        "mfn_rate": "N/A",
        "cepa_rate": "N/A",
        "rule_of_origin": "N/A",
        "timestamp": datetime.now().isoformat()
    }

    # URL pattern discovered during research
    url = f"https://www.trade.gov.in/pages/free-trade-agreements/exp-{hs_code}-{country_code}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        page = browser.new_page()
        
        try:
            print(f"📡 Navigating to: {url}")
            page.goto(url, timeout=60000)
            
            # Wait for the table to load (skeleton loaders are used on this site)
            print("⏳ Waiting for data to load...")
            page.wait_for_selector(".viewItcDtls", timeout=20000)
            
            # Click the first record to see details (usually the most general/relevant)
            print("🖱️ Expanding details for first result...")
            page.click(".viewItcDtls", timeout=5000)
            
            # Wait for detail section to populate
            page.wait_for_timeout(3000)
            
            # Scroll down to ensure all sections render (CEPA table is lazy-loaded)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(3000)

            # Use JavaScript to extract all data directly from the DOM
            # Table IDs confirmed via DOM inspection:
            #   - "ftaimpexptable" (multiple): 1st = National Tariff Line, 2nd = MFN
            #   - "importToIndiaSearchTable": Preferential Tariff (CEPA)
            extracted = page.evaluate("""() => {
                const data = { description: null, mfn: null, cepa: null, roo: null };

                // 1. Product Description - first ftaimpexptable, column 2
                const allFtaTables = document.querySelectorAll('#ftaimpexptable');
                if (allFtaTables.length > 0) {
                    const descRow = allFtaTables[0].querySelector('tbody tr');
                    if (descRow) {
                        const cells = descRow.querySelectorAll('td');
                        if (cells.length > 1) data.description = cells[1].innerText.trim();
                    }
                }

                // 2. MFN Rate - second ftaimpexptable, column 1
                if (allFtaTables.length > 1) {
                    const mfnRow = allFtaTables[1].querySelector('tbody tr');
                    if (mfnRow) {
                        const cells = mfnRow.querySelectorAll('td');
                        if (cells.length > 0) data.mfn = cells[0].innerText.trim();
                    }
                }

                // 3. CEPA Rate + Rule of Origin - importToIndiaSearchTable
                const cepaTable = document.querySelector('#importToIndiaSearchTable');
                if (cepaTable) {
                    const cepaRow = cepaTable.querySelector('tbody tr');
                    if (cepaRow) {
                        const cells = cepaRow.querySelectorAll('td');
                        // Cell layout: [chevron, Agreement Name, Ad Valorem, Specific Duty, ...]
                        if (cells.length > 2) data.cepa = cells[2].innerText.trim();
                        if (cells.length > 4) data.roo = cells[4].innerText.trim();
                    }
                }

                return data;
            }""")

            if extracted["description"]:
                results["product_description"] = extracted["description"]
            if extracted["mfn"]:
                results["mfn_rate"] = extracted["mfn"]
            if extracted["cepa"]:
                results["cepa_rate"] = extracted["cepa"]
            if extracted["roo"] and extracted["roo"] != "-":
                results["rule_of_origin"] = clean_roo_text(extracted["roo"])

            # Try to expand the CEPA row to get the Rule of Origin (PSR)
            # The ROO is hidden behind a chevron/accordion in the CEPA table
            if results["rule_of_origin"] == "N/A":
                try:
                    # Click the chevron in the first row of the CEPA table
                    chevron = page.locator("#importToIndiaSearchTable tbody tr td:first-child")
                    if chevron.count() > 0:
                        chevron.first.click()
                        page.wait_for_timeout(2000)
                        
                        # Extract the expanded ROO detail
                        roo_text = page.evaluate("""() => {
                            const cepaTable = document.querySelector('#importToIndiaSearchTable');
                            if (!cepaTable) return null;
                            
                            const rows = cepaTable.querySelectorAll('tbody tr');
                            for (const row of rows) {
                                const text = row.innerText.trim();
                                if (text.includes('CTH') || text.includes('CTSH') || text.includes('CC') || 
                                    text.includes('Wholly') || text.includes('Value Addition') ||
                                    text.includes('RVC') || text.includes('Product Specific')) {
                                    // Parse tab-separated text to extract just the rule
                                    // Format: "Agreement Name\tRate\t-\t-\tPSR Rule\t-"
                                    const parts = text.split('\t').map(p => p.trim()).filter(p => p && p !== '-');
                                    // Find the PSR part (contains CTH/CTSH/Wholly etc.)
                                    for (const part of parts) {
                                        if (part.includes('CTH') || part.includes('CTSH') || part.includes('CC') ||
                                            part.includes('Wholly') || part.includes('RVC')) {
                                            return part;
                                        }
                                    }
                                    return text;
                                }
                            }
                            
                            if (rows.length > 1) {
                                return rows[1].innerText.trim();
                            }
                            return null;
                        }""")
                        
                        if roo_text:
                            results["rule_of_origin"] = clean_roo_text(roo_text)
                except Exception as e:
                    print(f"   ⚠️  Could not expand ROO details: {e}")

            print(f"✅ Success: Extracted data for HS {hs_code}")
            print(f"   📊 MFN: {results['mfn_rate']}% | CEPA: {results['cepa_rate']}% | ROO: {results['rule_of_origin']}")
            
        except Exception as e:
            print(f"❌ Error extracting HS {hs_code}: {str(e)}")
        finally:
            browser.close()
            
    return results

def main():
    parser = argparse.ArgumentParser(description="Trade Connect FTA Data Scraper")
    parser.add_argument("--hs", type=str, help="HS Code to search")
    parser.add_argument("--country", type=str, default="ae", help="Partner country code (e.g., ae for UAE, jp for Japan)")
    parser.add_argument("--batch", action="store_true", help="Run batch for pre-defined products")
    parser.add_argument("--head", action="store_true", help="Run in visible browser mode (not headless)")
    
    args = parser.parse_args()
    headless_mode = not args.head

    # Pre-defined list from the app if batch mode
    PRODUCTS = ["7208", "6109", "6203", "2922", "8471", "8517", "7113", "0306", "1006", "0902"]
    
    final_results = []

    if args.hs:
        res = extract_tariff_data(args.hs, args.country, headless=headless_mode)
        final_results.append(res)
    elif args.batch:
        print(f"🚀 Starting batch extraction for {len(PRODUCTS)} products...")
        for hs in PRODUCTS:
            res = extract_tariff_data(hs, args.country, headless=headless_mode)
            final_results.append(res)
            time.sleep(2) # Modest delay
    else:
        print("Please provide --hs code or use --batch")
        return

    # Output to console
    print("\n" + "="*50)
    print("EXTRACTION RESULTS")
    print("="*50)
    print(json.dumps(final_results, indent=2))
    
    # Save to JSON
    with open("fta_data_trade_connect.json", "w", encoding="utf-8") as f:
        json.dump(final_results, f, indent=2)
    
    # Save to CSV
    if final_results:
        keys = final_results[0].keys()
        with open("fta_data_trade_connect.csv", "w", newline="", encoding="utf-8") as f:
            dict_writer = csv.DictWriter(f, fieldnames=keys)
            dict_writer.writeheader()
            dict_writer.writerows(final_results)

    print(f"\n📁 Saved results to fta_data_trade_connect.json and .csv")

if __name__ == "__main__":
    main()
