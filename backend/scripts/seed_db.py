"""
Seed Database Script
Migrates all hardcoded data from the TypeScript frontend into Supabase.

Usage:
  cd backend
  pip install supabase python-dotenv
  python scripts/seed_db.py

Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
"""

import os
import json
import sys

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ======================================================================
# 1. COUNTRIES (from src/data/regulatory-db.ts)
# ======================================================================

COUNTRIES = [
    {
        "code": "EU",
        "name": "European Union",
        "flag": "\U0001f1ea\U0001f1fa",
        "cbam_config": {
            "active": True,
            "phase": "Transitional (reporting only until 2026, financial adjustment from 2026)",
            "coveredSectors": ["steel", "iron", "aluminium", "cement", "fertilizers", "electricity", "hydrogen", "chemicals"],
            "reportingFrequency": "Quarterly",
            "penaltyPerTonne": "\u20ac50-100 (linked to EU ETS price)",
            "keyDates": [
                {"date": "2023-10-01", "event": "CBAM transitional period began"},
                {"date": "2025-12-31", "event": "End of simplified reporting"},
                {"date": "2026-01-01", "event": "Financial adjustments begin"},
                {"date": "2034-01-01", "event": "Full CBAM implementation, free allowances phased out"},
            ],
        },
        "esg_config": {
            "csrd": True, "taxonomy": True,
            "dueDiligence": "CSDDD (Corporate Sustainability Due Diligence Directive)",
            "reportingStandards": ["ESRS", "GRI (accepted)", "ISSB (partial)"],
            "scope3Required": True,
        },
        "packaging": ["EU Packaging & Packaging Waste Directive", "Extended Producer Responsibility (EPR)", "Single-Use Plastics Directive"],
        "labeling": ["Multilingual labeling (destination country language)", "Nutritional information (food)", "Allergen declarations", "Country of origin marking"],
        "customs": ["EUR.1 Movement Certificate", "Invoice Declaration", "Binding Tariff Information (BTI)"],
        "sanctions": [],
    },
    {
        "code": "US",
        "name": "United States",
        "flag": "\U0001f1fa\U0001f1f8",
        "cbam_config": {
            "active": False,
            "phase": "Proposed (Clean Competition Act introduced but not enacted)",
            "coveredSectors": ["steel", "aluminium", "cement", "chemicals"],
            "notes": "Monitor legislative progress; may be enacted in modified form",
        },
        "esg_config": {
            "secClimate": True,
            "reportingStandards": ["SEC Climate Disclosure Rule", "California SB 253/261"],
            "scope3Required": False,
            "notes": "SEC rule facing legal challenges; California rules in effect for large companies",
        },
        "packaging": ["State-level EPR laws (CA, ME, OR, CO)", "Lacey Act (wood packaging)", "ISPM 15 Wood Packaging"],
        "labeling": ["English language required", "FTC Made in USA guidelines", "Country of origin marking (19 USC 1304)", "Nutritional Facts Panel (food)"],
        "customs": ["Commercial Invoice", "Packing List", "Bill of Lading", "Certificate of Origin", "ISF 10+2 Filing"],
        "sanctions": ["OFAC compliance required", "Entity List screening", "EAR compliance for dual-use goods"],
    },
    {
        "code": "UK",
        "name": "United Kingdom",
        "flag": "\U0001f1ec\U0001f1e7",
        "cbam_config": {
            "active": True,
            "phase": "UK CBAM announced, effective January 2027",
            "coveredSectors": ["steel", "iron", "aluminium", "cement", "fertilizers", "ceramics", "glass", "hydrogen"],
            "keyDates": [{"date": "2027-01-01", "event": "UK CBAM takes effect"}],
        },
        "esg_config": {
            "tcfd": True,
            "reportingStandards": ["TCFD", "UK Sustainability Disclosure Standards (UK SDS)", "ISSB-aligned"],
            "scope3Required": False,
        },
        "packaging": ["UK Plastic Packaging Tax", "Extended Producer Responsibility", "UK Packaging Waste Regulations"],
        "labeling": ["English language", "UK importer details required", "UKCA mark placement"],
        "customs": ["Certificate of Origin", "Commercial Invoice", "Customs Declaration (CDS)"],
        "sanctions": ["OFSI compliance", "UK Sanctions List screening"],
    },
    {
        "code": "UAE",
        "name": "United Arab Emirates",
        "flag": "\U0001f1e6\U0001f1ea",
        "cbam_config": {"active": False, "phase": "Not applicable"},
        "esg_config": {
            "reportingStandards": ["ADX ESG Disclosure Guide", "DFSA ESG rules"],
            "scope3Required": False,
        },
        "packaging": ["Arabic labeling mandatory", "Shelf life requirements"],
        "labeling": ["Arabic + English bilingual", "Halal marking where applicable", "Expiry date in hijri and gregorian"],
        "customs": ["Certificate of Origin", "Commercial Invoice (legalized)", "Packing List"],
        "sanctions": [],
    },
    {
        "code": "Japan",
        "name": "Japan",
        "flag": "\U0001f1ef\U0001f1f5",
        "cbam_config": {
            "active": False,
            "phase": "GX League voluntary carbon pricing; mandatory CBAM under discussion",
        },
        "esg_config": {
            "reportingStandards": ["ISSB-aligned", "TCFD (widely adopted)", "Japan Sustainability Standards Board (JSSB)"],
            "scope3Required": False,
        },
        "packaging": ["Containers and Packaging Recycling Law", "Green Mark system"],
        "labeling": ["Japanese language mandatory", "JAS labeling", "Nutritional labeling (food)", "Country of origin"],
        "customs": ["Certificate of Origin (for RCEP preferential tariff)", "Invoice", "Certificate of Conformity"],
        "sanctions": [],
    },
    {
        "code": "Australia",
        "name": "Australia",
        "flag": "\U0001f1e6\U0001f1fa",
        "cbam_config": {
            "active": False,
            "phase": "Safeguard Mechanism for domestic emitters; CBAM under consultation",
        },
        "esg_config": {
            "reportingStandards": ["AASB Sustainability Standards (ISSB-aligned)", "ASRS 1 & ASRS 2"],
            "scope3Required": True,
        },
        "packaging": ["Australian Packaging Covenant", "REDcycle alternatives", "National Packaging Targets"],
        "labeling": ["English language", "Country of origin labeling (mandatory for food)", "Standard of Identity"],
        "customs": ["Certificate of Origin (AIFTA/RCEP)", "Commercial Invoice", "Packing Declaration"],
        "sanctions": ["DFAT Consolidated List screening"],
    },
]


# ======================================================================
# 2. CERTIFICATIONS (from src/data/regulatory-db.ts .certifications)
# ======================================================================

CERTIFICATIONS = [
    # EU
    {"country_code": "EU", "product_category": "general", "cert_list": ["CE Marking", "EU Declaration of Conformity"]},
    {"country_code": "EU", "product_category": "food", "cert_list": ["FSSAI Export Certificate", "EU Organic Certification", "HACCP", "BRC Global Standard", "Phytosanitary Certificate"]},
    {"country_code": "EU", "product_category": "textiles", "cert_list": ["REACH Compliance", "OEKO-TEX Standard 100", "GOTS (for organic)", "EU Ecolabel"]},
    {"country_code": "EU", "product_category": "chemicals", "cert_list": ["REACH Registration", "CLP Classification", "Safety Data Sheet (SDS)", "Biocidal Products Regulation"]},
    {"country_code": "EU", "product_category": "electronics", "cert_list": ["RoHS Compliance", "WEEE Directive", "EU Energy Label", "EMC Directive"]},
    {"country_code": "EU", "product_category": "steel", "cert_list": ["EN Standards Certification", "Mill Test Certificate 3.1", "Carbon Content Declaration"]},
    {"country_code": "EU", "product_category": "pharma", "cert_list": ["EU GMP Certificate", "Marketing Authorization", "GDP Compliance", "Qualified Person Release"]},
    {"country_code": "EU", "product_category": "automotive", "cert_list": ["ECE Type Approval", "IATF 16949", "IMDS Compliance"]},
    {"country_code": "EU", "product_category": "machinery", "cert_list": ["Machinery Directive 2006/42/EC", "Pressure Equipment Directive", "ATEX Directive"]},
    # US
    {"country_code": "US", "product_category": "general", "cert_list": ["FDA Registration (food/drugs/cosmetics)", "UL Certification", "FCC Certification"]},
    {"country_code": "US", "product_category": "food", "cert_list": ["FDA FSVP Compliance", "USDA Organic (if claimed)", "Bioterrorism Act Registration", "HACCP", "FSMA Compliance", "Prior Notice of Import"]},
    {"country_code": "US", "product_category": "textiles", "cert_list": ["CPSIA Compliance", "Flammability Standards (16 CFR 1610)", "Textile Fiber Products ID Act", "Care Labeling Rule"]},
    {"country_code": "US", "product_category": "chemicals", "cert_list": ["TSCA Compliance", "EPA Registration", "California Prop 65", "Safety Data Sheet"]},
    {"country_code": "US", "product_category": "electronics", "cert_list": ["FCC Part 15", "UL/ETL Safety Mark", "Energy Star (voluntary)", "California CEC"]},
    {"country_code": "US", "product_category": "steel", "cert_list": ["Buy America / Buy American Act (if govt)", "ASTM Standards", "Mill Certifications"]},
    {"country_code": "US", "product_category": "pharma", "cert_list": ["FDA NDA/ANDA Approval", "DEA Registration", "USP Standards Compliance", "cGMP Compliance"]},
    {"country_code": "US", "product_category": "automotive", "cert_list": ["FMVSS Compliance", "EPA Emissions Certification", "DOT Marking"]},
    # UK
    {"country_code": "UK", "product_category": "general", "cert_list": ["UKCA Marking", "UK Declaration of Conformity"]},
    {"country_code": "UK", "product_category": "food", "cert_list": ["DEFRA Import Authorization", "Health Certificate", "Phytosanitary Certificate", "HACCP"]},
    {"country_code": "UK", "product_category": "textiles", "cert_list": ["UK REACH", "UKCA Marking", "Flammability Standards"]},
    {"country_code": "UK", "product_category": "chemicals", "cert_list": ["UK REACH Registration", "CLP (UK)", "Safety Data Sheet"]},
    {"country_code": "UK", "product_category": "electronics", "cert_list": ["UKCA Mark", "UK RoHS", "EMC Regulations 2016"]},
    {"country_code": "UK", "product_category": "steel", "cert_list": ["BS EN Standards", "Mill Test Certificate"]},
    # UAE
    {"country_code": "UAE", "product_category": "general", "cert_list": ["ECAS Certificate", "Emirates Conformity Assessment Scheme"]},
    {"country_code": "UAE", "product_category": "food", "cert_list": ["Dubai Municipality Import Permit", "Halal Certification (mandatory for meat)", "Health Certificate", "ESMA Registration"]},
    {"country_code": "UAE", "product_category": "textiles", "cert_list": ["UAE.S quality marks", "ECAS for textiles"]},
    {"country_code": "UAE", "product_category": "chemicals", "cert_list": ["ECAS Registration", "MSDS in Arabic"]},
    # Japan
    {"country_code": "Japan", "product_category": "general", "cert_list": ["JIS Mark", "PSE Mark (electrical)", "JAS (agricultural)"]},
    {"country_code": "Japan", "product_category": "food", "cert_list": ["Plant Quarantine Certificate", "JAS Organic", "Food Sanitation Act Compliance", "Radioactivity Certificate"]},
    {"country_code": "Japan", "product_category": "textiles", "cert_list": ["JIS Standards", "Azo Dye-Free Certification", "Fire Safety Law Compliance"]},
    {"country_code": "Japan", "product_category": "chemicals", "cert_list": ["CSCL (Chemical Substances Control Law)", "PRTR Registration", "Safety Data Sheet (Japanese)"]},
    {"country_code": "Japan", "product_category": "electronics", "cert_list": ["PSE Mark", "VCCI Mark (EMC)", "S-Mark", "Energy Saving Act"]},
    {"country_code": "Japan", "product_category": "steel", "cert_list": ["JIS Certification", "Mill Test Certificate"]},
    # Australia
    {"country_code": "Australia", "product_category": "general", "cert_list": ["RCM (Regulatory Compliance Mark)", "SAI Global"]},
    {"country_code": "Australia", "product_category": "food", "cert_list": ["DAFF Import Permit", "Phytosanitary Certificate", "HACCP", "Biosecurity Import Conditions (BICON)"]},
    {"country_code": "Australia", "product_category": "textiles", "cert_list": ["Product Safety Standards", "Care Labeling Standard AS/NZS 1957"]},
    {"country_code": "Australia", "product_category": "chemicals", "cert_list": ["AICIS (Industrial Chemicals)", "APVMA (agricultural chemicals)", "Safety Data Sheet"]},
    {"country_code": "Australia", "product_category": "electronics", "cert_list": ["RCM Mark", "AS/NZS Standards", "Energy Rating Label"]},
]


# ======================================================================
# 3. PRODUCT CATEGORIES (from src/data/products.ts)
# ======================================================================

PRODUCT_CATEGORIES = [
    {"id": "food", "label": "Food & Agriculture", "icon": "\U0001f33e", "hs_prefix": ["01-24"]},
    {"id": "textiles", "label": "Textiles & Apparel", "icon": "\U0001f9f5", "hs_prefix": ["50-63"]},
    {"id": "chemicals", "label": "Chemicals & Fertilizers", "icon": "\u2697\ufe0f", "hs_prefix": ["28-38"]},
    {"id": "electronics", "label": "Electronics & Electricals", "icon": "\u26a1", "hs_prefix": ["84-85"]},
    {"id": "steel", "label": "Steel & Iron Products", "icon": "\U0001f529", "hs_prefix": ["72-73"]},
    {"id": "pharma", "label": "Pharmaceuticals", "icon": "\U0001f48a", "hs_prefix": ["30"]},
    {"id": "automotive", "label": "Automotive & Parts", "icon": "\U0001f697", "hs_prefix": ["87"]},
    {"id": "machinery", "label": "Machinery & Equipment", "icon": "\u2699\ufe0f", "hs_prefix": ["84"]},
    {"id": "general", "label": "Other / General", "icon": "\U0001f4e6", "hs_prefix": []},
]


# ======================================================================
# 4. FTA AGREEMENTS (from src/data/fta.ts)
# ======================================================================

FTA_AGREEMENTS = [
    {"country_code": "EU", "name": "India-EU FTA", "status": "Under Negotiation", "round": "Round 7+", "preferential_tariff": False, "notes": "Negotiations ongoing; interim MFN rates apply. Key sticking points: dairy, auto, data localization"},
    {"country_code": "US", "name": "India-US Trade Relations", "status": "No FTA", "preferential_tariff": False, "notes": "GSP restored partially. Mini trade deals under discussion. Section 301 watch"},
    {"country_code": "UK", "name": "India-UK FTA", "status": "Under Negotiation", "round": "Round 14+", "preferential_tariff": False, "notes": "Expected conclusion 2025. Mobility, IP, agriculture are key issues"},
    {"country_code": "UAE", "name": "India-UAE CEPA", "status": "Active", "effective_date": "2022-05-01", "preferential_tariff": True, "notes": "Covers 90%+ tariff lines. Certificate of Origin required for preferential rates"},
    {"country_code": "Japan", "name": "India-Japan CEPA + RCEP", "status": "Active", "effective_date": "2011-08-01", "preferential_tariff": True, "notes": "Bilateral CEPA + RCEP benefits. Rules of Origin compliance critical"},
    {"country_code": "Australia", "name": "India-Australia ECTA", "status": "Active", "effective_date": "2022-12-29", "preferential_tariff": True, "notes": "Interim agreement; CECA (comprehensive) under negotiation. 85% tariff lines covered"},
]


# ======================================================================
# 5. EXPORT SCHEMES (from src/data/indian-schemes.ts)
# ======================================================================

EXPORT_SCHEMES = [
    {"name": "RoDTEP", "description": "Remission of Duties and Taxes on Exported Products", "status": "Active"},
    {"name": "PLI Scheme", "description": "Production Linked Incentive for eligible sectors", "status": "Sector-specific"},
    {"name": "MEIS/RoSCTL", "description": "Merchandise Exports from India / Rebate of State and Central Taxes", "status": "Check current rates"},
    {"name": "Advance Authorization", "description": "Duty-free import of inputs for export production", "status": "Active"},
    {"name": "EPCG Scheme", "description": "Export Promotion Capital Goods at zero/reduced duty", "status": "Active"},
    {"name": "SEZ/EOU Benefits", "description": "Special Economic Zone / Export Oriented Unit tax benefits", "status": "Active"},
    {"name": "ECGC Insurance", "description": "Export Credit Guarantee Corporation coverage", "status": "Active"},
    {"name": "Market Access Initiative", "description": "Financial assistance for export promotion activities", "status": "Active"},
]


# ======================================================================
# 6. REGULATORY CHANGES (from src/data/regulatory-db.ts .recentChanges)
# ======================================================================

REGULATORY_CHANGES = [
    {"country_code": "EU", "date": "2024-07", "change_description": "EU Deforestation Regulation (EUDR) enforcement postponed to Dec 2025", "severity": "warning"},
    {"country_code": "EU", "date": "2024-10", "change_description": "CBAM reporting simplified for small importers", "severity": "info"},
    {"country_code": "EU", "date": "2025-01", "change_description": "Digital Product Passport requirements announced for batteries", "severity": "info"},
    {"country_code": "US", "date": "2024-06", "change_description": "Section 301 tariffs increased on Chinese goods (affects competitive landscape)", "severity": "info"},
    {"country_code": "US", "date": "2025-01", "change_description": "New forced labor import restrictions under UFLPA expanded", "severity": "warning"},
    {"country_code": "UK", "date": "2024-12", "change_description": "India-UK FTA negotiations ongoing; interim trade provisions", "severity": "info"},
    {"country_code": "UK", "date": "2025-02", "change_description": "UKCA marking transition deadline extended", "severity": "info"},
    {"country_code": "UAE", "date": "2024-09", "change_description": "India-UAE CEPA benefits expanded to more product lines", "severity": "info"},
    {"country_code": "Japan", "date": "2024-11", "change_description": "RCEP tariff reductions Phase 3 effective", "severity": "info"},
    {"country_code": "Australia", "date": "2024-07", "change_description": "India-Australia ECTA tariff reductions Phase 2", "severity": "info"},
    {"country_code": "Australia", "date": "2025-01", "change_description": "Mandatory climate reporting begins for large entities", "severity": "warning"},
]


# ======================================================================
# 7. HS TARIFF RATES (from scraped fta_data_trade_connect.json)
# ======================================================================

HS_TARIFF_RATES = []

# Load from existing scraped data if available
try:
    with open("../fta_data_trade_connect.json", "r", encoding="utf-8") as f:
        scraped = json.load(f)
    for item in scraped:
        # Map HS code to product category
        hs_num = int(item["hs_code"][:2]) if item["hs_code"] else 0
        category = "general"
        if 1 <= hs_num <= 24:
            category = "food"
        elif 28 <= hs_num <= 38:
            category = "chemicals"
        elif 50 <= hs_num <= 63:
            category = "textiles"
        elif hs_num in (72, 73):
            category = "steel"
        elif hs_num in (84, 85):
            category = "electronics"
        elif hs_num == 30:
            category = "pharma"
        elif hs_num == 87:
            category = "automotive"
        elif hs_num == 71:
            category = "jewelry"

        try:
            mfn = float(str(item.get("mfn_rate", "0")).replace("%", "").strip() or 0)
            pref = float(str(item.get("cepa_rate", "0")).replace("%", "").strip() or 0)
        except ValueError:
            mfn, pref = 0, 0

        # Map ISO country codes to our internal codes
        iso_to_internal = {"AE": "UAE", "AU": "AU", "JP": "JP", "GB": "UK"}
        raw_country = item.get("country", "UAE")
        country_code = iso_to_internal.get(raw_country, raw_country)

        HS_TARIFF_RATES.append({
            "hs_code": item["hs_code"],
            "hs_description": item.get("product_description", ""),
            "country_code": country_code,
            "agreement": "India-UAE CEPA",
            "mfn_rate": mfn,
            "preferential_rate": pref,
            "rule_of_origin": item.get("rule_of_origin"),
            "product_category": category,
            "source": "trade.gov.in",
        })
    print(f"   Loaded {len(HS_TARIFF_RATES)} tariff rates from scraped data")
except FileNotFoundError:
    print("   No scraped FTA data file found, skipping tariff rates")


# ======================================================================
# RUN SEED
# ======================================================================

def seed():
    print("=" * 60)
    print("ComplianceOS Database Seed")
    print("=" * 60)

    # 1. Countries
    print("\n1. Seeding countries...")
    for c in COUNTRIES:
        supabase.table("countries").upsert(c, on_conflict="code").execute()
    print(f"   Inserted {len(COUNTRIES)} countries")

    # 2. Certifications
    print("\n2. Seeding certifications...")
    for cert in CERTIFICATIONS:
        supabase.table("certifications").upsert(
            cert, on_conflict="country_code,product_category"
        ).execute()
    print(f"   Inserted {len(CERTIFICATIONS)} certification records")

    # 3. Product categories
    print("\n3. Seeding product categories...")
    for p in PRODUCT_CATEGORIES:
        supabase.table("product_categories").upsert(p, on_conflict="id").execute()
    print(f"   Inserted {len(PRODUCT_CATEGORIES)} product categories")

    # 4. FTA agreements
    print("\n4. Seeding FTA agreements...")
    for fta in FTA_AGREEMENTS:
        supabase.table("fta_agreements").upsert(
            fta, on_conflict="country_code"
        ).execute()
    print(f"   Inserted {len(FTA_AGREEMENTS)} FTA agreements")

    # 5. Export schemes
    print("\n5. Seeding export schemes...")
    for scheme in EXPORT_SCHEMES:
        supabase.table("export_schemes").upsert(scheme, on_conflict="id").execute()
    print(f"   Inserted {len(EXPORT_SCHEMES)} export schemes")

    # 6. Regulatory changes
    print("\n6. Seeding regulatory changes...")
    for change in REGULATORY_CHANGES:
        supabase.table("regulatory_changes").upsert(change, on_conflict="id").execute()
    print(f"   Inserted {len(REGULATORY_CHANGES)} regulatory changes")

    # 7. HS tariff rates
    if HS_TARIFF_RATES:
        print("\n7. Seeding HS tariff rates...")
        for rate in HS_TARIFF_RATES:
            supabase.table("hs_tariff_rates").upsert(
                rate, on_conflict="hs_code,country_code,agreement"
            ).execute()
        print(f"   Inserted {len(HS_TARIFF_RATES)} tariff rates")

    print("\n" + "=" * 60)
    print("SEED COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    seed()
