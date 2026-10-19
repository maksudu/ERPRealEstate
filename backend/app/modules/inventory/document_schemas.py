from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class PropertyDocumentCreate(BaseModel):
    project_id: int
    tower_id: Optional[int] = None
    floor_number: Optional[int] = None
    unit_id: Optional[int] = None
    document_type: str = Field(..., description="PROJECT_BROCHURE, APPROVED_FLOOR_PLAN, TOWER_LAYOUT, FLOOR_LAYOUT, INDIVIDUAL_UNIT_PLAN, UNIT_PHOTOGRAPH, SAMPLE_INTERIOR_IMAGE, ARCHITECTURAL_SPEC, ENGINEERING_SPEC, AREA_MEASUREMENT_SHEET, FINISHING_FIXTURE_SCHEDULE, PARKING_LAYOUT, APPROVAL_CERTIFICATE")
    title: str
    file_url: str
    thumbnail_url: Optional[str] = None
    file_size_kb: int = 0
    file_extension: str = ".pdf"
    mime_type: str = "application/pdf"
    version_tag: str = "v1.0"
    visibility: str = "RESTRICTED_CONFIDENTIAL" # PUBLIC_SALES_PORTAL, INTERNAL_SALES_AGENT, RESTRICTED_CONFIDENTIAL
    uploader_name: str = "System User"
    tags: Optional[str] = None
    notes: Optional[str] = None

class PropertyDocumentUpdate(BaseModel):
    title: Optional[str] = None
    document_type: Optional[str] = None
    tower_id: Optional[int] = None
    floor_number: Optional[int] = None
    unit_id: Optional[int] = None
    visibility: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None

class PropertyDocumentSupersede(BaseModel):
    new_version_tag: str = "v2.0"
    new_file_url: str
    new_thumbnail_url: Optional[str] = None
    new_file_size_kb: int = 0
    new_file_extension: str = ".pdf"
    new_mime_type: str = "application/pdf"
    reason: Optional[str] = "Superseded with updated regulatory or architectural revision"

class PropertyDocumentApprove(BaseModel):
    approval_status: str = "APPROVED" # APPROVED or REJECTED
    approved_by: str = "Chief Architect / Sales Director"
    visibility: Optional[str] = None # Optionally promote to PUBLIC_SALES_PORTAL
    notes: Optional[str] = None

class PropertyDocumentResponse(BaseModel):
    id: int
    project_id: int
    tower_id: Optional[int] = None
    floor_number: Optional[int] = None
    unit_id: Optional[int] = None
    document_type: str
    title: str
    file_url: str
    thumbnail_url: Optional[str] = None
    file_size_kb: int
    file_extension: str
    mime_type: str
    version_tag: str
    is_superseded: bool
    superseded_by_id: Optional[int] = None
    superseded_at: Optional[datetime] = None
    visibility: str
    approval_status: str
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    uploader_id: Optional[int] = None
    uploader_name: str
    tags: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PropertyDocumentPagedResponse(BaseModel):
    items: List[PropertyDocumentResponse]
    total: int
    limit: int
    offset: int

class PropertyDocumentSummaryResponse(BaseModel):
    total_documents: int
    approved_floor_plans: int
    unit_plans: int
    unit_photographs: int
    interior_renders: int
    technical_specs: int
    public_sales_portal_count: int
    restricted_confidential_count: int
    superseded_archive_count: int
