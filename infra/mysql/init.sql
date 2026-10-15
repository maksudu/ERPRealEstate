-- Bangladesh Real Estate ERP - Master Database Initialization & Dynamic Lookup Seeder
-- Optimized for MySQL 8.0+

CREATE DATABASE IF NOT EXISTS erp_realestate_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE erp_realestate_db;

-- 1. Dynamic Lookup Categories Table
CREATE TABLE IF NOT EXISTS sys_lookup_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(64) NOT NULL UNIQUE,
    category_name VARCHAR(128) NOT NULL,
    description VARCHAR(255) NULL,
    is_hierarchical BOOLEAN DEFAULT FALSE,
    is_system_locked BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cat_code (category_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Dynamic Lookup Items Table
CREATE TABLE IF NOT EXISTS sys_lookup_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    item_code VARCHAR(64) NOT NULL,
    item_name_en VARCHAR(191) NOT NULL,
    item_name_bn VARCHAR(191) NOT NULL,
    parent_id BIGINT UNSIGNED NULL,
    color_badge VARCHAR(32) NULL,
    sort_order INT UNSIGNED DEFAULT 0,
    metadata JSON NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cat_item (category_id, item_code),
    INDEX idx_cat_active_sort (category_id, is_active, sort_order),
    INDEX idx_parent (parent_id),
    CONSTRAINT fk_lookup_category FOREIGN KEY (category_id) REFERENCES sys_lookup_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_lookup_parent FOREIGN KEY (parent_id) REFERENCES sys_lookup_items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Essential Bangladesh Dynamic Categories
INSERT INTO sys_lookup_categories (category_code, category_name, description, is_system_locked) VALUES
('LAND_SURVEY_TYPE', 'Land Survey Types (Bangladesh)', 'Historic Bangladesh survey khatian types', TRUE),
('LAND_MEASUREMENT_UNIT', 'Land Measurement Units', 'Standard Bangladesh land area units', TRUE),
('UNIT_FACING', 'Property Facing / Orientation', 'Apartment/Flat facing directions', TRUE),
('UNIT_STATUS', 'Property Inventory Availability Status', 'Current lifecycle state of a unit', TRUE),
('AUTHORITY_CLEARANCE_STAGE', 'Development Authority Clearance Stages', 'RAJUK/CDA/KDA approval steps', TRUE),
('PAYMENT_MODE', 'Payment Modes & Gateways', 'Transaction payment methods in Bangladesh', TRUE),
('PDC_STATUS', 'Post Dated Cheque (PDC) Status', 'Cheque lifecycle states', TRUE),
('VAT_CLASSIFICATION', 'Bangladesh VAT & Tax Slabs', 'VAT categories under VAT Act 2012', TRUE);

-- Seed Dynamic Lookup Items for 'LAND_SURVEY_TYPE'
SET @cat_survey = (SELECT id FROM sys_lookup_categories WHERE category_code = 'LAND_SURVEY_TYPE');
INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, sort_order, is_default) VALUES
(@cat_survey, 'CS', 'Cadastral Survey (CS)', 'সিএস (ক্যাডাস্ট্রাল সার্ভে)', 1, FALSE),
(@cat_survey, 'SA', 'State Acquisition Survey (SA)', 'এসএ (স্টেট একুইজিশন)', 2, FALSE),
(@cat_survey, 'RS', 'Revisional Survey (RS)', 'আরএস (রিভিশনাল সার্ভে)', 3, TRUE),
(@cat_survey, 'BS_BRS', 'Bangladesh Survey / City Survey (BS/BRS)', 'বিএস / সিটি জরিপ', 4, FALSE),
(@cat_survey, 'MUTATION', 'Mutation Khatian (Namjari)', 'নামজারি খতিয়ান', 5, FALSE);

-- Seed Dynamic Lookup Items for 'LAND_MEASUREMENT_UNIT'
SET @cat_unit = (SELECT id FROM sys_lookup_categories WHERE category_code = 'LAND_MEASUREMENT_UNIT');
INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, sort_order, is_default, metadata) VALUES
(@cat_unit, 'KATHA', 'Katha', 'কাঠা', 1, TRUE, '{"sqft_ratio": 720.00}'),
(@cat_unit, 'DECIMAL', 'Decimal / Shotok', 'শতাংশ / শতক', 2, FALSE, '{"sqft_ratio": 435.60}'),
(@cat_unit, 'BIGHA', 'Bigha', 'বিঘা', 3, FALSE, '{"sqft_ratio": 14400.00}'),
(@cat_unit, 'ACRE', 'Acre', 'একর', 4, FALSE, '{"sqft_ratio": 43560.00}'),
(@cat_unit, 'SQFT', 'Square Feet', 'বর্গফুট', 5, FALSE, '{"sqft_ratio": 1.00}');

-- Seed Dynamic Lookup Items for 'UNIT_STATUS'
SET @cat_status = (SELECT id FROM sys_lookup_categories WHERE category_code = 'UNIT_STATUS');
INSERT INTO sys_lookup_items (category_id, item_code, item_name_en, item_name_bn, color_badge, sort_order, is_default) VALUES
(@cat_status, 'AVAILABLE', 'Available', 'বিক্রয়যোগ্য', '#10B981', 1, TRUE),
(@cat_status, 'ON_HOLD', 'On Hold (Temporary Lock)', 'হোল্ড (লক)', '#F59E0B', 2, FALSE),
(@cat_status, 'BOOKED', 'Booked', 'বুকড', '#3B82F6', 3, FALSE),
(@cat_status, 'SOLD', 'Sold', 'বিক্রীত', '#EF4444', 4, FALSE),
(@cat_status, 'LANDOWNER_SHARE', 'Landowner Share', 'জমির মালিকের অংশ', '#8B5CF6', 5, FALSE),
(@cat_status, 'HANDED_OVER', 'Handed Over', 'হস্তান্তরিত', '#065F46', 6, FALSE);
