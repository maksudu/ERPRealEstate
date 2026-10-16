from pydantic import BaseModel, Field, ConfigDict, AliasChoices
from typing import Optional, List, Any, Dict
from datetime import datetime

class LookupItemBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    item_code: str = Field(..., max_length=64)
    item_name_en: str = Field(..., max_length=191)
    item_name_bn: str = Field(..., max_length=191)
    parent_id: Optional[int] = None
    color_badge: Optional[str] = None
    sort_order: int = 0
    metadata_json: Optional[Dict[str, Any]] = Field(
        default=None, 
        alias="metadata", 
        serialization_alias="metadata",
        validation_alias=AliasChoices("metadata_json", "metadata")
    )
    is_default: bool = False
    is_active: bool = True

class LookupItemCreate(LookupItemBase):
    pass

class LookupQuickCreate(BaseModel):
    """Used by the frontend '+ Add New' button inside any searchable dropdown"""
    item_name_en: str = Field(..., min_length=1, max_length=191, validation_alias=AliasChoices("item_name_en", "item_name"))
    item_name_bn: Optional[str] = None
    item_code: Optional[str] = None
    color_badge: Optional[str] = None

class LookupItemResponse(LookupItemBase):
    id: int
    category_id: int
    created_at: Optional[datetime] = None


class LookupCategoryBase(BaseModel):
    category_code: str = Field(..., max_length=64)
    category_name: str = Field(..., max_length=128)
    description: Optional[str] = None
    is_hierarchical: bool = False

class LookupCategoryCreate(LookupCategoryBase):
    pass

class LookupCategoryUpdate(BaseModel):
    category_name: Optional[str] = Field(None, max_length=128)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class LookupItemUpdate(BaseModel):
    item_name_en: Optional[str] = Field(None, max_length=191)
    item_name_bn: Optional[str] = Field(None, max_length=191)
    color_badge: Optional[str] = None
    sort_order: Optional[int] = None
    metadata_json: Optional[Dict[str, Any]] = Field(default=None, alias="metadata")
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

class LookupCategoryResponse(LookupCategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_system_locked: bool
    is_active: bool
    items: List[LookupItemResponse] = []

