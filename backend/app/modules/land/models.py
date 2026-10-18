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
    documents = relationship("LandDeedDocument", back_populates="landowner")


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
    documents = relationship("LandDeedDocument", back_populates="parcel")
    jv_agreements = relationship("JVAgreement", back_populates="parcel")
    due_diligence = relationship("LegalDueDiligence", back_populates="parcel", uselist=False)
    valuations = relationship("LandValuation", back_populates="parcel", cascade="all, delete-orphan")
    costings = relationship("AcquisitionCosting", back_populates="parcel", cascade="all, delete-orphan")
    negotiations = relationship("LandNegotiation", back_populates="parcel", cascade="all, delete-orphan")
    payment_schedules = relationship("LandPaymentSchedule", back_populates="parcel", cascade="all, delete-orphan")


class LandownerParcelLink(Base):
    """
    Many-to-many relationship linking multiple landowners to single or multiple land parcels
    with explicit ownership share percentages, source of title, and consent verification.
    """
    __tablename__ = "lnd_landowner_parcel_links"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    landowner_id = Column(BigInteger, ForeignKey("lnd_landowners.id", ondelete="CASCADE"), nullable=False, index=True)
    parcel_id = Column(BigInteger, ForeignKey("lnd_parcels.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Ownership Share & Source
    ownership_share_percent = Column(Numeric(6, 2), nullable=False, default=100.0)
    ownership_source = Column(String(64), nullable=False, default="PURCHASE") # PURCHASE, INHERITANCE, PARTITION_DEED, GIFT_HEBA, COURT_DECREE, TRANSFER
    
    # Mathematical Equivalent Area Retention
    equivalent_area_decimal = Column(Numeric(14, 4), nullable=False, default=0.00)
    equivalent_area_katha = Column(Numeric(14, 4), nullable=False, default=0.00)
    equivalent_area_sqft = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Financial terms & developer sharing
    proposed_sale_price_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    development_share_percent = Column(Numeric(6, 2), nullable=False, default=0.00)
    
    # Consents, Signatures & PoA
    consent_status = Column(String(32), nullable=False, default="CONSENT_GRANTED") # CONSENT_GRANTED, CONSENT_PENDING, DISPUTED, REFUSED, LEGAL_NOTICE
    has_poa = Column(Boolean, nullable=False, default=False)
    poa_holder_name = Column(String(191), nullable=True)
    witness_details = Column(JSON, nullable=True)
    dispute_remarks = Column(Text, nullable=True)
    is_share_verified = Column(Boolean, nullable=False, default=True)

    title_deed_no = Column(String(128), nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

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
    Statutory Legal Document Storage & Title Chain Verification:
    Sale Deed, Chain Baya Deeds, Survey Records (CS/SA/RS/BS), Mutation Parcha & DCR,
    Khajna Tax Dakhila, Boundary Survey Maps, Mouza Maps, NOC/Permits, and Waris/PoA.
    Tracks independent verification, OCR extraction, versioning, and renewal reminders.
    """
    __tablename__ = "land_deed_documents"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="SET NULL"), nullable=True, index=True)
    parcel_id = Column(BigInteger, ForeignKey("lnd_parcels.id", ondelete="SET NULL"), nullable=True, index=True)
    landowner_id = Column(BigInteger, ForeignKey("lnd_landowners.id", ondelete="SET NULL"), nullable=True, index=True)
    
    doc_type = Column(String(64), nullable=False, index=True)
    document_category = Column(String(64), nullable=False, default="SALE_DEED", index=True)
    doc_number = Column(String(128), nullable=False, index=True)
    doc_title = Column(String(255), nullable=True)
    reference_number = Column(String(128), nullable=True)
    issuing_office = Column(String(191), nullable=False, default="Sub-Registry Office / AC Land Office")
    
    execution_date = Column(Date, nullable=False, default=func.current_date())
    expiry_date = Column(Date, nullable=True)
    is_expired = Column(Boolean, nullable=False, default=False, index=True)
    
    file_url = Column(String(255), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)
    mime_type = Column(String(64), nullable=True, default="application/pdf")
    document_version = Column(String(32), nullable=False, default="v1.0")
    
    verification_status = Column(String(32), nullable=False, default="PENDING", index=True) # PENDING, VERIFIED, REJECTED, EXPIRED, REQUIRES_CLARIFICATION
    verification_officer = Column(String(128), nullable=True)
    verification_date = Column(Date, nullable=True)
    verification_remarks = Column(Text, nullable=True)
    is_independently_verified = Column(Boolean, nullable=False, default=False)
    
    ocr_extracted_data = Column(JSON, nullable=True)
    ocr_status = Column(String(32), nullable=False, default="NOT_EXTRACTED") # NOT_EXTRACTED, EXTRACTED, MANUALLY_CONFIRMED
    access_security_level = Column(String(32), nullable=False, default="STANDARD") # STANDARD, RESTRICTED, CONFIDENTIAL_EXECUTIVE
    renewal_reminder_days = Column(Integer, nullable=False, default=30)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    land_bank = relationship("LandBank", back_populates="documents")
    parcel = relationship("LandParcel", back_populates="documents")
    landowner = relationship("Landowner", back_populates="documents")


class MeasurementConvention(Base):
    """
    Configurable Bangladesh Land Measurement Conventions:
    Preserves original recorded deed unit while allowing regional conversion parameters
    (e.g. Dhaka standard 720 sqft/katha vs Rajshahi 33-decimal bigha vs Chittagong Kani/Gonda).
    """
    __tablename__ = "lnd_measurement_conventions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    convention_code = Column(String(64), unique=True, nullable=False, index=True)
    convention_name = Column(String(128), nullable=False)
    region_district = Column(String(128), nullable=False)
    katha_to_sqft = Column(Numeric(10, 4), nullable=False, default=720.0000)
    decimal_to_sqft = Column(Numeric(10, 4), nullable=False, default=435.6000)
    bigha_to_katha = Column(Numeric(10, 4), nullable=False, default=20.0000)
    acre_to_decimal = Column(Numeric(10, 4), nullable=False, default=100.0000)
    kani_to_sqft = Column(Numeric(12, 4), nullable=True)
    gonda_to_sqft = Column(Numeric(12, 4), nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class JVAgreement(Base):
    """
    Joint Venture (JV) contractual agreement between developer and landowners.
    Configures Developer : Landowner sharing ratio (50:50, 60:40, etc.),
    Signing Money, milestone schedules, and Power of Attorney (PoA) governance.
    """
    __tablename__ = "lnd_jv_agreements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    land_bank_id = Column(BigInteger, ForeignKey("lnd_land_banks.id", ondelete="CASCADE"), nullable=False, index=True)
    parcel_id = Column(BigInteger, ForeignKey("lnd_parcels.id", ondelete="SET NULL"), nullable=True, index=True)
    agreement_deed_no = Column(String(128), unique=True, nullable=False, index=True)
    agreement_type = Column(String(64), nullable=False, default="JOINT_VENTURE_DEVELOPMENT") # JOINT_VENTURE_DEVELOPMENT, OUTRIGHT_PURCHASE_AGREEMENT, POWER_OF_ATTORNEY_AGREEMENT, SUPPLEMENTARY_AMENDMENT, PARTITION_SETTLEMENT
    
    # Registration & Witness
    registration_deed_no = Column(String(128), nullable=True)
    registration_office = Column(String(191), nullable=True)
    registration_date = Column(Date, nullable=True)
    witness_count = Column(Integer, nullable=False, default=2)

    # Sharing Ratio (sums to 100%)
    landowner_share_percent = Column(Numeric(6, 2), nullable=False) # e.g. 50.00% or 40.00%
    developer_share_percent = Column(Numeric(6, 2), nullable=False) # e.g. 50.00% or 60.00%
    
    # Financial terms
    signing_money_total = Column(Numeric(16, 2), nullable=False, default=0.00)
    signing_money_paid = Column(Numeric(16, 2), nullable=False, default=0.00)
    tenure_months = Column(Integer, nullable=False, default=36)
    
    # Landowner Allocations
    allocated_flats_count = Column(Integer, nullable=False, default=0)
    allocated_shops_count = Column(Integer, nullable=False, default=0)
    allocated_car_parks_count = Column(Integer, nullable=False, default=0)
    allocated_cash_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)

    # Obligations & Conditions
    obligations_developer = Column(Text, nullable=True)
    obligations_landowner = Column(Text, nullable=True)
    special_conditions = Column(Text, nullable=True)
    amendment_number = Column(Integer, nullable=False, default=0)
    termination_conditions = Column(Text, nullable=True)
    missing_consents_flag = Column(Boolean, nullable=False, default=False)

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
    parcel = relationship("LandParcel", back_populates="jv_agreements")
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


class LegalDueDiligence(Base):
    """
    Module 2.7 Legal Due Diligence and Encumbrance Tracking:
    Rigorous pre-acquisition audit of title chain, survey reconciliations, mutations,
    mortgages/liens, litigation, physical possession, and statutory land-use restrictions.
    High or Critical risks immediately block acquisition unless an approved exception is logged.
    """
    __tablename__ = "lnd_legal_due_diligence"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    diligence_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. LDD-2026-001
    parcel_id = Column(BigInteger, ForeignKey("lnd_parcels.id", ondelete="CASCADE"), nullable=False, index=True)
    
    lead_legal_counsel = Column(String(191), nullable=False)
    law_firm_name = Column(String(191), nullable=True)
    
    overall_risk_level = Column(String(32), nullable=False, default="LOW", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    clearance_status = Column(String(64), nullable=False, default="UNDER_REVIEW", index=True) # CLEARED, CONDITIONAL_CLEARANCE, BLOCKED, UNDER_REVIEW
    acquisition_blocked = Column(Boolean, nullable=False, default=False)
    
    exception_approved_by = Column(String(191), nullable=True)
    exception_reason = Column(Text, nullable=True)
    summary_legal_opinion = Column(Text, nullable=True)
    
    title_search_period_years = Column(Integer, nullable=False, default=30)
    sub_registry_office_searched = Column(String(191), nullable=True)
    encumbrance_certificate_no = Column(String(128), nullable=True)
    non_encumbrance_certificate_date = Column(Date, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    parcel = relationship("LandParcel", back_populates="due_diligence")
    items = relationship("DueDiligenceItem", back_populates="due_diligence", cascade="all, delete-orphan")


class DueDiligenceItem(Base):
    """
    Individual Checklist verification items under legal due diligence audit.
    Each item records responsible officer, date, evidence, remarks, risk level, and decision.
    """
    __tablename__ = "lnd_due_diligence_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    due_diligence_id = Column(BigInteger, ForeignKey("lnd_legal_due_diligence.id", ondelete="CASCADE"), nullable=False, index=True)
    
    check_category = Column(String(64), nullable=False) # CHAIN_OF_TITLE, SURVEY_DEED_MATCH, MUTATION_TAX, MORTGAGE_LIENS_ENCUMBRANCE, etc.
    check_title = Column(String(255), nullable=False)
    responsible_officer = Column(String(191), nullable=False)
    verification_date = Column(Date, nullable=False)
    
    risk_level = Column(String(32), nullable=False, default="LOW", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    decision = Column(String(64), nullable=False, default="PASSED", index=True) # PASSED, CONDITIONAL, FAILED_BLOCKING, IN_PROGRESS
    evidence_documents = Column(String(255), nullable=True)
    remarks = Column(Text, nullable=True)
    is_blocking = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())

    due_diligence = relationship("LegalDueDiligence", back_populates="items")


# ==============================================================================
# 11. Land Valuation & Acquisition Costing (Module 2.8)
# ==============================================================================

class LandValuation(Base):
    """
    Maintains multiple valuations with date, source (Govt mouza rate, Surveyor, Bank, Internal, Seller),
    assessor, asking price, market valuation, and management approval status.
    """
    __tablename__ = "lnd_land_valuations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    valuation_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. VAL-PRC001-01
    parcel_id = Column(BigInteger, ForeignKey("lnd_parcels.id", ondelete="CASCADE"), nullable=False, index=True)
    
    valuation_date = Column(Date, nullable=False)
    valuation_source = Column(String(64), nullable=False, default="INTERNAL_ESTIMATE", index=True)
    assessor_name = Column(String(191), nullable=False)
    assessor_company = Column(String(191), nullable=True)
    assessor_license_no = Column(String(100), nullable=True)
    
    asking_price_total_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    market_valuation_total_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    govt_mouza_rate_per_decimal_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    govt_mouza_valuation_total_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    recommended_offer_price_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    notes_and_methodology = Column(Text, nullable=True)
    
    approval_status = Column(String(32), nullable=False, default="DRAFT", index=True) # DRAFT, SUBMITTED, APPROVED, REJECTED
    approved_by = Column(String(191), nullable=True)
    approval_date = Column(Date, nullable=True)
    approval_remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    parcel = relationship("LandParcel", back_populates="valuations")
    costings = relationship("AcquisitionCosting", back_populates="valuation")


class AcquisitionCosting(Base):
    """
    Master acquisition costing record.
    Calculates total proposed/estimated acquisition cost, actual expenditure, remaining budget,
    and unit costs per decimal, katha, and sqft.
    Tracks accounting treatment: Capitalized Land Cost vs Capitalized Project WIP vs Expensed Costs.
    """
    __tablename__ = "lnd_acquisition_costings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    costing_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. ACQ-COST-PRC001
    parcel_id = Column(BigInteger, ForeignKey("lnd_parcels.id", ondelete="CASCADE"), nullable=False, index=True)
    valuation_id = Column(BigInteger, ForeignKey("lnd_land_valuations.id", ondelete="SET NULL"), nullable=True, index=True)
    
    costing_date = Column(Date, nullable=False)
    costing_status = Column(String(32), nullable=False, default="ESTIMATED", index=True) # ESTIMATED, IN_NEGOTIATION, APPROVED, PARTIALLY_SPENT, FINALIZED_CLOSED
    agreed_purchase_price_bdt = Column(Numeric(16, 2), nullable=False, default=0.00) # Core consideration
    budget_allocated_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    total_estimated_expenses_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_actual_expenses_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    total_estimated_cost_bdt = Column(Numeric(16, 2), nullable=False, default=0.00) # Purchase price + est expenses
    total_actual_cost_bdt = Column(Numeric(16, 2), nullable=False, default=0.00) # Purchase price paid + act expenses
    remaining_budget_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    cost_variance_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    cost_variance_percent = Column(Numeric(8, 2), nullable=False, default=0.00)
    
    # Unit rates (auto-calculated)
    cost_per_decimal_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    cost_per_katha_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    cost_per_sqft_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    # Accounting Capitalization Policy Summary
    capitalized_land_cost_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    capitalized_development_cost_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    expensed_acquisition_cost_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    approval_stage = Column(String(32), nullable=False, default="DRAFT", index=True) # DRAFT, PENDING_MANAGEMENT_APPROVAL, BOARD_APPROVED, REJECTED
    approved_by = Column(String(191), nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    approval_notes = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    parcel = relationship("LandParcel", back_populates="costings")
    valuation = relationship("LandValuation", back_populates="costings")
    expense_items = relationship("AcquisitionExpenseItem", back_populates="costing", cascade="all, delete-orphan")


class AcquisitionExpenseItem(Base):
    """
    Itemized cost components under an acquisition costing:
    Registration, Stamp duties, Legal fees, Survey expenses, Brokerage, Mutation, Compensation/Settlement, etc.
    """
    __tablename__ = "lnd_acquisition_expense_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    costing_id = Column(BigInteger, ForeignKey("lnd_acquisition_costings.id", ondelete="CASCADE"), nullable=False, index=True)
    
    expense_category = Column(String(64), nullable=False, index=True) # REGISTRATION_FEES, STAMP_DUTIES, LEGAL_FEES, SURVEY_EXPENSES, BROKERAGE_COMMISSION, MUTATION_FEES, COMPENSATION_SETTLEMENT, OTHER_ACQUISITION_EXPENSES
    item_description = Column(String(255), nullable=False)
    payee_name = Column(String(191), nullable=True)
    
    estimated_amount_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    actual_amount_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    variance_amount_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    payment_status = Column(String(32), nullable=False, default="PLANNED", index=True) # PLANNED, APPROVED_FOR_PAYMENT, PARTIAL_PAID, PAID, CANCELLED
    accounting_treatment = Column(String(32), nullable=False, default="CAPITALIZE_LAND") # CAPITALIZE_LAND, CAPITALIZE_PROJECT, EXPENSE_OFF
    payment_date = Column(Date, nullable=True)
    receipt_voucher_ref = Column(String(128), nullable=True)
    supporting_document_url = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    costing = relationship("AcquisitionCosting", back_populates="expense_items")


# ==============================================================================
# 12. Landowner Negotiation & Agreement Management (Module 2.9)
# ==============================================================================

class LandNegotiation(Base):
    """
    Master negotiation record tracking commercial history:
    Asking price, developer target, offers/counteroffers, payment terms,
    conditions precedent, meeting minutes, version history, and authorized approval.
    """
    __tablename__ = "lnd_land_negotiations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    negotiation_code = Column(String(64), unique=True, nullable=False, index=True) # e.g. NEG-PRC001-01
    parcel_id = Column(BigInteger, ForeignKey("lnd_parcels.id", ondelete="CASCADE"), nullable=False, index=True)
    landowner_id = Column(BigInteger, ForeignKey("lnd_landowners.id", ondelete="SET NULL"), nullable=True, index=True)
    
    negotiation_title = Column(String(191), nullable=False)
    negotiation_stage = Column(String(64), nullable=False, default="INITIAL_OFFER", index=True) # INITIAL_OFFER, COUNTER_OFFER_RECEIVED, ACTIVE_BARGAINING, FINAL_TERMS_AGREED, LEGAL_DRAFTING, COMMERCIAL_APPROVED, AGREEMENT_EXECUTED, STALLED_DELAYED, TERMINATED
    
    initial_asking_price_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    developer_target_price_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    current_offer_amount_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    current_counteroffer_amount_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    final_agreed_amount_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    
    consideration_type = Column(String(64), nullable=False, default="CASH_PURCHASE") # CASH_PURCHASE, JV_DEVELOPMENT_SHARE, HYBRID_CASH_AND_ALLOCATION
    proposed_advance_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    installment_terms_summary = Column(Text, nullable=True)
    non_cash_consideration_details = Column(Text, nullable=True)
    conditions_precedent = Column(Text, nullable=True)
    
    negotiation_start_date = Column(Date, nullable=False)
    target_closing_deadline = Column(Date, nullable=False)
    agreement_execution_date = Column(Date, nullable=True)
    agreement_expiry_date = Column(Date, nullable=True) # Alert trigger for expiring agreement
    
    agreement_status = Column(String(64), nullable=False, default="DRAFTING", index=True) # DRAFTING, LEGAL_VETTING, MANAGEMENT_REVIEW, READY_FOR_EXECUTION, EXECUTED_REGISTERED, EXPIRED, TERMINATED
    is_delayed = Column(Boolean, nullable=False, default=False)
    delay_reason = Column(Text, nullable=True)
    
    # Authorized approval
    terms_approved_by = Column(String(191), nullable=True)
    terms_approved_at = Column(TIMESTAMP, nullable=True)
    approval_notes = Column(Text, nullable=True)
    
    current_version = Column(Integer, nullable=False, default=1)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    parcel = relationship("LandParcel", back_populates="negotiations")
    landowner = relationship("Landowner")
    meetings = relationship("NegotiationMeeting", back_populates="negotiation", cascade="all, delete-orphan")
    term_versions = relationship("NegotiationTermVersion", back_populates="negotiation", cascade="all, delete-orphan")


class NegotiationMeeting(Base):
    """
    Minutes and attendee register of negotiation meetings.
    """
    __tablename__ = "lnd_negotiation_meetings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    negotiation_id = Column(BigInteger, ForeignKey("lnd_land_negotiations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    meeting_date = Column(Date, nullable=False)
    meeting_venue = Column(String(191), nullable=True)
    developer_attendees = Column(String(255), nullable=False)
    landowner_attendees = Column(String(255), nullable=False)
    discussion_minutes = Column(Text, nullable=False)
    follow_up_tasks = Column(Text, nullable=True)
    next_meeting_date = Column(Date, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    negotiation = relationship("LandNegotiation", back_populates="meetings")


class NegotiationTermVersion(Base):
    """
    Version history for all revised commercial terms and offer/counteroffer iterations.
    """
    __tablename__ = "lnd_negotiation_term_versions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    negotiation_id = Column(BigInteger, ForeignKey("lnd_land_negotiations.id", ondelete="CASCADE"), nullable=False, index=True)
    
    version_number = Column(Integer, nullable=False)
    offered_by_party = Column(String(32), nullable=False, default="DEVELOPER") # DEVELOPER, LANDOWNER
    proposed_price_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    proposed_advance_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    proposed_timeline_days = Column(Integer, nullable=True)
    revision_summary = Column(Text, nullable=False)
    created_by_officer = Column(String(191), nullable=False)

    created_at = Column(TIMESTAMP, server_default=func.now())

    negotiation = relationship("LandNegotiation", back_populates="term_versions")


class LandPaymentSchedule(Base):
    """
    Module 2.10 Land payment schedules and outstanding balances:
    Connects land acquisition agreements with treasury and accounting.
    Tracks booking, advance, milestone installments, registration stages, owner settlements,
    and reconciles due, paid, and outstanding balances.
    """
    __tablename__ = "lnd_land_payment_schedules"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    schedule_code = Column(String(64), unique=True, nullable=False, index=True)
    parcel_id = Column(BigInteger, ForeignKey("lnd_parcels.id", ondelete="CASCADE"), nullable=False, index=True)
    acquisition_costing_id = Column(BigInteger, nullable=True)
    negotiation_id = Column(BigInteger, nullable=True, index=True)
    jv_agreement_id = Column(BigInteger, nullable=True)
    landowner_id = Column(BigInteger, ForeignKey("lnd_landowners.id", ondelete="SET NULL"), nullable=True, index=True)

    installment_number = Column(Integer, nullable=False, default=1)
    installment_title = Column(String(191), nullable=False)
    payment_type = Column(String(64), nullable=False, default="ADVANCE_PAYMENT") # BOOKING_DEPOSIT, ADVANCE_PAYMENT, INSTALLMENT_PAYMENT, REGISTRATION_PAYMENT, OWNER_SETTLEMENT, FINAL_SETTLEMENT, REFUND_ADJUSTMENT
    due_date = Column(Date, nullable=False, index=True)
    due_amount_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    paid_amount_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    outstanding_amount_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)

    payment_method = Column(String(64), nullable=False, default="BANK_TRANSFER") # BANK_TRANSFER, CHEQUE, PAY_ORDER, CASH_APPROVED
    beneficiary_name = Column(String(191), nullable=True)
    beneficiary_bank_name = Column(String(191), nullable=True)
    beneficiary_bank_branch = Column(String(191), nullable=True)
    beneficiary_account_no = Column(String(64), nullable=True)
    beneficiary_routing_no = Column(String(64), nullable=True)
    transaction_reference = Column(String(128), nullable=True)

    # Status: DRAFT, PENDING_APPROVAL, APPROVED_FOR_PAYMENT, POSTED_PAID, REJECTED, REVERSED
    approval_status = Column(String(64), nullable=False, default="DRAFT", index=True)
    approved_by = Column(String(191), nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    approved_variation_amount = Column(Numeric(16, 2), nullable=False, default=0.00)
    approval_notes = Column(Text, nullable=True)

    accounting_voucher_no = Column(String(64), nullable=True) # Linked finance transaction / GL voucher
    gl_account_code = Column(String(64), nullable=True, default="1120-LAND-ACQ-CAPEX")
    is_overdue = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    parcel = relationship("LandParcel", back_populates="payment_schedules")
    landowner = relationship("Landowner")
    transactions = relationship("LandPaymentTransaction", back_populates="schedule", cascade="all, delete-orphan", order_by="desc(LandPaymentTransaction.id)")


class LandPaymentTransaction(Base):
    """
    Immutable ledger of payment postings, disbursements, and reversal corrections.
    """
    __tablename__ = "lnd_land_payment_transactions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    schedule_id = Column(BigInteger, ForeignKey("lnd_land_payment_schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_code = Column(String(64), unique=True, nullable=False)
    transaction_date = Column(Date, nullable=False)
    amount_bdt = Column(Numeric(16, 2), nullable=False, default=0.00)
    payment_method = Column(String(64), nullable=False, default="BANK_TRANSFER")
    bank_name = Column(String(191), nullable=True)
    account_no = Column(String(64), nullable=True)
    instrument_no = Column(String(64), nullable=True)
    accounting_voucher_no = Column(String(64), nullable=True)
    is_reversal = Column(Boolean, nullable=False, default=False)
    reversal_reason = Column(Text, nullable=True)
    reversed_transaction_id = Column(BigInteger, nullable=True)
    posted_by = Column(String(191), nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())

    schedule = relationship("LandPaymentSchedule", back_populates="transactions")



