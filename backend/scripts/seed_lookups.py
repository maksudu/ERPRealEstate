import asyncio
import json
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine
from app.modules.lookups.models import LookupCategory, LookupItem

INITIAL_LOOKUPS = [
    {
        "category_code": "LAND_SURVEY_TYPE",
        "category_name": "Land Survey Types (Bangladesh)",
        "description": "Historic and active Bangladesh land survey khatian types",
        "items": [
            {"code": "CS", "name_en": "Cadastral Survey (CS)", "name_bn": "সিএস (ক্যাডাস্ট্রাল সার্ভে)", "badge": "#64748B", "sort": 1, "default": False},
            {"code": "SA", "name_en": "State Acquisition Survey (SA)", "name_bn": "এসএ (স্টেট একুইজিশন)", "badge": "#64748B", "sort": 2, "default": False},
            {"code": "RS", "name_en": "Revisional Survey (RS)", "name_bn": "আরএস (রিভিশনাল সার্ভে)", "badge": "#0EA5E9", "sort": 3, "default": True},
            {"code": "BS_CITY", "name_en": "BS / City Survey", "name_bn": "বিএস / সিটি জরিপ", "badge": "#10B981", "sort": 4, "default": False},
            {"code": "MUTATION", "name_en": "Mutation Khatian (Namjari)", "name_bn": "নামজারি খতিয়ান", "badge": "#8B5CF6", "sort": 5, "default": False},
        ]
    },
    {
        "category_code": "LAND_CLASS",
        "category_name": "Land Class / Category (জমি শ্রেণি)",
        "description": "Sub-Registry & AC Land classification of land in Bangladesh",
        "items": [
            {"code": "NAL", "name_en": "Nal (Agricultural Low Land)", "name_bn": "নাল", "badge": "#10B981", "sort": 1, "default": False},
            {"code": "BHITI", "name_en": "Bhiti / High Land", "name_bn": "ভিটি", "badge": "#F59E0B", "sort": 2, "default": True},
            {"code": "COMMERCIAL", "name_en": "Commercial Land", "name_bn": "বাণিজ্যিক", "badge": "#3B82F6", "sort": 3, "default": False},
            {"code": "RESIDENTIAL", "name_en": "Residential Land (Bastu)", "name_bn": "বাস্তু / আবাসিক", "badge": "#8B5CF6", "sort": 4, "default": False},
            {"code": "NALJOMI", "name_en": "Nal Jomi (Cultivable)", "name_bn": "নালজমি", "badge": "#84CC16", "sort": 5, "default": False},
            {"code": "DOBA_POND", "name_en": "Pond / Low Waterbody", "name_bn": "পুকুর / ডোবা", "badge": "#06B6D4", "sort": 6, "default": False},
        ]
    },
    {
        "category_code": "LAND_MEASUREMENT_UNIT",
        "category_name": "Land Measurement Units",
        "description": "Standard land area units used across Bangladesh",
        "items": [
            {"code": "KATHA", "name_en": "Katha", "name_bn": "কাঠা", "badge": "#6366F1", "sort": 1, "default": True, "meta": {"sqft_ratio": 720.00}},
            {"code": "DECIMAL", "name_en": "Decimal / Shotok", "name_bn": "শতাংশ / শতক", "badge": "#6366F1", "sort": 2, "default": False, "meta": {"sqft_ratio": 435.60}},
            {"code": "BIGHA", "name_en": "Bigha (20 Katha)", "name_bn": "বিঘা", "badge": "#6366F1", "sort": 3, "default": False, "meta": {"sqft_ratio": 14400.00}},
            {"code": "ACRE", "name_en": "Acre (100 Decimal)", "name_bn": "একর", "badge": "#6366F1", "sort": 4, "default": False, "meta": {"sqft_ratio": 43560.00}},
            {"code": "SQFT", "name_en": "Square Feet", "name_bn": "বর্গফুট", "badge": "#64748B", "sort": 5, "default": False, "meta": {"sqft_ratio": 1.00}},
        ]
    },
    {
        "category_code": "UNIT_FACING",
        "category_name": "Apartment / Unit Facing & Orientation",
        "description": "Directional orientation of flat/plot units",
        "items": [
            {"code": "SOUTH_FACING", "name_en": "South-Facing", "name_bn": "দক্ষিণমুখী", "badge": "#10B981", "sort": 1, "default": True},
            {"code": "NORTH_FACING", "name_en": "North-Facing", "name_bn": "উত্তরমুখী", "badge": "#64748B", "sort": 2, "default": False},
            {"code": "EAST_FACING", "name_en": "East-Facing", "name_bn": "পূর্বমুখী", "badge": "#F59E0B", "sort": 3, "default": False},
            {"code": "WEST_FACING", "name_en": "West-Facing", "name_bn": "পশ্চিমমুখী", "badge": "#F97316", "sort": 4, "default": False},
            {"code": "LAKE_VIEW", "name_en": "Lake-View", "name_bn": "লেক ভিউ", "badge": "#06B6D4", "sort": 5, "default": False},
            {"code": "CORNER_PLOT", "name_en": "Corner-Plot / Multi-Facing", "name_bn": "কর্ণার প্লট", "badge": "#8B5CF6", "sort": 6, "default": False},
            {"code": "ROAD_FACING", "name_en": "Main Road Facing", "name_bn": "মেইন রোড ফেসিং", "badge": "#3B82F6", "sort": 7, "default": False},
        ]
    },
    {
        "category_code": "UNIT_STATUS",
        "category_name": "Property Inventory Availability Status",
        "description": "Lifecycle state of apartment/commercial floor space",
        "items": [
            {"code": "AVAILABLE", "name_en": "Available for Sale", "name_bn": "বিক্রয়যোগ্য", "badge": "#10B981", "sort": 1, "default": True},
            {"code": "ON_HOLD", "name_en": "On-Hold (Temporary Lock)", "name_bn": "হোল্ড (লক)", "badge": "#F59E0B", "sort": 2, "default": False},
            {"code": "BOOKED", "name_en": "Booked (Down-payment Received)", "name_bn": "বুকড", "badge": "#3B82F6", "sort": 3, "default": False},
            {"code": "SOLD", "name_en": "Sold (Allotment Issued)", "name_bn": "বিক্রীত", "badge": "#EF4444", "sort": 4, "default": False},
            {"code": "LANDOWNER_SHARE", "name_en": "Landowner-Share", "name_bn": "জমির মালিকের অংশ", "badge": "#8B5CF6", "sort": 5, "default": False},
            {"code": "HANDED_OVER", "name_en": "Handed Over", "name_bn": "হস্তান্তরিত", "badge": "#065F46", "sort": 6, "default": False},
        ]
    },
    {
        "category_code": "DEV_AUTHORITY",
        "category_name": "Development Authorities (Bangladesh)",
        "description": "City development & building approval authorities",
        "items": [
            {"code": "RAJUK", "name_en": "RAJUK (Rajdhani Unnayan Kartripakkha)", "name_bn": "রাজউক (রাজধানী উন্নয়ন কর্তৃপক্ষ)", "badge": "#DC2626", "sort": 1, "default": True},
            {"code": "CDA", "name_en": "CDA (Chattogram Development Authority)", "name_bn": "সিডিএ (চট্টগ্রাম উন্নয়ন কর্তৃপক্ষ)", "badge": "#2563EB", "sort": 2, "default": False},
            {"code": "KDA", "name_en": "KDA (Khulna Development Authority)", "name_bn": "কেডিএ (খুলনা উন্নয়ন কর্তৃপক্ষ)", "badge": "#059669", "sort": 3, "default": False},
            {"code": "RDA", "name_en": "RDA (Rajshahi Development Authority)", "name_bn": "আরডিএ (রাজশাহী উন্নয়ন কর্তৃপক্ষ)", "badge": "#D97706", "sort": 4, "default": False},
            {"code": "CANTONMENT", "name_en": "Cantonment Board / Military Estate", "name_bn": "সেনানিবাস পর্ষদ / সামরিক এস্টেট", "badge": "#4B5563", "sort": 5, "default": False},
            {"code": "MUNICIPALITY", "name_en": "Pourashava / City Corporation", "name_bn": "পৌরসভা / সিটি কর্পোরেশন", "badge": "#4F46E5", "sort": 6, "default": False},
        ]
    },
    {
        "category_code": "PAYMENT_MODE",
        "category_name": "Payment Modes & Gateways (Bangladesh)",
        "description": "Accepted transaction and collection channels",
        "items": [
            {"code": "CASH", "name_en": "Cash (In Hand / Receipt)", "name_bn": "নগদ", "badge": "#10B981", "sort": 1, "default": False},
            {"code": "CHEQUE", "name_en": "Cheque (Clearing)", "name_bn": "চেক", "badge": "#3B82F6", "sort": 2, "default": False},
            {"code": "PAY_ORDER", "name_en": "Pay Order / Banker's Cheque", "name_bn": "পে অর্ডার", "badge": "#6366F1", "sort": 3, "default": True},
            {"code": "BKASH", "name_en": "bKash MFS", "name_bn": "বিকাশ", "badge": "#E11D48", "sort": 4, "default": False},
            {"code": "NAGAD", "name_en": "Nagad MFS", "name_bn": "নগদ (এমএফএস)", "badge": "#EA580C", "sort": 5, "default": False},
            {"code": "BANK_TRANSFER", "name_en": "Bank Transfer (NPSB / BEFTN / RTGS)", "name_bn": "ব্যাংক ট্রান্সফার", "badge": "#0284C7", "sort": 6, "default": False},
        ]
    }
]

async def seed():
    print("Starting Dynamic Lookups Seeding...")
    async with AsyncSessionLocal() as session:
        for cat_data in INITIAL_LOOKUPS:
            # Check or create category
            stmt = select(LookupCategory).where(LookupCategory.category_code == cat_data["category_code"])
            res = await session.execute(stmt)
            category = res.scalar_one_or_none()

            if not category:
                category = LookupCategory(
                    category_code=cat_data["category_code"],
                    category_name=cat_data["category_name"],
                    description=cat_data["description"],
                    is_system_locked=True,
                    is_active=True
                )
                session.add(category)
                await session.flush()
                print(f"Created category: {cat_data['category_code']}")
            else:
                category.category_name = cat_data["category_name"]
                category.description = cat_data["description"]
                print(f"Updated category: {cat_data['category_code']}")

            # Seed items
            for item_data in cat_data["items"]:
                stmt_item = select(LookupItem).where(
                    LookupItem.category_id == category.id,
                    LookupItem.item_code == item_data["code"]
                )
                res_item = await session.execute(stmt_item)
                item = res_item.scalar_one_or_none()

                if not item:
                    item = LookupItem(
                        category_id=category.id,
                        item_code=item_data["code"],
                        item_name_en=item_data["name_en"],
                        item_name_bn=item_data["name_bn"],
                        color_badge=item_data["badge"],
                        sort_order=item_data["sort"],
                        is_default=item_data["default"],
                        metadata_json=item_data.get("meta"),
                        is_active=True
                    )
                    session.add(item)
                    print(f"  + Added item: {item_data['code']} -> {item_data['name_en']}")
                else:
                    item.item_name_en = item_data["name_en"]
                    item.item_name_bn = item_data["name_bn"]
                    item.color_badge = item_data["badge"]
                    item.sort_order = item_data["sort"]
                    item.is_default = item_data["default"]
                    if item_data.get("meta"):
                        item.metadata_json = item_data.get("meta")

        await session.commit()
    print("Lookups seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
