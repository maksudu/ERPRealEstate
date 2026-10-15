from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime

class LookupItemBase(BaseModel):
    item_code: str = Field(..., max_length=64)
    item_name_en: str = Field(..., max_length=191)
    item_name_bn: str = Field(..., max_length=191)
    parent_id: Optional[int] = None
    color_badge: Optional[str] = None
    sort_order: int = 0
    metadata: Optional[Dict[str, Any]] = None
    is_default: bool = False
    is_active: bool = True

class LookupItemCreate(LookupItemBase):
    pass

class LookupQuickCreate(BaseModel):
    """Used by the frontend '+ Add New' button inside any searchable dropdown"""
    item_name_en: str = Field(..., min_length=1, max_length=191)
    item_name_bn: Optional[str] = None
    item_code: Optional[str] = None
    color_badge: Optional[str] = None

class LookupItemResponse(LookupItemBase):
    id: int
    category_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LookupCategoryBase(BaseModel):
    category_code: str = Field(..., max_length=64)
    category_name: str = Field(..., max_length=128)
    description: Optional[str] = None
    is_hierarchical: bool = False

class LookupCategoryCreate(LookupCategoryBase):
    pass

class LookupCategoryResponse(LookupCategoryBase):
    id: int
    is_system_locked: bool
    is_active: bool
    items: List[LookupItemResponse] = []

    class Config:
        from_attributes = True
