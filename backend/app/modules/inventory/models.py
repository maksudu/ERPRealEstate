from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, ForeignKey, TIMESTAMP, func
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
    
    # Area Measurements
    net_carpet_area_sqft = Column(Numeric(10, 2), nullable=False, default=0.00)
    gross_saleable_area_sqft = Column(Numeric(10, 2), nullable=False, default=0.00)
    
    # Dynamic Rate Card Pricing Components:
    # Total Price = Gross Sqft * (Base Rate + Floor Escalation + Facing Premium)
    base_rate_per_sqft = Column(Numeric(12, 2), nullable=False, default=12500.00)
    floor_escalation_rate = Column(Numeric(10, 2), nullable=False, default=0.00) # e.g. 100 Tk per floor
    facing_premium_rate = Column(Numeric(10, 2), nullable=False, default=0.00) # e.g. 500 Tk for Lake View / South
    effective_rate_per_sqft = Column(Numeric(12, 2), nullable=False, default=12500.00)
    total_unit_price = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Unit Status: AVAILABLE, ON_HOLD, BOOKED, SOLD, LANDOWNER_SHARE
    status_id = Column(String(32), nullable=False, default="AVAILABLE", index=True)
    is_landowner_share = Column(Boolean, nullable=False, default=False, index=True)
    
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
