"""PDF certificate generation for EE-module completion."""

from __future__ import annotations

import io
from datetime import date


def render_certificate_pdf(
    user_name: str,
    school_name: str | None,
    completed_lessons: int,
    issue_date: date | None = None,
) -> bytes:
    """Render a simple A4 certificate as a PDF (via reportlab)."""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    if issue_date is None:
        issue_date = date.today()

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    w, h = landscape(A4)

    c.setFillColorRGB(0.06, 0.46, 0.43)  # teal
    c.rect(0, h - 40 * mm, w, 40 * mm, fill=True, stroke=False)

    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(w / 2, h - 25 * mm, "TideGuard AI")
    c.setFont("Helvetica", 14)
    c.drawCentredString(w / 2, h - 33 * mm, "Certificate of Completion — Environmental Education Module")

    c.setFillColorRGB(0.1, 0.1, 0.1)
    c.setFont("Helvetica", 14)
    c.drawCentredString(w / 2, h - 60 * mm, "This certifies that")
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(w / 2, h - 75 * mm, user_name)

    c.setFont("Helvetica", 12)
    affiliation = f"of {school_name}" if school_name else "as an independent learner"
    c.drawCentredString(w / 2, h - 88 * mm, affiliation)
    c.drawCentredString(
        w / 2,
        h - 105 * mm,
        f"has successfully completed {completed_lessons} TideGuard EE lessons,",
    )
    c.drawCentredString(
        w / 2,
        h - 113 * mm,
        "demonstrating knowledge of marine plastic pollution and citizen science.",
    )

    c.setFont("Helvetica", 11)
    c.drawString(30 * mm, 25 * mm, f"Issued: {issue_date.isoformat()}")
    c.drawRightString(w - 30 * mm, 25 * mm, "TideGuard AI — tideguard.app")

    c.setStrokeColorRGB(0.06, 0.46, 0.43)
    c.setLineWidth(2)
    c.rect(10 * mm, 10 * mm, w - 20 * mm, h - 20 * mm, stroke=True, fill=False)

    c.showPage()
    c.save()
    return buffer.getvalue()
