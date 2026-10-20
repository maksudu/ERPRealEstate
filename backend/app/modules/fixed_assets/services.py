from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.fixed_assets.models import (
    FixedAsset, AssetDepreciation, AssetTransfer,
    AssetMaintenance, AssetDisposal, AssetPhysicalVerification
)
from app.modules.projects.models import Project

async def get_or_create_asset_seed(db: AsyncSession):
    """Seed real-world fixed assets for construction machinery, plant fleet, vehicles and IT"""
    res = await db.execute(select(func.count(FixedAsset.id)))
    count = res.scalar() or 0
    if count > 0:
        return

    # Fetch project
    p_res = await db.execute(select(Project).limit(1))
    proj = p_res.scalar_one_or_none()
    project_id = proj.id if proj else 1
    project_name = proj.project_name if proj else "Twin Tower Residential Project"

    # Seed 5 core construction and corporate assets
    assets = [
        FixedAsset(
            asset_tag="AST-MCH-001",
            asset_name="Potain MC 85B High-Rise Tower Crane (50M Jib)",
            category="Heavy Machinery",
            subcategory="Tower Crane",
            project_id=project_id,
            project_name=project_name,
            location="Site A - Tower Foundation",
            custodian_name="Engr. M. Rafiq (Plant Manager)",
            acquisition_date=date(2023, 7, 15),
            acquisition_cost_bdt=Decimal("25000000.00"), # ৳2.50 Cr
            salvage_value_bdt=Decimal("2500000.00"),
            useful_life_years=Decimal("10.00"),
            depreciation_method="STRAIGHT_LINE",
            depreciation_rate_percent=Decimal("10.00"),
            accumulated_depreciation_bdt=Decimal("5625000.00"),
            net_book_value_bdt=Decimal("19375000.00"),
            status="ACTIVE",
            serial_number="PTN-85B-2023-901",
            po_reference="PO-2023-PLANT-004",
            vendor_name="Manitowoc Cranes Singapore / Bangla Trac",
            gl_account_code="1201-PLANT-HEAVY-MACHINERY",
            warranty_expiry_date=date(2025, 7, 14),
            insurance_policy_no="GREEN-DELTA-INS-2024-8890",
            insurance_expiry_date=date(2026, 6, 30),
            notes="Main tower crane for vertical concrete and rebar lifting"
        ),
        FixedAsset(
            asset_tag="AST-CON-002",
            asset_name="Schwing Stetter Ready-Mix Batching Plant (M1 - 30m3/h)",
            category="Plant & Equipment",
            subcategory="Batching Plant",
            project_id=project_id,
            project_name=project_name,
            location="Tejgaon Central Batching Yard",
            custodian_name="Md. Kamrul Hasan (Yard Supervisor)",
            acquisition_date=date(2023, 10, 1),
            acquisition_cost_bdt=Decimal("18000000.00"), # ৳1.80 Cr
            salvage_value_bdt=Decimal("1800000.00"),
            useful_life_years=Decimal("8.00"),
            depreciation_method="STRAIGHT_LINE",
            depreciation_rate_percent=Decimal("12.50"),
            accumulated_depreciation_bdt=Decimal("3375000.00"),
            net_book_value_bdt=Decimal("14625000.00"),
            status="ACTIVE",
            serial_number="SCH-M1-2023-550",
            po_reference="PO-2023-SCHWING-01",
            vendor_name="Schwing Stetter India Pvt Ltd",
            gl_account_code="1201-PLANT-HEAVY-MACHINERY",
            warranty_expiry_date=date(2025, 9, 30),
            insurance_policy_no="PIONEER-INS-2024-7712",
            insurance_expiry_date=date(2026, 12, 31),
            notes="High-capacity central concrete mixing facility"
        ),
        FixedAsset(
            asset_tag="AST-GEN-003",
            asset_name="Cummins 500 kVA Silent Diesel Generator Set",
            category="Electrical Assets",
            subcategory="Power Generation",
            project_id=project_id,
            project_name=project_name,
            location="Basement 2 - Power Control Room",
            custodian_name="Shafiqul Islam (Electrical Lead)",
            acquisition_date=date(2024, 1, 10),
            acquisition_cost_bdt=Decimal("6500000.00"), # ৳65.00 Lakh
            salvage_value_bdt=Decimal("650000.00"),
            useful_life_years=Decimal("7.00"),
            depreciation_method="STRAIGHT_LINE",
            depreciation_rate_percent=Decimal("14.28"),
            accumulated_depreciation_bdt=Decimal("1392240.00"),
            net_book_value_bdt=Decimal("5107760.00"),
            status="ACTIVE",
            serial_number="CUM-500KVA-2024-009",
            po_reference="PO-2024-CUMMINS-002",
            vendor_name="Energypac Power Generation Ltd",
            gl_account_code="1203-ELECTRICAL-POWER-ASSETS",
            warranty_expiry_date=date(2026, 1, 9),
            insurance_policy_no="SADHARAN-BIMA-2024-912",
            insurance_expiry_date=date(2026, 1, 31),
            notes="Continuous backup power for concrete pumps and hoists"
        ),
        FixedAsset(
            asset_tag="AST-VEH-004",
            asset_name="Hino 500 Series 7m3 Transit Concrete Mixer Truck",
            category="Vehicles",
            subcategory="Commercial Vehicle",
            project_id=project_id,
            project_name=project_name,
            location="Fleet Garage & Batching Hub",
            custodian_name="Anwar Hossain (Fleet Officer)",
            acquisition_date=date(2024, 4, 5),
            acquisition_cost_bdt=Decimal("8500000.00"), # ৳85.00 Lakh
            salvage_value_bdt=Decimal("850000.00"),
            useful_life_years=Decimal("6.00"),
            depreciation_method="STRAIGHT_LINE",
            depreciation_rate_percent=Decimal("16.67"),
            accumulated_depreciation_bdt=Decimal("1416950.00"),
            net_book_value_bdt=Decimal("7083050.00"),
            status="ACTIVE",
            serial_number="HINO-500-DHAKA-METRO-TA-11-2090",
            po_reference="PO-2024-HINO-FLEET",
            vendor_name="Navana Motors Limited",
            gl_account_code="1204-MOTOR-VEHICLES-FLEET",
            warranty_expiry_date=date(2026, 4, 4),
            insurance_policy_no="RELIANCE-INS-2024-332",
            insurance_expiry_date=date(2026, 4, 30),
            notes="Transit concrete delivery from batching plant to site"
        ),
        FixedAsset(
            asset_tag="AST-IT-005",
            asset_name="Dell PowerEdge R750 Enterprise Server Cluster",
            category="IT & Computers",
            subcategory="Server Infrastructure",
            project_id=None,
            project_name="Corporate Head Office",
            location="Data Center Rack 02 - Gulshan HO",
            custodian_name="Tanvir Ahmed (IT Infrastructure Head)",
            acquisition_date=date(2024, 2, 1),
            acquisition_cost_bdt=Decimal("2000000.00"), # ৳20.00 Lakh
            salvage_value_bdt=Decimal("100000.00"),
            useful_life_years=Decimal("3.00"),
            depreciation_method="STRAIGHT_LINE",
            depreciation_rate_percent=Decimal("33.33"),
            accumulated_depreciation_bdt=Decimal("666600.00"),
            net_book_value_bdt=Decimal("1333400.00"),
            status="ACTIVE",
            serial_number="DELL-R750-SN-882190",
            po_reference="PO-2024-SMART-IT",
            vendor_name="Smart Technologies (BD) Ltd",
            gl_account_code="1205-IT-COMPUTER-EQUIPMENT",
            warranty_expiry_date=date(2027, 1, 31),
            insurance_policy_no="GREEN-DELTA-IT-2024",
            insurance_expiry_date=date(2026, 12, 31),
            notes="Production on-premise ERP server cluster and backup vault"
        )
    ]
    for a in assets:
        db.add(a)
    await db.flush()

    # Seed Inter-project Transfer
    trans = AssetTransfer(
        transfer_ref="TRF-2025-014",
        asset_id=assets[0].id,
        from_project_id=None,
        from_project_name="Central Equipment Yard, Savar",
        from_location="Yard Staging Bay 3",
        to_project_id=project_id,
        to_project_name=project_name,
        to_location="Site A - Tower Foundation",
        transfer_date=date(2025, 1, 15),
        reason="Mobilization for deep foundation pile cap casting",
        transferred_by="Zakir Hossain (Logistics Lead)",
        received_by="Engr. M. Rafiq",
        status="COMPLETED"
    )
    db.add(trans)

    # Seed Maintenance Record & Downtime
    maint = AssetMaintenance(
        maintenance_code="MNT-2025-088",
        asset_id=assets[0].id,
        service_date=date(2025, 2, 10),
        service_type="PREVENTIVE",
        vendor_name="Bangla Trac Engineering Services",
        description="Quarterly wire rope ultrasonic testing, slewing gear greasing & motor overhaul",
        maintenance_cost_bdt=Decimal("185000.00"),
        downtime_hours=Decimal("16.00"),
        meter_reading=Decimal("1420.00"),
        is_scheduled=True,
        parts_replaced="Wire rope hoist guides & hydraulic seal rings",
        technician_name="Senior Engineer B. Chakraborty"
    )
    db.add(maint)

    # Seed Physical Verification Audit
    verif = AssetPhysicalVerification(
        audit_code="AUD-FA-2025-01",
        verification_date=date(2025, 1, 5),
        project_id=project_id,
        project_name=project_name,
        location="Site A & Central Batching Yard",
        verified_by="Internal Audit Team (Head of Financial Audit)",
        total_assets_registered=5,
        total_assets_found=5,
        discrepancy_qty=0,
        condition_status="SATISFACTORY",
        discrepancy_notes="100% physically tagged with barcoded aluminum plates; serial numbers match invoice.",
        action_taken="Reconciliation signed with site asset custodians"
    )
    db.add(verif)

    await db.commit()
