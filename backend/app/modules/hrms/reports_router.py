import csv
import html
import io
from datetime import date, datetime
from typing import Any
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from openpyxl import Workbook
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, TableStyle
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, get_current_user_optional
from app.modules.auth.models import User
from app.modules.hrms.reports_schemas import ReportFilters, ReportMetadata, ReportPage
from app.modules.hrms.reports_service import (
    REPORT_DESCRIPTIONS,
    REPORT_TITLES,
    SENSITIVE_REPORTS,
    ReportId,
    audit_export,
    get_filter_options,
    get_report_rows,
    has_report_access,
)

router = APIRouter(prefix="/reports", tags=["HR reports"])
MAX_EXPORT_ROWS = 10_000
METADATA_FILTERS = {
    ReportId.EMPLOYEE_MASTER: ["search", "company_id", "branch_id", "department_id", "designation_id", "project_id", "status", "employment_type"],
    ReportId.EMPLOYEE_DIRECTORY: ["search", "company_id", "branch_id", "department_id"],
    ReportId.EMPLOYEE_HEADCOUNT: ["company_id", "branch_id", "department_id", "project_id", "status"],
    ReportId.NEW_JOINING: ["search", "company_id", "branch_id", "department_id", "start_date", "end_date", "financial_year"],
    ReportId.RESIGNATION_SEPARATION: ["search", "department_id", "separation_type", "status", "start_date", "end_date"],
    ReportId.EMPLOYEE_TRANSFER: ["search", "department_id", "start_date", "end_date"],
    ReportId.PROMOTION_INCREMENT: ["search", "department_id", "revision_type", "status", "start_date", "end_date"],
    ReportId.DOCUMENT_EXPIRY: ["search", "document_type", "start_date", "end_date"],
    ReportId.RECRUITMENT: ["search", "recruitment_type", "status", "start_date", "end_date"],
    ReportId.EMPLOYEE_TURNOVER: ["company_id", "start_date", "end_date", "financial_year"],
    ReportId.MANPOWER_ALLOCATION: ["search", "department_id", "project_id", "period_code", "cost_center", "status"],
    ReportId.EMPLOYEE_LOAN_ADVANCE: ["search", "status", "start_date", "end_date"],
    ReportId.PAYROLL_REGISTER: ["search", "period_code", "status", "start_date", "end_date"],
    ReportId.SALARY_SHEET: ["search", "period_code", "status", "start_date", "end_date"],
    ReportId.BANK_DISBURSEMENT: ["search", "period_code", "status", "start_date", "end_date"],
}
SOURCE_NOTES = {
    ReportId.DOCUMENT_EXPIRY: "Expiry dates come from employee document JSON and passport expiry fields; document contents are not returned.",
    ReportId.EMPLOYEE_TRANSFER: "Only saved transfer-history records are reported. Project history is limited to IDs recorded by the HR transfer source.",
    ReportId.EMPLOYEE_TURNOVER: "Headcount is reconstructed from joining dates and recorded separation dates, not monthly snapshots.",
    ReportId.MANPOWER_ALLOCATION: "Only posted/persisted project cost allocation records are reported; unallocated labor is not estimated.",
}


def _safe_filter_summary(filters: ReportFilters) -> str:
    parts = []
    for name in ("company_id", "branch_id", "department_id", "designation_id", "project_id", "employee_id", "status", "employment_type", "separation_type", "revision_type", "document_type", "recruitment_type", "period_code", "cost_center", "financial_year", "start_date", "end_date"):
        value = getattr(filters, name)
        if value is not None:
            parts.append(f"{name.replace('_', ' ')}: {value}")
    if filters.search:
        parts.append("Search applied")
    return ", ".join(parts) or "No filters"


def _safe_cell(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if value is None:
        return ""
    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def _filename(report: ReportId, file_format: str) -> str:
    return f"{report.value}-{date.today().isoformat()}.{file_format}"


def _csv_content(columns: list[dict[str, str]], rows: list[dict[str, Any]]) -> bytes:
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer)
    writer.writerow([column["label"] for column in columns])
    for row in rows:
        writer.writerow([_safe_cell(row.get(column["key"])) for column in columns])
    return ("\ufeff" + buffer.getvalue()).encode("utf-8")


def _xlsx_content(columns: list[dict[str, str]], rows: list[dict[str, Any]], title: str) -> bytes:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = title[:31]
    sheet.append([column["label"] for column in columns])
    for row in rows:
        sheet.append([_safe_cell(row.get(column["key"])) for column in columns])
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    for cell in sheet[1]:
        cell.font = cell.font.copy(bold=True, color="FFFFFF")
        cell.fill = __import__("openpyxl").styles.PatternFill("solid", fgColor="17324F")
    for column_cells in sheet.columns:
        width = min(max(max(len(str(cell.value or "")) for cell in column_cells) + 2, 12), 42)
        sheet.column_dimensions[column_cells[0].column_letter].width = width
    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


def _pdf_content(columns: list[dict[str, str]], rows: list[dict[str, Any]], title: str, summary: str) -> bytes:
    output = io.BytesIO()
    document = SimpleDocTemplate(
        output, pagesize=landscape(A4), rightMargin=24, leftMargin=24, topMargin=28, bottomMargin=28,
        title=title,
    )
    styles = getSampleStyleSheet()
    body = ParagraphStyle("reportBody", parent=styles["BodyText"], fontSize=7, leading=9, alignment=TA_LEFT)
    data = [[Paragraph(escape(str(column["label"])), body) for column in columns]]
    for row in rows:
        data.append([Paragraph(escape(str(_safe_cell(row.get(column["key"])))), body) for column in columns])
    table = LongTable(data, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17324f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d6dee8")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f6f9")]),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    document.build([
        Paragraph(escape(title), styles["Title"]),
        Paragraph(f"Generated {datetime.now().astimezone().isoformat(timespec='minutes')} · {escape(summary)}", styles["Normal"]),
        table,
    ])
    return output.getvalue()


def _print_content(columns: list[dict[str, str]], rows: list[dict[str, Any]], title: str, summary: str) -> str:
    headers = "".join(f"<th>{html.escape(column['label'])}</th>" for column in columns)
    body = "".join(
        "<tr>" + "".join(f"<td>{html.escape(str(_safe_cell(row.get(column['key']))))}</td>" for column in columns) + "</tr>"
        for row in rows
    )
    generated = datetime.now().astimezone().isoformat(timespec="minutes")
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{html.escape(title)}</title>
    <style>
      @page {{ size: A4 landscape; margin: 14mm; }}
      body {{ font: 10px/1.45 Arial, sans-serif; color: #172b40; }}
      h1 {{ font-size: 18px; margin: 0 0 5px; }} .meta {{ color: #44576a; margin-bottom: 14px; }}
      table {{ width: 100%; border-collapse: collapse; }} th,td {{ border: 1px solid #cbd5df; padding: 5px; text-align: left; }}
      th {{ color: white; background: #17324f; }} tr:nth-child(even) {{ background: #f3f6f9; }}
      thead {{ display: table-header-group; }} tr {{ page-break-inside: avoid; }}
      @media screen {{ body {{ max-width: 1200px; margin: 24px auto; }} }}
    </style></head><body><h1>{html.escape(title)}</h1>
    <p class="meta">{html.escape(summary)} · Generated {html.escape(generated)} · {len(rows)} rows</p>
    <table><thead><tr>{headers}</tr></thead><tbody>{body}</tbody></table>
    <script>window.addEventListener('load',()=>window.print())</script></body></html>"""


async def _ensure_access(
    db: AsyncSession,
    user: User,
    report: ReportId,
    filters: ReportFilters,
    export_format: str | None = None,
) -> int:
    org_id = getattr(user, "organization_id", None)
    if not org_id:
        raise HTTPException(status_code=403, detail="Your account is not assigned to an organization.")
    if report in SENSITIVE_REPORTS and not await has_report_access(db, user):
        if export_format:
            try:
                await audit_export(db, org_id, user.id, report, filters, export_format, False, reason="HR report access is required")
                await db.commit()
            except Exception:
                await db.rollback()
        raise HTTPException(status_code=403, detail="HR report access is required for this sensitive report.")
    return int(org_id)


@router.get("/metadata", response_model=list[ReportMetadata])
@router.head("/metadata")
async def report_metadata(current_user: User | None = Depends(get_current_user_optional)):
    report_ids = list(ReportId)
    return [
        ReportMetadata(
            id=report_id,
            title=REPORT_TITLES.get(report_id, report_id.value.replace('-', ' ').title()),
            description=REPORT_DESCRIPTIONS.get(report_id, "Standard HRMS intelligence report."),
            filters=METADATA_FILTERS.get(report_id, ["search", "company_id", "branch_id", "department_id", "project_id", "status", "start_date", "end_date"]),
            sensitive=report_id in SENSITIVE_REPORTS,
            source_note=SOURCE_NOTES.get(report_id),
        )
        for report_id in report_ids
    ]


@router.get("/filter-options")
async def report_filter_options(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.organization_id:
        raise HTTPException(status_code=403, detail="Your account is not assigned to an organization.")
    return await get_filter_options(db, int(current_user.organization_id))


@router.get("/{report_id}/rows", response_model=ReportPage)
async def report_rows(
    report_id: ReportId,
    filters: ReportFilters = Depends(),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = await _ensure_access(db, current_user, report_id, filters)
    columns, rows, total = await get_report_rows(db, report_id, org_id, filters, limit, offset)
    return ReportPage(
        report_id=report_id,
        title=REPORT_TITLES[report_id],
        description=REPORT_DESCRIPTIONS[report_id],
        columns=columns,
        rows=rows,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{report_id}/export")
async def export_report(
    report_id: ReportId,
    filters: ReportFilters = Depends(),
    export_format: str = Query("xlsx", alias="format", pattern="^(csv|xlsx|pdf|print)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = await _ensure_access(db, current_user, report_id, filters, export_format)
    try:
        columns, rows, total = await get_report_rows(db, report_id, org_id, filters, MAX_EXPORT_ROWS, 0)
        summary = _safe_filter_summary(filters)
        truncated = total > len(rows)
        if export_format == "csv":
            content = _csv_content(columns, rows)
            media_type = "text/csv; charset=utf-8"
        elif export_format == "xlsx":
            content = _xlsx_content(columns, rows, REPORT_TITLES[report_id])
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif export_format == "pdf":
            content = _pdf_content(columns, rows, REPORT_TITLES[report_id], summary)
            media_type = "application/pdf"
        else:
            content = _print_content(columns, rows, REPORT_TITLES[report_id], summary).encode("utf-8")
            media_type = "text/html; charset=utf-8"
        await audit_export(db, org_id, current_user.id, report_id, filters, export_format, True, len(rows))
        await db.commit()
    except HTTPException:
        raise
    except Exception as error:
        await db.rollback()
        try:
            await audit_export(db, org_id, current_user.id, report_id, filters, export_format, False, reason="export_generation_failed")
            await db.commit()
        except Exception:
            await db.rollback()
        raise HTTPException(status_code=500, detail="The report export could not be generated.") from error

    headers = {"Content-Disposition": f'attachment; filename="{_filename(report_id, "html" if export_format == "print" else export_format)}"'}
    if truncated:
        headers["X-Export-Truncated"] = "true"
        headers["X-Export-Max-Rows"] = str(MAX_EXPORT_ROWS)
    if export_format == "print":
        headers["Content-Disposition"] = f'inline; filename="{_filename(report_id, "html")}"'
    return Response(content=content, media_type=media_type, headers=headers)
