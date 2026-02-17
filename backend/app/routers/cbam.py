"""
CBAM report endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from supabase import Client
import io

from app.dependencies import get_supabase_admin, get_current_user
from app.services.cbam_report import generate_cbam_report_pdf

router = APIRouter(prefix="/api/v1/cbam", tags=["CBAM"])


@router.post("/report-pdf")
async def generate_cbam_pdf(
    quarter: str = Query(..., description="Quarter in format YYYY-QN, e.g., 2025-Q1"),
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin),
):
    """
    Generate a CBAM quarterly report PDF for the user's company.
    Returns the PDF as a streaming download.
    """
    company_id = current_user["company_id"]

    try:
        pdf_bytes = await generate_cbam_report_pdf(
            company_id=company_id,
            quarter=quarter,
            supabase=supabase,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate CBAM report: {str(e)}")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=cbam_report_{quarter}.pdf"
        },
    )
