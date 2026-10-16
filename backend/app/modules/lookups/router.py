import json
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import get_redis_client
from app.modules.lookups.models import LookupCategory, LookupItem
from app.modules.lookups.schemas import (
    LookupCategoryResponse,
    LookupCategoryCreate,
    LookupCategoryUpdate,
    LookupItemResponse,
    LookupItemCreate,
    LookupItemUpdate,
    LookupQuickCreate
)

router = APIRouter(prefix="/lookups", tags=["Dynamic Lookups & Dropdowns"])

def _cache_key(category_code: str) -> str:
    return f"lookup:{category_code.strip().upper()}"

async def _invalidate_lookup_cache(category_code: str):
    """Purges the cached lookups for a given category code from Redis"""
    try:
        redis_client = get_redis_client()
        await redis_client.delete(_cache_key(category_code))
    except Exception as e:
        # Cache purge failures should not abort transactional flow
        pass


@router.get("/categories", response_model=List[LookupCategoryResponse])
async def list_categories(
    include_inactive: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Lists all dynamic dropdown categories available in the ERP system.
    Used by the System Settings -> Dropdowns & Dynamic Fields configuration module.
    """
    from sqlalchemy.orm import selectinload
    stmt = select(LookupCategory).options(selectinload(LookupCategory.items))
    if not include_inactive:
        stmt = stmt.where(LookupCategory.is_active == True)
    stmt = stmt.order_by(LookupCategory.category_name.asc())
    
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/categories", response_model=LookupCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: LookupCategoryCreate,
    db: AsyncSession = Depends(get_db)
):
    """Creates a new dynamic lookup category from the Settings UI"""
    code = payload.category_code.strip().upper()
    
    # Check if category already exists
    existing = await db.execute(select(LookupCategory).where(LookupCategory.category_code == code))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lookup category code '{code}' already exists."
        )

    category = LookupCategory(
        category_code=code,
        category_name=payload.category_name.strip(),
        description=payload.description,
        is_hierarchical=payload.is_hierarchical,
        is_system_locked=False,
        is_active=True
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    category.items = []
    return category


@router.get("/{category_code}", response_model=List[LookupItemResponse])
async def get_lookup_items_by_category(
    category_code: str, 
    db: AsyncSession = Depends(get_db)
):
    """
    Core lookup retrieval endpoint for the frontend <app-searchable-select> component.
    Results are cached in Redis with a 24-hour TTL (86400s) for ultra-low latency & high scale.
    """
    cat_code = category_code.strip().upper()
    cache_key = _cache_key(cat_code)

    # 1. Attempt Redis Cache Lookup
    try:
        redis_client = get_redis_client()
        cached = await redis_client.get(cache_key)
        if cached:
            items_dict = json.loads(cached)
            return [LookupItemResponse.model_validate(item) for item in items_dict]
    except Exception:
        # Fallback to MySQL if Redis encounters any transient error
        pass

    # 2. Query MySQL
    cat_stmt = select(LookupCategory).where(LookupCategory.category_code == cat_code)
    cat_result = await db.execute(cat_stmt)
    category = cat_result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lookup category '{cat_code}' does not exist."
        )

    items_stmt = (
        select(LookupItem)
        .where(LookupItem.category_id == category.id, LookupItem.is_active == True)
        .order_by(LookupItem.sort_order.asc(), LookupItem.item_name_en.asc())
    )
    items_result = await db.execute(items_stmt)
    items = items_result.scalars().all()

    # 3. Store in Redis Cache (24-hour TTL)
    try:
        serialized_items = [
            LookupItemResponse.model_validate(item).model_dump(by_alias=True, mode="json") 
            for item in items
        ]
        redis_client = get_redis_client()
        await redis_client.set(cache_key, json.dumps(serialized_items), ex=settings.LOOKUP_CACHE_TTL)
    except Exception:
        pass

    return items


@router.post("/{category_code}/quick-create", response_model=LookupItemResponse, status_code=status.HTTP_201_CREATED)
async def quick_create_lookup_item(
    category_code: str,
    payload: LookupQuickCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    CRITICAL REQUIREMENT: Triggered directly by the inline '+ Add New [Label]' button 
    inside <app-searchable-select> across any page in the ERP.
    Creates the item, flushes Redis cache, and immediately returns the item for auto-selection.
    """
    cat_code = category_code.strip().upper()
    cat_stmt = select(LookupCategory).where(LookupCategory.category_code == cat_code)
    cat_result = await db.execute(cat_stmt)
    category = cat_result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lookup category '{cat_code}' does not exist."
        )

    # Auto-generate a clean item_code if not supplied
    if not payload.item_code:
        generated_code = re.sub(r'[^A-Z0-9_]', '', payload.item_name_en.upper().replace(' ', '_'))
        item_code = generated_code or f"ITEM_{category.id}_{payload.item_name_en[:6].upper()}"
    else:
        item_code = payload.item_code.strip().upper()

    # Fallback for Bangla if not provided in quick create modal
    item_name_bn = payload.item_name_bn.strip() if payload.item_name_bn else payload.item_name_en.strip()

    # Check for duplicate item_code within category
    dup_stmt = select(LookupItem).where(
        LookupItem.category_id == category.id,
        LookupItem.item_code == item_code
    )
    dup_result = await db.execute(dup_stmt)
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item with code '{item_code}' already exists in category '{cat_code}'."
        )

    new_item = LookupItem(
        category_id=category.id,
        item_code=item_code,
        item_name_en=payload.item_name_en.strip(),
        item_name_bn=item_name_bn,
        color_badge=payload.color_badge,
        is_active=True,
        sort_order=99
    )

    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)

    # Invalidate Redis cache for this category so subsequent queries fetch fresh data
    await _invalidate_lookup_cache(cat_code)

    return new_item


@router.post("/{category_code}/items", response_model=LookupItemResponse, status_code=status.HTTP_201_CREATED)
async def create_full_lookup_item(
    category_code: str,
    payload: LookupItemCreate,
    db: AsyncSession = Depends(get_db)
):
    """Adds a full lookup item with sort_order, parent_id, metadata, and default status"""
    cat_code = category_code.strip().upper()
    cat_stmt = select(LookupCategory).where(LookupCategory.category_code == cat_code)
    cat_result = await db.execute(cat_stmt)
    category = cat_result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lookup category '{cat_code}' does not exist."
        )

    item_code = payload.item_code.strip().upper()
    dup_stmt = select(LookupItem).where(
        LookupItem.category_id == category.id,
        LookupItem.item_code == item_code
    )
    dup_result = await db.execute(dup_stmt)
    if dup_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item with code '{item_code}' already exists in category '{cat_code}'."
        )

    new_item = LookupItem(
        category_id=category.id,
        item_code=item_code,
        item_name_en=payload.item_name_en.strip(),
        item_name_bn=payload.item_name_bn.strip(),
        parent_id=payload.parent_id,
        color_badge=payload.color_badge,
        sort_order=payload.sort_order,
        metadata_json=payload.metadata_json,
        is_default=payload.is_default,
        is_active=payload.is_active
    )

    db.add(new_item)
    await db.commit()
    await db.refresh(new_item)

    await _invalidate_lookup_cache(cat_code)
    return new_item


@router.put("/items/{item_id}", response_model=LookupItemResponse)
async def update_lookup_item(
    item_id: int,
    payload: LookupItemUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Updates an existing lookup item and invalidates the Redis cache"""
    stmt = select(LookupItem).where(LookupItem.id == item_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lookup item with ID {item_id} not found."
        )

    # Retrieve category code for cache invalidation
    cat_res = await db.execute(select(LookupCategory).where(LookupCategory.id == item.category_id))
    category = cat_res.scalar_one()

    update_data = payload.model_dump(exclude_unset=True)
    if "metadata_json" in update_data:
        item.metadata_json = update_data["metadata_json"]
    for field, val in update_data.items():
        if field != "metadata_json":
            setattr(item, field, val)

    await db.commit()
    await db.refresh(item)

    await _invalidate_lookup_cache(category.category_code)
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_200_OK)
async def delete_or_deactivate_lookup_item(
    item_id: int,
    hard_delete: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Soft-deactivates (or hard deletes) a lookup item and clears Redis cache"""
    stmt = select(LookupItem).where(LookupItem.id == item_id)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lookup item with ID {item_id} not found."
        )

    cat_res = await db.execute(select(LookupCategory).where(LookupCategory.id == item.category_id))
    category = cat_res.scalar_one()

    if hard_delete:
        await db.delete(item)
    else:
        item.is_active = False

    await db.commit()
    await _invalidate_lookup_cache(category.category_code)

    return {"message": "Lookup item successfully updated.", "item_id": item_id, "is_active": item.is_active}
