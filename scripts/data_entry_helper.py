"""
FTA Data Entry Helper
Simple CLI tool to help you enter ITC Trade Map data quickly
"""

import json
import csv
from datetime import datetime

PRODUCTS = [
    "7208 - Steel (Flat-rolled products)",
    "6109 - T-shirts (textiles)",
    "6203 - Men's suits",
    "2922 - Organic chemicals",
    "8471 - Computers",
    "8517 - Phones/telecom",
    "7113 - Jewelry",
    "0306 - Seafood (shrimp)",
    "1006 - Rice",
    "0902 - Tea",
]

def main():
    print("\n" + "="*60)
    print("FTA Data Entry Helper - India-UAE CEPA")
    print("="*60)
    print("\nOpen ITC Trade Map in your browser and enter data as you see it.")
    print("Press Ctrl+C anytime to save and exit.\n")
    
    results = []
    
    try:
        for i, product in enumerate(PRODUCTS, 1):
            print(f"\n[{i}/{len(PRODUCTS)}] {product}")
            print("-" * 40)
            
            # Parse HS code and name
            hs_code = product.split(" - ")[0]
            product_name = product.split(" - ")[1] if " - " in product else product
            
            # Get user input
            mfn = input("  MFN Rate (e.g., 5% or 0): ").strip()
            pref = input("  Preferential Rate (e.g., 0% or 0): ").strip()
            
            # Calculate savings
            try:
                mfn_val = float(mfn.replace('%', '').strip() or 0)
                pref_val = float(pref.replace('%', '').strip() or 0)
                savings = mfn_val - pref_val
            except:
                savings = 0
            
            roo = input("  Rule of Origin (brief, or press Enter to skip): ").strip()
            cert = input("  Certificate Required (or press Enter to skip): ").strip()
            
            # Store data
            data = {
                "hs_code": hs_code,
                "product_name": product_name,
                "fta_name": "India-UAE CEPA",
                "mfn_rate": mfn if mfn else "0%",
                "preferential_rate": pref if pref else "0%",
                "savings": f"{savings}%",
                "rule_of_origin": roo or "Not specified",
                "certificate_required": cert or "Certificate of Origin",
                "in_force": True
            }
            
            results.append(data)
            print(f"  ✅ Saved: {savings}% savings")
    
    except KeyboardInterrupt:
        print("\n\n⏸️  Interrupted by user")
    
    # Save results
    if results:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_file = f"india_uae_fta_{timestamp}.csv"
        json_file = f"india_uae_fta_{timestamp}.json"
        
        # Save CSV
        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
        
        # Save JSON
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Saved {len(results)} products:")
        print(f"   📄 {csv_file}")
        print(f"   📄 {json_file}")
    else:
        print("\n❌ No data entered")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    main()
