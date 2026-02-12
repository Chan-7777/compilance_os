# Trade Connect FTA Scraper

Extracts FTA tariff data from India's **Trade Connect** portal (trade.gov.in) using Playwright.

## Setup

```bash
pip install playwright
playwright install chromium
```

## Usage

### Single HS Code
```bash
python scripts/scrape_trade_connect.py --hs 7113
```

### Batch Mode (all 10 pre-defined products)
```bash
python scripts/scrape_trade_connect.py --batch
```

### Visible Browser (debug mode)
```bash
python scripts/scrape_trade_connect.py --hs 7113 --head
```

### Different Country
```bash
python scripts/scrape_trade_connect.py --hs 7113 --country jp
```

## What It Extracts

| Field | Source |
| --- | --- |
| Product Description | National Tariff Line table |
| MFN Rate (%) | Most Favoured Nation table |
| CEPA/FTA Rate (%) | Preferential Tariff table |
| Rule of Origin (PSR) | Expanded CEPA accordion row |

## Output

- `fta_data_trade_connect.json`
- `fta_data_trade_connect.csv`

## Pre-defined Products

| HS Code | Product |
| --- | --- |
| 7208 | Steel |
| 6109 | T-shirts |
| 6203 | Men's suits |
| 2922 | Organic chemicals |
| 8471 | Computers |
| 8517 | Phones/telecom |
| 7113 | Jewelry |
| 0306 | Seafood (shrimp) |
| 1006 | Rice |
| 0902 | Tea |
