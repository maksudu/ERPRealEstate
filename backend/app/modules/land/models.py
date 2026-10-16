from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, JSON, ForeignKey, TIMESTAMP, Text, func
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class LandBank(Base):
    """
    Core land acquisition master table representing raw land parcels under proposal, vetting, or acquisition.
    """
    __tablename__ = "lnd_land_banks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_code = Column(String(64), unique=True, nullable=False, index=True)
    proposal_title = Column(String(255), nullable=False)
    mouza_name = Column(String(128), nullable=False, index=True)
    jl_number = Column(String(64), nullable=False)
    
    # Mathematical Land Areas (stored in canonical Katha, Decimal, and SqFt)
    total_area_katha = Column(Numeric(14, 4), nullable=False, default=0)
    total_area_decimal = Column(Numeric(14, 4), nullable=False, default=0)
    total_area_sqft = Column(Numeric(16, 2), nullable=False, default=0)
    
    # Deal Type: JOINT_VENTURE, OUTRIGHT_PURCHASE, REVENUE_SHARE
    deal_type = Column(String(64), nullable=False, default="JOINT_VENTURE", index=True)
    
    # Status: DRAFT_PROPOSAL, LEGAL_VETTING, SURVEY_IN_PROGRESS, JV_SIGNED, ACQUIRED, REJECTED
    status = Column(String(64), nullable=False, default="DRAFT_PROPOSAL", index=True)
    
    location_description = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    landowners = relationship("Landowner", back_populates="land_bank", cascade="all, delete-orphan")
    survey_records = relationship("SurveyRecord", back_populates="land_bank", cascade="all, delete-orphan")
    jv_agreements = relationship("JVAgreement", back_populates="land_bank", cascade="all, delete-orphan")


class Landowner(Base):
    """
    Individual or institutional title holders with fractional or full ownership ratios.
    """
    __tablename__ = "lnd_landowners"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="CASCADE"), nullable=False, index=True)
    owner_type = Column(String(32), nullable=False, default="INDIVIDUAL") # INDIVIDUAL, COMPANY, HEIR_INHERITANCE
    full_name_en = Column(String(191), nullable=False)
    full_name_bn = Column(String(191), nullable=True)
    nid_number = Column(String(64), nullable=True, index=True)
    tin_number = Column(String(64), nullable=True)
    phone_number = Column(String(32), nullable=True)
    ownership_share_ratio = Column(Numeric(6, 4), nullable=False, default=1.0000) # e.g. 0.5000 = 50%
    bank_details = Column(JSON, nullable=True) # bank_name, branch, routing_number, account_no
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    land_bank = relationship("LandBank", back_populates="landowners")


class SurveyRecord(Base):
    """
    Historic and field surveys (CS, SA, RS, BS/City Survey, Mutation/Namjari) tying khatian and dag numbers.
    """
    __tablename__ = "lnd_survey_records"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="CASCADE"), nullable=False, index=True)
    survey_type_id = Column(String(64), nullable=False, index=True) # CS, SA, RS, BS, MUTATION
    khatian_number = Column(String(64), nullable=False, index=True)
    recorded_tenant_name = Column(String(191), nullable=False)
    dag_number = Column(String(64), nullable=False, index=True)
    recorded_area_decimal = Column(Numeric(14, 4), nullable=False, default=0)
    recorded_area_katha = Column(Numeric(14, 4), nullable=False, default=0)
    remarks = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    land_bank = relationship("LandBank", back_populates="survey_records")


class JVAgreement(Base):
    """
    Joint Venture (JV) contractual agreement between developer and landowners.
    """
    __tablename__ = "lnd_jv_agreements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="CASCADE"), nullable=False, index=True)
    agreement_deed_no = Column(String(128), unique=True, nullable=False, index=True)
    landowner_share_percent = Column(Numeric(6, 2), nullable=False) # e.g. 50.00%
    developer_share_percent = Column(Numeric(6, 2), nullable=False) # e.g. 50.00%
    signing_money_total = Column(Numeric(16, 2), nullable=False, default=0.00)
    tenure_months = Column(Integer, nullable=False, default=36)
    signing_date = Column(TIMESTAMP, nullable=True)
    handover_commitment_date = Column(TIMESTAMP, nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE") # DRAFT, ACTIVE, COMPLETED, TERMINATED

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    land_bank = relationship("LandBank", back_populates="jv_agreements")
    unit_allocations = relationship("JVUnitAllocation", back_populates="jv_agreement", cascade="all, delete-orphan")


class JVUnitAllocation(Base):
    """
    Unit allocation ledger under JV Agreement.
    CRITICAL RULE:
    Units allocated as 'LANDOWNER_UNIT' are permanently locked (is_locked_for_sales = true)
    and strictly barred from the Sales & Allotment engine.
    """
    __tablename__ = "lnd_jv_unit_allocations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    jv_agreement_id = Column(BigInteger, ForeignKey("lnd_jv_agreements.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_identifier = Column(String(64), nullable=False) # e.g. 'Tower A - Unit 4A', 'Apt # 6B'
    allocation_type = Column(String(32), nullable=False, index=True) # LANDOWNER_UNIT, DEVELOPER_UNIT
    is_locked_for_sales = Column(Boolean, nullable=False, default=False, index=True)
    allocation_notes = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    jv_agreement = relationship("JVAgreement", back_populates="unit_allocations")
