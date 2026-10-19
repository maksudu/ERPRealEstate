import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_

from app.core.database import get_db
from app.modules.inventory.models import PropertyDocument, Unit
from app.modules.inventory.document_schemas import (
    PropertyDocumentCreate,
    PropertyDocumentUpdate,
    PropertyDocumentSupersede,
    PropertyDocumentApprove,
    PropertyDocumentResponse,
    PropertyDocumentPagedResponse,
    PropertyDocumentSummaryResponse
)

router = APIRouter(prefix="/documents", tags=["Spec 3.6: Property Documents & Floor Plans"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../static/uploads/property_documents"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


# =========================================================================
# 1. Summary Metrics & KPI Counter Strip (Spec 3.6)
# =========================================================================
@router.get("/summary", response_model=PropertyDocumentSummaryResponse)
async def get_document_summary(
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    base_filter = []
    if project_id:
        base_filter.append(PropertyDocument.project_id == project_id)

    async def get_count(additional_filter=None):
        conds = list(base_filter)
        if additional_filter is not None:
            conds.append(additional_filter)
        stmt = select(func.count(PropertyDocument.id)).where(*conds)
        res = await db.execute(stmt)
        return res.scalar() or 0

    total = await get_count()
    floor_plans = await get_count(PropertyDocument.document_type.in_(["APPROVED_FLOOR_PLAN", "TOWER_LAYOUT", "FLOOR_LAYOUT"]))
    unit_plans = await get_count(PropertyDocument.document_type == "INDIVIDUAL_UNIT_PLAN")
    photographs = await get_count(PropertyDocument.document_type == "UNIT_PHOTOGRAPH")
    renders = await get_count(PropertyDocument.document_type == "SAMPLE_INTERIOR_IMAGE")
    specs = await get_count(PropertyDocument.document_type.in_(["ARCHITECTURAL_SPEC", "ENGINEERING_SPEC", "AREA_MEASUREMENT_SHEET", "FINISHING_FIXTURE_SCHEDULE"]))
    public_portal = await get_count(PropertyDocument.visibility == "PUBLIC_SALES_PORTAL")
    confidential = await get_count(PropertyDocument.visibility == "RESTRICTED_CONFIDENTIAL")
    superseded = await get_count(PropertyDocument.is_superseded == True)

    return PropertyDocumentSummaryResponse(
        total_documents=total,
        approved_floor_plans=floor_plans,
        unit_plans=unit_plans,
        unit_photographs=photographs,
        interior_renders=renders,
        technical_specs=specs,
        public_sales_portal_count=public_portal,
        restricted_confidential_count=confidential,
        superseded_archive_count=superseded
    )


# =========================================================================
# 2. Paged Directory with Advanced Filtering
# =========================================================================
@router.get("", response_model=PropertyDocumentPagedResponse)
async def list_documents(
    project_id: Optional[int] = Query(None),
    tower_id: Optional[int] = Query(None),
    floor_number: Optional[int] = Query(None),
    unit_id: Optional[int] = Query(None),
    document_type: Optional[str] = Query(None),
    visibility: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    is_superseded: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PropertyDocument)
    count_stmt = select(func.count(PropertyDocument.id))

    filters = []
    if project_id:
        filters.append(PropertyDocument.project_id == project_id)
    if tower_id:
        filters.append(PropertyDocument.tower_id == tower_id)
    if floor_number is not None:
        filters.append(PropertyDocument.floor_number == floor_number)
    if unit_id:
        filters.append(PropertyDocument.unit_id == unit_id)
    if document_type and document_type != "ALL":
        filters.append(PropertyDocument.document_type == document_type)
    if visibility and visibility != "ALL":
        filters.append(PropertyDocument.visibility == visibility)
    if approval_status and approval_status != "ALL":
        filters.append(PropertyDocument.approval_status == approval_status)
    if is_superseded is not None:
        filters.append(PropertyDocument.is_superseded == is_superseded)
    if search:
        s = f"%{search}%"
        filters.append(or_(
            PropertyDocument.title.ilike(s),
            PropertyDocument.version_tag.ilike(s),
            PropertyDocument.tags.ilike(s),
            PropertyDocument.uploader_name.ilike(s)
        ))

    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    stmt = stmt.order_by(desc(PropertyDocument.id)).limit(limit).offset(offset)
    result = await db.execute(stmt)
    items = result.scalars().all()

    return PropertyDocumentPagedResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset
    )


# =========================================================================
# 3. Create Document Record (Direct JSON)
# =========================================================================
@router.post("", response_model=PropertyDocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: PropertyDocumentCreate,
    db: AsyncSession = Depends(get_db)
):
    doc = PropertyDocument(
        project_id=payload.project_id,
        tower_id=payload.tower_id,
        floor_number=payload.floor_number,
        unit_id=payload.unit_id,
        document_type=payload.document_type,
        title=payload.title,
        file_url=payload.file_url,
        thumbnail_url=payload.thumbnail_url or payload.file_url,
        file_size_kb=payload.file_size_kb,
        file_extension=payload.file_extension,
        mime_type=payload.mime_type,
        version_tag=payload.version_tag,
        is_superseded=False,
        visibility=payload.visibility,
        approval_status="PENDING",
        uploader_name=payload.uploader_name,
        tags=payload.tags,
        notes=payload.notes
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


# =========================================================================
# 4. Multipart File Upload & Storage Management
# =========================================================================
@router.post("/upload", response_model=PropertyDocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_file(
    file: UploadFile = File(...),
    project_id: int = Form(...),
    tower_id: Optional[int] = Form(None),
    floor_number: Optional[int] = Form(None),
    unit_id: Optional[int] = Form(None),
    document_type: str = Form(...),
    title: str = Form(...),
    version_tag: str = Form("v1.0"),
    visibility: str = Form("RESTRICTED_CONFIDENTIAL"),
    uploader_name: str = Form("System User"),
    tags: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    # Validate extension
    filename = file.filename or "uploaded_file.pdf"
    ext = os.path.splitext(filename)[1].lower()
    allowed_exts = [".pdf", ".dwg", ".dxf", ".jpg", ".jpeg", ".png", ".webp", ".zip"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(allowed_exts)}"
        )

    # Save to controlled uploads directory
    unique_filename = f"{uuid.uuid4().hex[:12]}_{filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    size_kb = max(1, os.path.getsize(file_path) // 1024)
    file_url = f"/uploads/property_documents/{unique_filename}"
    is_image = ext in [".jpg", ".jpeg", ".png", ".webp"]
    thumbnail_url = file_url if is_image else "/assets/icons/pdf-icon.svg"

    doc = PropertyDocument(
        project_id=project_id,
        tower_id=tower_id,
        floor_number=floor_number,
        unit_id=unit_id,
        document_type=document_type,
        title=title,
        file_url=file_url,
        thumbnail_url=thumbnail_url,
        file_size_kb=size_kb,
        file_extension=ext,
        mime_type=file.content_type or "application/octet-stream",
        version_tag=version_tag,
        is_superseded=False,
        visibility=visibility,
        approval_status="PENDING",
        uploader_name=uploader_name,
        tags=tags,
        notes=notes
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


# =========================================================================
# 5. Metadata Update
# =========================================================================
@router.put("/{id}", response_model=PropertyDocumentResponse)
async def update_document_metadata(
    id: int,
    payload: PropertyDocumentUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PropertyDocument).where(PropertyDocument.id == id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if payload.title is not None:
        doc.title = payload.title
    if payload.document_type is not None:
        doc.document_type = payload.document_type
    if payload.tower_id is not None:
        doc.tower_id = payload.tower_id
    if payload.floor_number is not None:
        doc.floor_number = payload.floor_number
    if payload.unit_id is not None:
        doc.unit_id = payload.unit_id
    if payload.visibility is not None:
        doc.visibility = payload.visibility
    if payload.tags is not None:
        doc.tags = payload.tags
    if payload.notes is not None:
        doc.notes = payload.notes

    await db.commit()
    await db.refresh(doc)
    return doc


# =========================================================================
# 6. Approval Workflow (Sales Portal Visibility Control)
# =========================================================================
@router.post("/{id}/approve", response_model=PropertyDocumentResponse)
async def approve_document(
    id: int,
    payload: PropertyDocumentApprove,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PropertyDocument).where(PropertyDocument.id == id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.approval_status = payload.approval_status
    doc.approved_by = payload.approved_by
    doc.approved_at = datetime.now(timezone.utc)
    if payload.visibility:
        doc.visibility = payload.visibility
    if payload.notes:
        doc.notes = f"{doc.notes or ''}\n[Approval Note]: {payload.notes}".strip()

    await db.commit()
    await db.refresh(doc)
    return doc


# =========================================================================
# 7. Supersede Version (Preserves Historical Floor Plans / Revisions)
# =========================================================================
@router.post("/{id}/supersede", response_model=PropertyDocumentResponse)
async def supersede_document_version(
    id: int,
    payload: PropertyDocumentSupersede,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PropertyDocument).where(PropertyDocument.id == id)
    res = await db.execute(stmt)
    old_doc = res.scalar_one_or_none()
    if not old_doc:
        raise HTTPException(status_code=404, detail="Target document to supersede not found")

    # 1. Create the new superseding document
    new_doc = PropertyDocument(
        project_id=old_doc.project_id,
        tower_id=old_doc.tower_id,
        floor_number=old_doc.floor_number,
        unit_id=old_doc.unit_id,
        document_type=old_doc.document_type,
        title=f"{old_doc.title} ({payload.new_version_tag})",
        file_url=payload.new_file_url,
        thumbnail_url=payload.new_thumbnail_url or payload.new_file_url,
        file_size_kb=payload.new_file_size_kb,
        file_extension=payload.new_file_extension,
        mime_type=payload.new_mime_type,
        version_tag=payload.new_version_tag,
        is_superseded=False,
        visibility=old_doc.visibility,
        approval_status="APPROVED",
        approved_by="System Versioning Engine",
        approved_at=datetime.now(timezone.utc),
        uploader_name="Version Control",
        tags=old_doc.tags,
        notes=f"Supersedes historical document #{old_doc.id} ({old_doc.version_tag}). Reason: {payload.reason or 'Updated revision'}"
    )
    db.add(new_doc)
    await db.flush()

    # 2. Mark the old document as superseded
    old_doc.is_superseded = True
    old_doc.superseded_by_id = new_doc.id
    old_doc.superseded_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(new_doc)
    return new_doc


# =========================================================================
# 8. Delete Document
# =========================================================================
@router.delete("/{id}")
async def delete_document(
    id: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PropertyDocument).where(PropertyDocument.id == id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.delete(doc)
    await db.commit()
    return {"success": True, "message": f"Document #{id} deleted successfully."}
