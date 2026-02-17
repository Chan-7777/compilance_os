"""
Certificate of Origin (CoO) PDF Generator.

Generates a pre-filled Certificate of Origin PDF that exporters can submit
to their respective issuing authority for official certification.
"""

import io
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

from app.services.compliance_gate import ISSUING_AUTHORITIES


def generate_coo_pdf(
    exporter_name: str,
    product: str,
    hs_code: str | None,
    destination_country: str,
    fta_agreement: str | None,
    shipment_value: float | None,
    origin_criteria: str | None,
    shipment_name: str | None = None,
) -> io.BytesIO:
    """Generate a pre-filled Certificate of Origin PDF."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CooTitle",
        parent=styles["Title"],
        fontSize=18,
        spaceAfter=6,
        textColor=rl_colors.HexColor("#1a1a2e"),
    )
    subtitle_style = ParagraphStyle(
        "CooSubtitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=rl_colors.HexColor("#666666"),
        alignment=1,
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "CooHeading",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=rl_colors.HexColor("#1a1a2e"),
        spaceBefore=16,
        spaceAfter=8,
    )
    normal_style = styles["Normal"]
    footer_style = ParagraphStyle(
        "CooFooter",
        parent=styles["Normal"],
        fontSize=9,
        textColor=rl_colors.HexColor("#999999"),
        alignment=1,
        spaceBefore=20,
    )

    authority = ISSUING_AUTHORITIES.get(product, ISSUING_AUTHORITIES["general"])
    now = datetime.now().strftime("%d %B %Y")

    story = []

    # Header
    story.append(Paragraph("CERTIFICATE OF ORIGIN", title_style))
    if fta_agreement:
        story.append(Paragraph(f"Under {fta_agreement}", subtitle_style))
    else:
        story.append(Paragraph("Non-Preferential", subtitle_style))
    story.append(Paragraph(f"Generated on {now} | Reference: ComplianceOS", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=rl_colors.HexColor("#dddddd")))
    story.append(Spacer(1, 8))

    # Exporter Details
    story.append(Paragraph("1. Exporter Details", heading_style))
    exporter_data = [
        ["Exporter:", exporter_name],
        ["Country of Origin:", "India"],
        ["Issuing Authority:", authority],
    ]
    exporter_table = Table(exporter_data, colWidths=[140, 350])
    exporter_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(exporter_table)

    # Product Details
    story.append(Paragraph("2. Product Details", heading_style))
    product_data = [
        ["Product Category:", product.title()],
        ["HS Code:", hs_code or "Not specified"],
        ["Destination Country:", destination_country],
    ]
    if shipment_name:
        product_data.append(["Shipment Reference:", shipment_name])
    if shipment_value:
        product_data.append(["Declared Value (INR):", f"{shipment_value:,.2f}"])

    product_table = Table(product_data, colWidths=[140, 350])
    product_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(product_table)

    # FTA & Tariff Information
    if fta_agreement:
        story.append(Paragraph("3. Trade Agreement Details", heading_style))
        fta_data = [
            ["Agreement:", fta_agreement],
            ["Certificate Type:", "Preferential Certificate of Origin"],
        ]
        if origin_criteria:
            fta_data.append(["Rules of Origin:", origin_criteria])
        fta_table = Table(fta_data, colWidths=[140, 350])
        fta_table.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(fta_table)

    # Declaration
    story.append(Paragraph("Declaration", heading_style))
    story.append(Paragraph(
        "The undersigned hereby declares that the above-mentioned goods originate "
        "in India in accordance with the origin criteria and provisions of the "
        f"{'applicable Free Trade Agreement' if fta_agreement else 'relevant trade regulations'}.",
        normal_style,
    ))
    story.append(Spacer(1, 20))

    # Signature boxes
    sig_data = [
        ["Exporter's Signature & Stamp", "Authorised Signatory & Stamp"],
        ["", ""],
        ["Date: ________________", "Date: ________________"],
        [f"Name: {exporter_name}", f"Authority: {authority}"],
    ]
    sig_table = Table(sig_data, colWidths=[245, 245])
    sig_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (0, -1), 0.5, rl_colors.HexColor("#cccccc")),
        ("BOX", (1, 0), (1, -1), 0.5, rl_colors.HexColor("#cccccc")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(sig_table)

    # Footer
    story.append(HRFlowable(width="100%", thickness=0.5, color=rl_colors.HexColor("#eeeeee")))
    story.append(Paragraph(
        f"Submit this document to <b>{authority}</b> for official certification. "
        "This is a pre-filled draft and is NOT a legally binding document until "
        "endorsed by the issuing authority.",
        footer_style,
    ))
    story.append(Paragraph(
        "Generated by ComplianceOS | For guidance only — verify with official sources.",
        footer_style,
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer
