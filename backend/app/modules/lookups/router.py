from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import re

from app.core.database import get_db
from app.modules.lookups.models import LookupCategory, LookupItem
from app.modules.lookups.schemas import (
    LookupCategoryResponse,
    LookupCategoryCreate,
    LookupItemResponse,
    LookupItemCreate,
    LookupQuickCreate
)

router = APIRouter(prefix="/lookups", tags=["Dynamic Lookups & Dropdowns"])

@router.get("/categories", response_model=List[LookupCategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """Lists all dynamic dropdown categories available in the ERP"""
    stmt = select(LookupCategory).where(LookupCategory.is_active == True)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{category_code}", response_model=List[LookupItemResponse])
async def get_lookup_items_by_category(category_code: str, db: AsyncSession = Depends(get_db)):
    """
    Fetched by the frontend <app-searchable-select> component to populate options dynamically.
    No hardcoded dropdown values!
    """
    cat_stmt = select(LookupCategory).where(LookupCategory.category_code == category_code)
    cat_result = await db.execute(cat_stmt)
    category = cat_result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lookup category '{category_code}' does not exist."
        )

    items_stmt = (
        select(LookupItem)
        .where(LookupItem.category_id == category.id, LookupItem.is_active == True)
        .order_by(LookupItem.sort_order.asc(), LookupItem.item_name_en.asc())
    )
    items_result = await db.execute(items_stmt)
    return items_result.scalars().all()


@router.post("/{category_code}/quick-create", response_model=LookupItemResponse, status_code=status.HTTP_201_CREATED)
async def quick_create_lookup_item(
    category_code: str,
    payload: LookupQuickCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    CRITICAL REQUIREMENT: Triggered directly by the inline '+ Add New' button inside any 
    searchable dropdown component across any page in the ERP.
    Creates the item and immediately returns it so the frontend can auto-select it.
    """
    cat_stmt = select(LookupCategory).where(LookupCategory.category_code == category_code)
    cat_result = await db.execute(cat_stmt)
    category = cat_result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lookup category '{category_code}' does not exist."
        )

    # Auto-generate a clean item_code if not supplied
    if not payload.item_code:
        generated_code = re.sub(r'[^A-Z0-9_]', '', payload.item_name_en.upper().replace(' ', '_'))
        item_code = generated_code or f"ITEM_{category.id}_{payload.item_name_en[:6].upper()}"
    else:
        item_code = payload.item_code.upper()

    # Fallback for Bangla if not provided in quick create modal
    item_name_bn = payload.item_name_bn if payload.item_name_bn else payload.item_name_en

    # Check for duplicate item_code within category
    dup_stmt = select(LookupItem).where(
        LookupItem.category_id == category.id,
        LookupItem.item_code == item_code
    )
    dup_result = await db.execute(dup_stmt)
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item with code '{item_code}' already exists in category '{category_code}'."
        )

    new_item = LookupItem(
        category_id=category.id,
        item_code=item_code,
        item_name_en=payload.item_name_en,
        item_name_bn=item_name_bn,
        color_badge=payload.color_badge,
        is_active=True,
        sort_order=99
    )

    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)

    return new_item
