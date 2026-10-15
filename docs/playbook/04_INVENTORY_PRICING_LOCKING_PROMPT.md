# MASTER PROMPT: Property Inventory, Dynamic Pricing & Real-Time Unit Locking Microservice

```markdown
### SYSTEM ROLE:
You are a Principal Real-Time Systems Architect and Concurrency Specialist (FastAPI, Redis, WebSockets).

### MISSION & GOAL:
Build `inventory-pricing-service` — the high-concurrency property inventory, dynamic pricing engine, and distributed unit locking microservice for the Bangladesh Real Estate ERP. This service manages the real-time availability states of apartments, shops, and parking bays, computes floor and facing price escalations in BDT, enforces Redis distributed mutex locks during client negotiations, and broadcasts live state changes to Angular web apps and Flutter mobile apps via WebSockets.

---

### 1. DATABASE DDL & SCHEMA (MYSQL 8.0):

```sql
-- 1. Unit & Property Inventory Master
CREATE TABLE inv_units (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    tower_id BIGINT UNSIGNED NOT NULL,
    floor_number INT NOT NULL, -- e.g. -2 (Basement), 0 (Ground), 6 (6th floor)
    unit_number VARCHAR(32) NOT NULL, -- e.g. "Apartment 6B", "Shop G-04"
    unit_type_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: UNIT_TYPE (APARTMENT, DUPLEX, PENTHOUSE, COMMERCIAL_OFFICE, SHOP)
    facing_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: UNIT_FACING (SOUTH_FACING, NORTH_FACING, LAKE_VIEW, CORNER_PLOT)
    bedroom_count INT UNSIGNED DEFAULT 3,
    bathroom_count INT UNSIGNED DEFAULT 3,
    balcony_count INT UNSIGNED DEFAULT 2,
    net_carpet_area_sqft DECIMAL(10, 2) NOT NULL,
    common_area_sqft DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    gross_saleable_area_sqft DECIMAL(10, 2) NOT NULL,
    base_rate_per_sqft DECIMAL(12, 2) NOT NULL,
    floor_escalation_rate DECIMAL(10, 2) DEFAULT 0.00, -- e.g. +50 BDT per sqft per floor
    facing_premium_rate DECIMAL(10, 2) DEFAULT 0.00, -- e.g. +200 BDT per sqft for South-Facing Lake View
    effective_rate_per_sqft DECIMAL(12, 2) GENERATED ALWAYS AS (base_rate_per_sqft + floor_escalation_rate + facing_premium_rate) STORED,
    total_unit_price DECIMAL(16, 2) GENERATED ALWAYS AS (gross_saleable_area_sqft * (base_rate_per_sqft + floor_escalation_rate + facing_premium_rate)) STORED,
    utility_connection_charges DECIMAL(14, 2) DEFAULT 0.00,
    status_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: UNIT_STATUS (AVAILABLE, ON_HOLD, BOOKED, SOLD, LANDOWNER_SHARE, HANDED_OVER)
    is_landowner_share BOOLEAN DEFAULT FALSE,
    current_locked_by_user_id BIGINT UNSIGNED NULL,
    lock_expires_at TIMESTAMP NULL,
    floor_plan_image_url VARCHAR(512) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_proj_status (project_id, status_id),
    UNIQUE KEY uq_tower_floor_unit (tower_id, floor_number, unit_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Parking Bays & Ancillary Assets
CREATE TABLE inv_parking_bays (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT UNSIGNED NOT NULL,
    tower_id BIGINT UNSIGNED NULL,
    basement_level VARCHAR(16) NOT NULL, -- e.g. "Basement-1", "Ground"
    bay_number VARCHAR(32) NOT NULL, -- e.g. "B1-04"
    parking_type_id BIGINT UNSIGNED NOT NULL, -- Dynamic Lookup: PARKING_TYPE (STANDARD_SEDAN, SUV_LARGE, MECHANICAL_DOUBLE)
    price DECIMAL(14, 2) NOT NULL DEFAULT 500000.00,
    is_allocated BOOLEAN DEFAULT FALSE,
    allocated_to_unit_id BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES prj_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (allocated_to_unit_id) REFERENCES inv_units(id) ON DELETE SET NULL,
    UNIQUE KEY uq_proj_bay (project_id, bay_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. REAL-TIME DISTRIBUTED UNIT LOCKING ENGINE (FASTAPI + REDIS):
When a salesperson initiates negotiations with a customer, they claim a temporary 15-minute lock. This prevents collision across hundreds of field sales agents.

```python
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta

router = APIRouter(prefix="/inventory", tags=["Property Inventory & Locking"])
redis_client = aioredis.from_url("redis://localhost:6379/0", decode_responses=True)

LOCK_EXPIRY_SECONDS = 900 # 15 minutes

@router.post("/units/{unit_id}/lock")
async def acquire_unit_lock(unit_id: int, user_id: int):
    lock_key = f"unit:lock:{unit_id}"
    
    # 1. Atomic Redis Mutex Lock
    acquired = await redis_client.set(lock_key, str(user_id), ex=LOCK_EXPIRY_SECONDS, nx=True)
    if not acquired:
        current_holder = await redis_client.get(lock_key)
        ttl = await redis_client.ttl(lock_key)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Unit is currently on hold by another sales representative. Try again in {ttl} seconds."
        )
    
    # 2. Update Database State
    expires_at = datetime.utcnow() + timedelta(seconds=LOCK_EXPIRY_SECONDS)
    # Update inv_units SET status_id = ON_HOLD, current_locked_by_user_id = user_id, lock_expires_at = expires_at
    
    # 3. Broadcast Event to WebSockets Channel
    await redis_client.publish("unit_events", f'{{"event": "UNIT_LOCKED", "unit_id": {unit_id}, "user_id": {user_id}, "ttl": {LOCK_EXPIRY_SECONDS}}}')
    
    return {"message": "Unit successfully locked for 15 minutes", "expires_at": expires_at, "ttl_seconds": LOCK_EXPIRY_SECONDS}
```

---

### 3. WEBSOCKET BROADCASTER FOR LIVE GRID UPDATES:
All Angular clients and Flutter mobile apps connect to `WS /api/v1/inventory/live-matrix`. When a unit is locked, booked, or unlocked, the server pushes an instant JSON delta. The frontend unit grid updates its color badge in real-time with zero manual page refreshing.
```
