from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class Unit(Base):
    """
    Real estate unit / flat inventory model with dynamic rate card, orientation premiums,
    and distributed booking lock state.
    """
    __tablename__ = "inv_units"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="CASCADE"), nullable=False, index=True)
    floor_number = Column(Integer, nullable=False, index=True) # e.g. 1, 2, 3...
    unit_number = Column(String(32), nullable=False, index=True) # e.g. '3A', '3B', '12C'
    
    # Types: TYPE_3BHK, TYPE_4BHK, PENTHOUSE, DUPLEX, STUDIO
    unit_type_id = Column(String(32), nullable=False, default="TYPE_3BHK", index=True)
    # Facing / Orientation: SOUTH_FACING, NORTH_FACING, LAKE_VIEW, CORNER_PLOT, ROAD_FACING
    facing_id = Column(String(32), nullable=False, default="SOUTH_FACING", index=True)
    
    # Architectural Specifications
    bed_count = Column(Integer, nullable=False, default=3)
    bath_count = Column(Integer, nullable=False, default=3)
    balcony_count = Column(Integer, nullable=False, default=2)
    floor_plan_image_url = Column(String(512), nullable=True)
    render_images_json = Column(Text, nullable=True) # JSON array of 3D interior render URLs

    # Area Measurements
    net_carpet_area_sqft = Column(Numeric(10, 2), nullable=False, default=0.00)
    gross_saleable_area_sqft = Column(Numeric(10, 2), nullable=False, default=0.00)
    
    # Dynamic Rate Card Pricing Components:
    base_rate_per_sqft = Column(Numeric(12, 2), nullable=False, default=12500.00)
    floor_escalation_rate = Column(Numeric(10, 2), nullable=False, default=0.00) # e.g. 100 Tk per floor
    facing_premium_rate = Column(Numeric(10, 2), nullable=False, default=0.00) # e.g. 500 Tk for Lake View / South
    effective_rate_per_sqft = Column(Numeric(12, 2), nullable=False, default=12500.00)
    total_unit_price = Column(Numeric(16, 2), nullable=False, default=0.00)

    # Additional Pricing Parameters
    utility_connection_fee = Column(Numeric(12, 2), nullable=False, default=250000.00)
    parking_charge = Column(Numeric(12, 2), nullable=False, default=0.00)
    max_discount_amount = Column(Numeric(12, 2), nullable=False, default=150000.00)
    
    # Unit Status: AVAILABLE, RESERVED, ON_HOLD, BOOKED, SOLD, LANDOWNER_SHARE, RETAINED, BLOCKED
    status_id = Column(String(32), nullable=False, default="AVAILABLE", index=True)
    is_landowner_share = Column(Boolean, nullable=False, default=False, index=True)

    # Unit Combination & Subdivision
    is_merged = Column(Boolean, nullable=False, default=False, index=True)
    merged_into_unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True)
    parent_unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True)
    combination_type = Column(String(32), nullable=True) # DUPLEX, COMBINED_APARTMENT, COMMERCIAL_SPLIT
    
    # Real-Time Distributed Locking Tracker (Syncs with 15-Minute Redis Mutex)
    current_locked_by_user_id = Column(BigInteger, nullable=True)
    current_locked_by_user_name = Column(String(128), nullable=True)
    lock_expires_at = Column(TIMESTAMP, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("Project")
    tower = relationship("Tower")
    parking_bays = relationship("ParkingBay", back_populates="allocated_unit")
    parking_slots = relationship("ParkingSlot", back_populates="assigned_unit")

    # Property Aliases for PROMPT 03 compatibility
    @property
    def gross_sft(self):
        return self.gross_saleable_area_sqft

    @property
    def net_carpet_sft(self):
        return self.net_carpet_area_sqft

    @property
    def unit_type(self):
        return self.unit_type_id

    @property
    def facing(self):
        return self.facing_id

    @property
    def base_price_per_sft(self):
        return self.base_rate_per_sqft

    @property
    def floor_rise_rate(self):
        return self.floor_escalation_rate

    @property
    def facing_premium(self):
        return self.facing_premium_rate

    @property
    def total_base_price(self):
        return self.total_unit_price

    @property
    def status(self):
        return self.status_id

    @property
    def locked_by_user_id(self):
        return self.current_locked_by_user_id

    @property
    def locked_until_timestamp(self):
        return self.lock_expires_at


class ParkingBay(Base):
    """
    Dedicated or standalone car parking bays in basement levels.
    """
    __tablename__ = "inv_parking_bays"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    basement_level = Column(String(16), nullable=False, default="B1") # B1, B2, GROUND
    bay_number = Column(String(32), nullable=False, index=True) # e.g. 'P-B1-01', 'P-B2-14'
    # Parking Types: SINGLE_CAR, TANDEM_DOUBLE, VIP_COVERED
    parking_type_id = Column(String(32), nullable=False, default="SINGLE_CAR")
    price = Column(Numeric(14, 2), nullable=False, default=500000.00) # e.g. 5 Lac BDT
    
    is_allocated = Column(Boolean, nullable=False, default=False, index=True)
    allocated_to_unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    allocated_unit = relationship("Unit", back_populates="parking_bays")


class ParkingSlot(Base):
    """
    Basement car parking inventory (BASEMENT_1, BASEMENT_2, OPEN, VIP_COVERED)
    """
    __tablename__ = "inv_parking_slots"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="CASCADE"), nullable=True, index=True)
    basement_level = Column(String(32), nullable=False, default="BASEMENT_1") # BASEMENT_1, BASEMENT_2, OPEN, PODIUM
    slot_number = Column(String(32), nullable=False, index=True) # e.g. 'P-B1-01', 'P-B2-14'
    slot_type = Column(String(32), nullable=False, default="BASEMENT_1") # BASEMENT_1, BASEMENT_2, OPEN, VIP_COVERED
    price = Column(Numeric(14, 2), nullable=False, default=500000.00)
    status = Column(String(32), nullable=False, default="AVAILABLE", index=True) # AVAILABLE, RESERVED, ALLOCATED, BLOCKED
    assigned_unit_id = Column(BigInteger, ForeignKey("inv_units.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project")
    tower = relationship("Tower")
    assigned_unit = relationship("Unit", back_populates="parking_slots")


class UnitCombinationLog(Base):
    """
    Audit log for unit subdivision & combination operations (e.g., 10A + 10B -> Duplex, or Floor Split)
    """
    __tablename__ = "inv_unit_combinations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("prj_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tower_id = Column(BigInteger, ForeignKey("prj_towers.id", ondelete="CASCADE"), nullable=False, index=True)
    operation_type = Column(String(32), nullable=False) # MERGE, SPLIT
    source_unit_ids = Column(String(255), nullable=False) # e.g. "12,13"
    source_unit_numbers = Column(String(255), nullable=False) # e.g. "10A, 10B"
    target_unit_ids = Column(String(255), nullable=False) # e.g. "45"
    target_unit_numbers = Column(String(255), nullable=False) # e.g. "DUPLEX-10AB"
    combined_gross_sft = Column(Numeric(10, 2), nullable=False, default=0.00)
    combined_price = Column(Numeric(16, 2), nullable=False, default=0.00)
    remarks = Column(Text, nullable=True)
    performed_by_id = Column(BigInteger, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
