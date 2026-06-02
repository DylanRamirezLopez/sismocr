"""
PDF generation engine for earthquake reports.
Uses reportlab (already pip-installed). Generates a multi-page report with:
  - Summary stats table
  - Top 5 earthquakes list
  - Full data table
Why reportlab instead of jsPDF: Server-side generation means the PDF is ready
immediately — no client-side processing, no blocking the UI thread.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.earthquake import Earthquake
from app.services import earthquake_service as svc

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)
from reportlab.lib.units import mm


async def generate_pdf(db: AsyncSession) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("SismosCR — Reporte Sísmico", styles["Title"]))
    elements.append(
        Paragraph(
            f"Generado: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 12))

    # Summary stats
    stats = await svc.get_stats(db)
    summary_data = [
        ["Métrica", "Valor"],
        ["Total de sismos", str(stats["total"])],
        ["Magnitud máxima", f'{stats["max_magnitude"]:.1f} ML'],
        ["Magnitud promedio", f'{stats["avg_magnitude"]:.2f} ML'],
        ["Últimas 24h", str(stats["recent_24h"])],
    ]
    summary_table = Table(summary_data, colWidths=[120, 100])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#002B7F")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ])
    )
    elements.append(summary_table)
    elements.append(Spacer(1, 20))

    # Top 5
    elements.append(Paragraph("Top 5 Sismos por Magnitud", styles["Heading2"]))
    top_data = [["#", "Magnitud", "Ubicación", "Fecha"]]
    for i, eq in enumerate(stats["top_5"], 1):
        top_data.append([
            str(i),
            f'{eq["magnitude"]:.1f}',
            eq["location"] or "—",
            eq["occurred_at"][:19],
        ])
    top_table = Table(top_data, colWidths=[30, 60, 200, 120])
    top_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#CE1126")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ])
    )
    elements.append(top_table)
    elements.append(PageBreak())

    # Full table (last 100 quakes)
    elements.append(Paragraph("Historial Completo (últimos 100)", styles["Heading2"]))
    quakes, _ = await svc.get_history(db, per_page=100)
    full_data = [["Mag.", "Prof. (km)", "Ubicación", "Provincia", "Fecha"]]
    for q in quakes:
        full_data.append([
            f'{q.magnitude:.1f}',
            f'{q.depth_km:.0f}',
            q.location_description or "—",
            q.province or "—",
            q.occurred_at.strftime("%Y-%m-%d %H:%M"),
        ])
    full_table = Table(full_data, colWidths=[40, 50, 150, 80, 100])
    full_table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ])
    )
    elements.append(full_table)

    doc.build(elements)
    return buf.getvalue()
