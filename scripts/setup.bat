@echo off
REM Setup script for ITC Trade Map scraper

echo ====================================
echo ITC Trade Map Scraper - Setup
echo ====================================
echo.

echo Installing Python dependencies...
pip install playwright pandas

echo.
echo Installing Playwright browsers...
playwright install chromium

echo.
echo ====================================
echo Setup complete!
echo ====================================
echo.
echo To run the scraper:
echo   python scripts\scrape_itc_fta.py
echo.
pause
