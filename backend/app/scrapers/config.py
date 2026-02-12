"""
Scraper Configuration — HS codes, FTA countries, rate limits.
"""

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

# Rate limiting
SCRAPE_DELAY_SECONDS = 3
MAX_RETRIES = 3
REQUEST_TIMEOUT = 60000  # ms, for Playwright

# HS codes by product category (India's top export items per DGFT statistics)
HS_CODES_BY_CATEGORY: dict[str, list[str]] = {
    "steel": [
        "7208", "7209", "7210", "7213", "7214", "7219", "7220",
        "7225", "7226", "7227", "7228", "7304", "7306", "7307",
        "7318", "7326",
    ],
    "textiles": [
        "5205", "5208", "5209", "5407", "5503", "5509", "5903",
        "6001", "6109", "6110", "6203", "6204", "6205", "6206",
        "6302", "6303", "6305", "6307",
    ],
    "chemicals": [
        "2710", "2711", "2817", "2902", "2917", "2922", "2933",
        "2934", "2942", "3808", "3815", "3824",
    ],
    "pharma": [
        "3003", "3004", "3006",
    ],
    "food": [
        "0306", "0713", "0902", "0904", "0910", "1006", "1513",
        "1701", "2005", "2008", "2106",
    ],
    "electronics": [
        "8414", "8421", "8431", "8471", "8473", "8504", "8517",
        "8523", "8529", "8534", "8541", "8542", "8544",
    ],
    "automotive": [
        "8703", "8708", "8711", "8714",
    ],
    "jewelry": [
        "7102", "7113", "7117",
    ],
    "general": [
        "3926", "4011", "4202", "4421", "6802", "6810", "6911",
        "9403", "9503",
    ],
}

# FTA countries with active/near-active agreements
FTA_COUNTRIES = [
    {"code": "UAE", "trade_connect_code": "ae", "agreement": "India-UAE CEPA"},
    {"code": "JP", "trade_connect_code": "jp", "agreement": "India-Japan CEPA"},
    {"code": "AU", "trade_connect_code": "au", "agreement": "India-Australia ECTA"},
]

# Total HS codes
TOTAL_HS_CODES = sum(len(codes) for codes in HS_CODES_BY_CATEGORY.values())

# DGFT relevance keywords
DGFT_RELEVANCE_KEYWORDS = [
    "export", "CEPA", "FTA", "tariff", "HS code", "certificate of origin",
    "RoDTEP", "PLI", "CBAM", "packaging", "labeling", "pre-shipment",
    "quality control", "import export", "DGFT", "foreign trade policy",
    "advance authorization", "EPCG", "SEZ", "EOU",
]

# CBAM keywords for EUR-Lex filtering
CBAM_KEYWORDS = [
    "CBAM", "carbon border", "carbon adjustment", "embedded carbon",
    "emission trading", "ETS",
]
