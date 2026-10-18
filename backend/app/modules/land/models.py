from sqlalchemy import (
    Column, BigInteger, String, Numeric, Boolean, Integer, JSON, ForeignKey, TIMESTAMP, Date, Text, func
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
    upazila_thana = Column(String(128), nullable=False, default="Gulshan")
    district = Column(String(64), nullable=False, default="Dhaka")
    sub_registry_office = Column(String(128), nullable=False, default="Gulshan Sub-Registry Office")
    
    # Mathematical Land Areas (stored in canonical Katha, Decimal, Bigha, and SqFt)
    total_area_katha = Column(Numeric(14, 4), nullable=False, default=0)
    total_area_decimal = Column(Numeric(14, 4), nullable=False, default=0)
    total_area_bigha = Column(Numeric(14, 4), nullable=False, default=0)
    total_area_sqft = Column(Numeric(16, 2), nullable=False, default=0)
    
    # Deal Type: JOINT_VENTURE, OUTRIGHT_PURCHASE, REVENUE_SHARE
    deal_type = Column(String(64), nullable=False, default="JOINT_VENTURE", index=True)
    opportunity_source = Column(String(64), nullable=False, default="BROKER") # BROKER, LANDOWNER, AGENT, INTERNAL_TEAM
    source_contact_details = Column(String(255), nullable=True)
    road_access_width_ft = Column(Numeric(6, 2), nullable=False, default=40.00)
    surrounding_development = Column(Text, nullable=True)
    proposed_development_type = Column(String(64), nullable=False, default="RESIDENTIAL")
    far_potential = Column(Numeric(5, 2), nullable=False, default=4.50)
    max_allowable_floors = Column(Integer, nullable=False, default=14)
    ground_coverage_percent = Column(Numeric(5, 2), nullable=False, default=50.00)
    estimated_builtup_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    indicative_cost_total = Column(Numeric(16, 2), nullable=False, default=0.00)
    indicative_cost_per_katha = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Status: DRAFT_PROPOSAL, LEGAL_VETTING, SURVEY_IN_PROGRESS, JV_SIGNED, ACQUIRED, REJECTED
    status = Column(String(64), nullable=False, default="DRAFT_PROPOSAL", index=True)
    workflow_stage = Column(String(64), nullable=False, default="IDENTIFIED", index=True) # IDENTIFIED, SCREENING_INSPECTION, FEASIBILITY_VALUATION, MANAGEMENT_APPROVAL, DUE_DILIGENCE_NEGOTIATION, ACQUIRED, REJECTED
    preliminary_valuation_notes = Column(Text, nullable=True)
    feasibility_report_summary = Column(JSON, nullable=True)
    
    location_description = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    landowners = relationship("Landowner", back_populates="land_bank")
    survey_records = relationship("SurveyRecord", back_populates="land_bank", cascade="all, delete-orphan")
    jv_agreements = relationship("JVAgreement", back_populates="land_bank", cascade="all, delete-orphan")
    khatians = relationship("LandKhatian", back_populates="land_bank", cascade="all, delete-orphan")
    dags = relationship("LandDag", back_populates="land_bank", cascade="all, delete-orphan")
    documents = relationship("LandDeedDocument", back_populates="land_bank", cascade="all, delete-orphan")
    parcels = relationship("LandParcel", back_populates="land_bank")


class Landowner(Base):
    """
    Centralized register of landowners, sellers, co-owners, representatives, and authorized signatories.
    Supports multi-parcel registration, duplicate detection, and PoA/banking compliance.
    """
    __tablename__ = "lnd_landowners"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    landowner_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. LND-OWN-0001
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="SET NULL"), nullable=True, index=True)
    owner_type = Column(String(32), nullable=False, default="INDIVIDUAL") # INDIVIDUAL, JOINT_OWNER, COMPANY, POA_HOLDER
    full_name_en = Column(String(191), nullable=False, index=True)
    full_name_bn = Column(String(191), nullable=True)
    father_mother_spouse_name = Column(String(191), nullable=True)
    present_address = Column(Text, nullable=True)
    permanent_address = Column(Text, nullable=True)
    
    nid_number = Column(String(64), nullable=True, index=True)
    passport_number = Column(String(64), nullable=True)
    company_reg_number = Column(String(64), nullable=True)
    tin_number = Column(String(64), nullable=True)
    phone_number = Column(String(32), nullable=True, index=True)
    email = Column(String(128), nullable=True)
    emergency_contact_name = Column(String(128), nullable=True)
    emergency_contact_phone = Column(String(32), nullable=True)
    
    ownership_share_ratio = Column(Numeric(6, 4), nullable=False, default=1.0000) # e.g. 0.5000 = 50%
    ownership_nature = Column(String(32), nullable=False, default="INHERITED") # INHERITED, PURCHASED, GIFT_HEBA, COURT_DECREE
    
    # Restricted Banking Details
    bank_name = Column(String(128), nullable=True)
    bank_branch = Column(String(128), nullable=True)
    bank_account_no = Column(String(64), nullable=True)
    bank_routing_no = Column(String(32), nullable=True)
    bank_account_holder = Column(String(128), nullable=True)
    bank_details = Column(JSON, nullable=True)
    
    nominee_details = Column(JSON, nullable=True)
    poa_details = Column(JSON, nullable=True)
    supporting_documents = Column(JSON, nullable=True)
    negotiation_notes = Column(JSON, nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE", index=True) # PROSPECT, UNDER_VERIFICATION, ACTIVE, BLOCKED, ARCHIVED
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    land_bank = relationship("LandBank", back_populates="landowners")
    parcel_links = relationship("LandownerParcelLink", back_populates="landowner", cascade="all, delete-orphan")


class LandParcel(Base):
    """
    Every land parcel must have a unique record, even when several parcels are acquired for the same project.
    Supports multi-mouza, khatian, dag, and deeds with GPS coordinates and cardinal boundaries.
    """
    __tablename__ = "lnd_parcels"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    parcel_id = Column(String(64), unique=True, nullable=False, index=True) # e.g. LND-000125
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(BigInteger, nullable=True, index=True)
    project_name = Column(String(191), nullable=False)
    division = Column(String(64), nullable=False, default="Dhaka Division")
    district = Column(String(64), nullable=False, default="Dhaka")
    upazila_thana = Column(String(128), nullable=False, default="Gulshan")
    mouza_name = Column(String(128), nullable=False, index=True)
    jl_number = Column(String(64), nullable=False)
    khatian_number = Column(String(64), nullable=False)
    dag_number = Column(String(64), nullable=False)
    land_classification = Column(String(64), nullable=False, default="RESIDENTIAL") # RESIDENTIAL, COMMERCIAL, AGRICULTURAL, OTHER
    
    total_area_decimal = Column(Numeric(14, 4), nullable=False, default=0.0)
    total_area_katha = Column(Numeric(14, 4), nullable=False, default=0.0)
    total_area_bigha = Column(Numeric(14, 4), nullable=False, default=0.0)
    total_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.0)
    
    acquisition_status = Column(String(64), nullable=False, default="PROPOSED", index=True) # PROPOSED, UNDER_REVIEW, APPROVED, ACQUIRED
    gps_latitude = Column(Numeric(10, 7), nullable=True)
    gps_longitude = Column(Numeric(10, 7), nullable=True)
    boundary_north = Column(String(255), nullable=True)
    boundary_south = Column(String(255), nullable=True)
    boundary_east = Column(String(255), nullable=True)
    boundary_west = Column(String(255), nullable=True)
    road_access_width_ft = Column(Numeric(6, 2), nullable=False, default=40.0)
    
    deed_number = Column(String(128), nullable=True)
    deed_date = Column(Date, nullable=True)
    source_record_info = Column(JSON, nullable=True)
    gis_polygon_data = Column(JSON, nullable=True)
    remarks = Column(Text, nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    land_bank = relationship("LandBank", back_populates="parcels")
    owner_links = relationship("LandownerParcelLink", back_populates="parcel", cascade="all, delete-orphan")


class LandownerParcelLink(Base):
    """
    Many-to-many relationship linking multiple landowners to single or multiple land parcels
    with explicit ownership share percentages.
    """
    __tablename__ = "lnd_landowner_parcel_links"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    landowner_id = Column(BigInteger, ForeignKey("lnd_landowners.id", ondelete="CASCADE"), nullable=False, index=True)
    parcel_id = Column(BigInteger, ForeignKey("lnd_parcels.id", ondelete="CASCADE"), nullable=False, index=True)
    ownership_share_percent = Column(Numeric(6, 2), nullable=False, default=100.0)
    title_deed_no = Column(String(128), nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE")
    created_at = Column(TIMESTAMP, server_default=func.now())

    landowner = relationship("Landowner", back_populates="parcel_links")
    parcel = relationship("LandParcel", back_populates="owner_links")


class LandKhatian(Base):
    """
    Statutory Khatian Hierarchy under Bengal Tenancy Act and State Acquisition Act:
    CS (Cadastral Survey 1888-1940) -> SA (State Acquisition 1956-1963) -> RS (Revisional Survey) -> City/BS (Bangladesh Survey) -> Mutation Parcha.
    """
    __tablename__ = "land_khatians"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="CASCADE"), nullable=False, index=True)
    khatian_type = Column(String(32), nullable=False, index=True) # CS, SA, RS, BS, MUTATION
    khatian_number = Column(String(64), nullable=False, index=True)
    recorded_tenant_name = Column(String(191), nullable=False)
    case_or_jote_no = Column(String(64), nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    land_bank = relationship("LandBank", back_populates="khatians")
    dags = relationship("LandDag", back_populates="khatian", cascade="all, delete-orphan")


class LandDag(Base):
    """
    Cadastral Dag / Plot details associated with Khatians and Parcels.
    Includes automated mathematical area conversions: Katha, Decimal, Bigha, and Sqft.
    """
    __tablename__ = "land_dags"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="CASCADE"), nullable=False, index=True)
    khatian_id = Column(BigInteger, ForeignKey("land_khatians.id", ondelete="SET NULL"), nullable=True, index=True)
    dag_number = Column(String(64), nullable=False, index=True)
    land_class = Column(String(64), nullable=False, default="NAL") # NAL, BHITI, CHALA, DOBA, COMMERCIAL, RESIDENTIAL
    
    area_decimal = Column(Numeric(14, 4), nullable=False, default=0.00)
    area_katha = Column(Numeric(14, 4), nullable=False, default=0.00)
    area_bigha = Column(Numeric(14, 4), nullable=False, default=0.00)
    area_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    possession_status = Column(String(64), nullable=False, default="FULL_POSSESSION") # FULL_POSSESSION, PARTIAL_DISPUTE, BOUNDARY_SURVEYED
    remarks = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    land_bank = relationship("LandBank", back_populates="dags")
    khatian = relationship("LandKhatian", back_populates="dags")


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


class LandDeedDocument(Base):
    """
    Statutory Legal Document Storage: Deed (Baya/Saf-Kabala), Mutation Parcha,
    DCR (Duplicate Carbon Receipt), Khajna (Land Development Tax) Receipt, and Power of Attorney (PoA).
    Features annual tax & PoA expiration tracking and legal alert flags.
    """
    __tablename__ = "land_deed_documents"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="CASCADE"), nullable=False, index=True)
    doc_type = Column(String(64), nullable=False, index=True) # DEED_BAYA, MUTATION_PARCHA, DCR_RECEIPT, KHAJNA_TAX, POA_DEED
    doc_number = Column(String(128), nullable=False, index=True)
    issuing_office = Column(String(191), nullable=False, default="Sub-Registry Office / AC Land Office")
    
    execution_date = Column(Date, nullable=False, default=func.current_date())
    expiry_date = Column(Date, nullable=True) # Crucial for Khajna & Power of Attorney renewals!
    is_expired = Column(Boolean, nullable=False, default=False, index=True)
    
    file_url = Column(String(255), nullable=True)
    verification_status = Column(String(32), nullable=False, default="VERIFIED") # VERIFIED, PENDING_SEARCH, DISPUTED
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    land_bank = relationship("LandBank", back_populates="documents")


class JVAgreement(Base):
    """
    Joint Venture (JV) contractual agreement between developer and landowners.
    Configures Developer : Landowner sharing ratio (50:50, 60:40, etc.),
    Signing Money, milestone schedules, and Power of Attorney (PoA) governance.
    """
    __tablename__ = "lnd_jv_agreements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="CASCADE"), nullable=False, index=True)
    agreement_deed_no = Column(String(128), unique=True, nullable=False, index=True)
    
    # Sharing Ratio (sums to 100%)
    landowner_share_percent = Column(Numeric(6, 2), nullable=False) # e.g. 50.00% or 40.00%
    developer_share_percent = Column(Numeric(6, 2), nullable=False) # e.g. 50.00% or 60.00%
    
    # Financial terms
    signing_money_total = Column(Numeric(16, 2), nullable=False, default=0.00)
    signing_money_paid = Column(Numeric(16, 2), nullable=False, default=0.00)
    tenure_months = Column(Integer, nullable=False, default=36)
    
    # Power of Attorney (PoA) Governance
    poa_deed_number = Column(String(128), nullable=True)
    poa_execution_date = Column(Date, nullable=True)
    poa_expiry_date = Column(Date, nullable=True)
    poa_verified = Column(Boolean, nullable=False, default=True)
    
    signing_date = Column(TIMESTAMP, nullable=True)
    handover_commitment_date = Column(TIMESTAMP, nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE") # DRAFT, ACTIVE, COMPLETED, TERMINATED

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    land_bank = relationship("LandBank", back_populates="jv_agreements")
    unit_allocations = relationship("JVUnitAllocation", back_populates="jv_agreement", cascade="all, delete-orphan")
    milestones = relationship("LandJVMilestonePayment", back_populates="jv_agreement", cascade="all, delete-orphan")


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
    
    tower_name = Column(String(64), nullable=False, default="Tower 1")
    floor_number = Column(Integer, nullable=False, default=1)
    unit_number = Column(String(64), nullable=False, default="1A")
    unit_identifier = Column(String(64), nullable=False) # e.g. 'Tower 1 - Floor 5 - Unit 5A'
    
    unit_type = Column(String(32), nullable=False, default="APARTMENT") # APARTMENT, COMMERCIAL, PARKING_BAY
    allocation_type = Column(String(32), nullable=False, index=True) # LANDOWNER_UNIT, DEVELOPER_UNIT
    is_locked_for_sales = Column(Boolean, nullable=False, default=False, index=True)
    
    gross_sft = Column(Numeric(10, 2), nullable=False, default=1500.00)
    parking_slot_number = Column(String(32), nullable=True) # e.g. 'B1-04'
    allocation_notes = Column(String(255), nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    jv_agreement = relationship("JVAgreement", back_populates="unit_allocations")


class LandJVMilestonePayment(Base):
    """
    Landowner Signing Money & Milestone Installment Schedule.
    Supports adjustment against developer's share upon sales recovery.
    """
    __tablename__ = "land_jv_milestone_payments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    jv_agreement_id = Column(BigInteger, ForeignKey("lnd_jv_agreements.id", ondelete="CASCADE"), nullable=False, index=True)
    milestone_name = Column(String(128), nullable=False) # SIGNING_ADVANCE, RAJUK_PLAN_APPROVAL, PILING_COMPLETE, SUPERSTRUCTURE_ROOF, HANDOVER
    due_date = Column(Date, nullable=False)
    amount_bdt = Column(Numeric(16, 2), nullable=False)
    
    # Status: PENDING, PAID, ADJUSTED_AGAINST_SHARE
    payment_status = Column(String(32), nullable=False, default="PENDING")
    paid_date = Column(Date, nullable=True)
    voucher_ref = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    jv_agreement = relationship("JVAgreement", back_populates="milestones")
