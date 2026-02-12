"""
ITC Trade Map FTA Data Scraper
Extracts tariff and Rules of Origin data from the ITC Rules of Origin Facilitator
"""

from playwright.sync_api import sync_playwright
import csv
import json
import time
from datetime import datetime

# Products to scrape (HS codes)
PRODUCTS = [
    {"hs_code": "7208", "name": "Steel - Flat-rolled products"},
    {"hs_code": "6109", "name": "T-shirts, textiles"},
    {"hs_code": "6203", "name": "Men's suits"},
    {"hs_code": "2922", "name": "Organic chemicals"},
    {"hs_code": "8471", "name": "Computers"},
    {"hs_code": "8517", "name": "Phones/telecom"},
    {"hs_code": "7113", "name": "Jewelry"},
    {"hs_code": "0306", "name": "Seafood (shrimp)"},
    {"hs_code": "1006", "name": "Rice"},
    {"hs_code": "0902", "name": "Tea"},
]

# Base URL for Rules of Origin Facilitator (we'll navigate manually to avoid encoding issues)
BASE_URL = "https://findrulesoforigin.org"

def extract_fta_data(hs_code, product_name):
    """
    Extract FTA data for a specific HS code
    """
    with sync_playwright() as p:
        # Launch browser (headless=False to see what's happening)
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        print(f"\n🔍 Searching for HS {hs_code} - {product_name}")
        
        try:
            # Navigate to home page first (avoid dangerous request error)
            page.goto(BASE_URL, timeout=30000)
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            
            # Navigate to the search page
            try:
                # Click on "Home & Search" or navigate directly
                page.goto(f"{BASE_URL}/en/home", timeout=30000)
                page.wait_for_load_state("networkidle")
                time.sleep(2)
                
                # Fill in the form manually
                # Select India as exporter
                exporter_input = page.query_selector("input[placeholder*='country'], select[name*='reporter'], input[id*='export']")
                if exporter_input:
                    exporter_input.fill("India")
                    time.sleep(1)
                    page.keyboard.press("Enter")
                    time.sleep(1)
                
                # Select UAE as importer
                importer_input = page.query_selector("input[placeholder*='partner'], select[name*='partner'], input[id*='import']")
                if importer_input:
                    importer_input.fill("United Arab Emirates")
                    time.sleep(1)
                    page.keyboard.press("Enter")
                    time.sleep(1)
                
                # Enter product code
                product_input = page.query_selector("input[placeholder*='product'], input[id*='product']")
                if product_input:
                    product_input.fill(hs_code)
                    time.sleep(1)
                    page.keyboard.press("Enter")
                    time.sleep(3)
                
            except Exception as e:
                print(f"  ⚠️  Could not use form, trying direct navigation...")
                # Fallback: try going directly with proper encoding
                encoded_url = f"{BASE_URL}/en/home/compare/reporters=IN/partners=ARE/products={hs_code}"
                page.goto(encoded_url, timeout=30000)
                page.wait_for_load_state("networkidle")
                time.sleep(2)
            
            # Initialize data dictionary
            data = {
                "hs_code": hs_code,
                "product_name": product_name,
                "fta_name": None,
                "mfn_rate": None,
                "preferential_rate": None,
                "savings": None,
                "rule_of_origin": None,
                "certificate_required": None,
                "in_force": None,
            }
            
            # Look for the FTA card (India-UAE CEPA)
            try:
                # Wait for the FTA card to appear
                page.wait_for_selector(".card, .agreement-card, [class*='cepa'], [class*='agreement']", timeout=10000)
                
                # Take a screenshot for debugging
                page.screenshot(path=f"debug_{hs_code}.png")
                
                # Extract FTA name
                fta_element = page.query_selector("text=/CEPA/i, text=/India/i")
                if fta_element:
                    data["fta_name"] = "India-UAE CEPA"
                
                # Extract MFN rate (look for percentage values)
                page_content = page.content()
                
                # Try to extract rates from visible text
                mfn_match = page.query_selector("text=/MFN/i")
                if mfn_match:
                    parent = mfn_match.evaluate("el => el.parentElement || el")
                    data["mfn_rate"] = page.evaluate("el => el.textContent", parent)
                
                # Click "FIND OUT MORE" or "Details" button if it exists
                try:
                    details_button = page.query_selector("text=/FIND OUT MORE|Details|View/i")
                    if details_button:
                        details_button.click()
                        time.sleep(2)
                        
                        # Extract Rule of Origin
                        roo_section = page.query_selector("text=/Rule of Origin/i >> xpath=following::div[1]")
                        if roo_section:
                            data["rule_of_origin"] = roo_section.inner_text().strip()[:200]  # Truncate if too long
                        
                        # Extract Certificate provisions
                        cert_section = page.query_selector("text=/Certificate/i >> xpath=following::div[1]")
                        if cert_section:
                            data["certificate_required"] = cert_section.inner_text().strip()[:200]
                        
                        # Check if in force
                        in_force = page.query_selector("text=/IN FORCE/i")
                        data["in_force"] = bool(in_force)
                        
                except Exception as e:
                    print(f"  ⚠️  Could not extract detailed info: {e}")
                
                print(f"  ✅ Extracted: MFN={data['mfn_rate']}, Preferential={data['preferential_rate']}")
                
            except Exception as e:
                print(f"  ❌ Error finding FTA card: {e}")
            
            browser.close()
            return data
            
        except Exception as e:
            print(f"  ❌ Error loading page: {e}")
            browser.close()
            return None

def scrape_all_products():
    """
    Scrape FTA data for all products in the list
    """
    results = []
    
    print("🚀 Starting ITC Trade Map FTA Data Extraction")
    print(f"📋 Products to scrape: {len(PRODUCTS)}")
    print("=" * 60)
    
    for product in PRODUCTS:
        data = extract_fta_data(product["hs_code"], product["name"])
        if data:
            results.append(data)
        time.sleep(3)  # Be nice to the server
    
    return results

def save_to_csv(results, filename="fta_data.csv"):
    """
    Save results to CSV file
    """
    if not results:
        print("❌ No data to save")
        return
    
    keys = results[0].keys()
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(results)
    
    print(f"\n✅ Saved {len(results)} records to {filename}")

def save_to_json(results, filename="fta_data.json"):
    """
    Save results to JSON file
    """
    if not results:
        print("❌ No data to save")
        return
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Saved {len(results)} records to {filename}")

def main():
    """
    Main execution
    """
    print("\n" + "=" * 60)
    print("ITC Trade Map - India-UAE CEPA Data Scraper")
    print("=" * 60)
    
    # Scrape the data
    results = scrape_all_products()
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"india_uae_fta_{timestamp}.csv"
    json_filename = f"india_uae_fta_{timestamp}.json"
    
    save_to_csv(results, csv_filename)
    save_to_json(results, json_filename)
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 Summary:")
    print(f"  Total products scraped: {len(results)}")
    print(f"  Successful extractions: {sum(1 for r in results if r['mfn_rate'])}")
    print(f"  Output files:")
    print(f"    - {csv_filename}")
    print(f"    - {json_filename}")
    print("=" * 60)

if __name__ == "__main__":
    main()
