"""
CBAM (Carbon Border Adjustment Mechanism) quarterly report PDF generator.
Generates a report summarizing a company's CBAM-relevant shipments.
"""

import io
import logging
from datetime import datetime

from reportlab.lib import colors as rl_colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)

logger = logging.getLogger("complianceos.cbam")


# CBAM-covered sectors and their HS code prefixes
CBAM_SECTORS = {
    "iron_steel": {"label": "Iron & Steel", "hs_prefixes": ["72", "73"]},
    "aluminium": {"label": "Aluminium", "hs_prefixes": ["76"]},
    "cement": {"label": "Cement", "hs_prefixes": ["2523"]},
    "fertilisers": {"label": "Fertilisers", "hs_prefixes": ["31"]},
    "electricity": {"label": "Electricity", "hs_prefixes": ["2716"]},
    "hydrogen": {"label": "Hydrogen", "hs_prefixes": ["2804"]},
}


def _get_cbam_sector(hs_code: str) -> str | None:
    """Determine CBAM sector from HS code."""
    if not hs_code:
        return None
    for sector_id, info in CBAM_SECTORS.items():
        for prefix in info["hs_prefixes"]:
            if hs_code.startswith(prefix):
                return info["label"]
    return None


async def generate_cbam_report_pdf(
    company_id: str,
    quarter: str,  # e.g., "2025-Q1"
    supabase,
) -> bytes:
    """
    Generate a CBAM quarterly report PDF.
    Returns the PDF as bytes.
    """
    # Parse quarter
    parts = quarter.split("-")
    year = parts[0] if len(parts) >= 2 else str(datetime.now().year)
    q = parts[1] if len(parts) >= 2 else "Q1"

    quarter_map = {
        "Q1": ("01-01", "03-31"),
        "Q2": ("04-01", "06-30"),
        "Q3": ("07-01", "09-30"),
        "Q4": ("10-01", "12-31"),
    }
    start_date, end_date = quarter_map.get(q.upper(), ("01-01", "03-31"))
    date_from = f"{year}-{start_date}"
    date_to = f"{year}-{end_date}"

    # Fetch company info
    company_res = (
        supabase.table("companies")
        .select("*")
        .eq("id", company_id)
        .single()
        .execute()
    )
    company = company_res.data or {"name": "Unknown Company"}

    # Fetch shipments in this quarter to EU
    shipments_res = (
        supabase.table("shipments")
        .select("*")
        .eq("company_id", company_id)
        .gte("date", date_from)
        .lte("date", date_to)
        .execute()
    )
    all_shipments = shipments_res.data or []

    # Filter to EU shipments with CBAM-relevant HS codes
    cbam_shipments = []
    for s in all_shipments:
        if s.get("country", "").upper() in ["EU", "EUROPEAN UNION"]:
            hs_code = s.get("hs_code", "")
            sector = _get_cbam_sector(hs_code)
            if sector:
                cbam_shipments.append({**s, "cbam_sector": sector})

    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CBAMTitle",
        parent=styles["Title"],
        fontSize=18,
        spaceAfter=6,
    )
    heading_style = ParagraphStyle(
        "CBAMHeading",
        parent=styles["Heading2"],
        fontSize=14,
        spaceBefore=12,
        spaceAfter=6,
    )
    normal_style = styles["Normal"]
    small_style = ParagraphStyle(
        "Small",
        parent=styles["Normal"],
        fontSize=8,
        textColor=rl_colors.grey,
    )

    elements = []

    # Title
    elements.append(Paragraph("CBAM Quarterly Report", title_style))
    elements.append(Paragraph(
        f"<b>Company:</b> {company.get('name', 'N/A')} &nbsp;&nbsp; "
        f"<b>Quarter:</b> {q.upper()} {year} &nbsp;&nbsp; "
        f"<b>Period:</b> {date_from} to {date_to}",
        normal_style,
    ))
    elements.append(Spacer(1, 8 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=rl_colors.HexColor("#1a56db")))
    elements.append(Spacer(1, 4 * mm))

    # Summary
    elements.append(Paragraph("1. Executive Summary", heading_style))
    total_value = sum(float(s.get("shipment_value", 0) or 0) for s in cbam_shipments)
    sectors_found = list(set(s["cbam_sector"] for s in cbam_shipments))

    elements.append(Paragraph(
        f"During {q.upper()} {year}, <b>{company.get('name', 'N/A')}</b> had "
        f"<b>{len(cbam_shipments)}</b> CBAM-relevant shipment(s) to the EU "
        f"with a total declared value of <b>₹{total_value:,.2f}</b>.",
        normal_style,
    ))
    if sectors_found:
        elements.append(Paragraph(
            f"Covered sectors: {', '.join(sectors_found)}",
            normal_style,
        ))
    elements.append(Spacer(1, 4 * mm))

    # Shipments table
    elements.append(Paragraph("2. CBAM-Relevant Shipments", heading_style))
    if cbam_shipments:
        table_data = [["#", "Shipment", "HS Code", "Sector", "Value (₹)", "Date"]]
        for i, s in enumerate(cbam_shipments, 1):
            table_data.append([
                str(i),
                s.get("name", "N/A"),
                s.get("hs_code", "N/A"),
                s.get("cbam_sector", "N/A"),
                f"₹{float(s.get('shipment_value', 0) or 0):,.2f}",
                s.get("date", "N/A"),
            ])
        table = Table(table_data, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), rl_colors.HexColor("#1a56db")),
            ("TEXTCOLOR", (0, 0), (-1, 0), rl_colors.white),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, rl_colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [rl_colors.white, rl_colors.HexColor("#f0f4ff")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph(
            "<i>No CBAM-relevant shipments found for this quarter.</i>",
            normal_style,
        ))

    elements.append(Spacer(1, 6 * mm))

    # Compliance notes
    elements.append(Paragraph("3. Compliance Notes", heading_style))
    elements.append(Paragraph(
        "• EU CBAM transitional phase requires quarterly reporting of embedded emissions.<br/>"
        "• Importers must submit CBAM reports via the EU CBAM Transitional Registry.<br/>"
        "• Ensure emissions data (direct + indirect) is collected from manufacturing facilities.<br/>"
        "• CBAM certificates will be required for definitive phase (starting 2026).",
        normal_style,
    ))

    elements.append(Spacer(1, 10 * mm))

    # Footer
    elements.append(HRFlowable(width="100%", thickness=0.5, color=rl_colors.grey))
    elements.append(Paragraph(
        f"Generated by ComplianceOS on {datetime.now().strftime('%Y-%m-%d %H:%M')}. "
        "This report is for informational purposes only and does not constitute legal advice. "
        "Consult with a qualified trade compliance advisor before submission.",
        small_style,
    ))

    doc.build(elements)
    return buffer.getvalue()
