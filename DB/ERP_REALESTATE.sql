/*
SQLyog Community v13.3.1 (64 bit)
MySQL - 10.4.32-MariaDB : Database - erprealestate
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`erprealestate` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `erprealestate`;

/*Table structure for table `acc_bank_reconciliation` */

DROP TABLE IF EXISTS `acc_bank_reconciliation`;

CREATE TABLE `acc_bank_reconciliation` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `bank_account_id` bigint(20) NOT NULL,
  `statement_date` date NOT NULL,
  `statement_balance` decimal(16,2) NOT NULL,
  `book_balance` decimal(16,2) NOT NULL,
  `difference_amount` decimal(16,2) NOT NULL,
  `is_reconciled` tinyint(1) NOT NULL,
  `reconciliation_notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_acc_bank_reconciliation_statement_date` (`statement_date`),
  KEY `ix_acc_bank_reconciliation_bank_account_id` (`bank_account_id`),
  CONSTRAINT `acc_bank_reconciliation_ibfk_1` FOREIGN KEY (`bank_account_id`) REFERENCES `acc_chart_of_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `acc_bank_reconciliation` */

insert  into `acc_bank_reconciliation`(`id`,`bank_account_id`,`statement_date`,`statement_balance`,`book_balance`,`difference_amount`,`is_reconciled`,`reconciliation_notes`,`created_at`,`updated_at`) values 
(1,3,'2026-10-16',45850000.00,45850000.00,0.00,1,'Fully reconciled with Eastern Bank Gulshan Branch monthly bank e-statement.','2026-10-16 22:18:10','2026-10-16 22:18:10');

/*Table structure for table `acc_chart_of_accounts` */

DROP TABLE IF EXISTS `acc_chart_of_accounts`;

CREATE TABLE `acc_chart_of_accounts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) NOT NULL,
  `parent_account_id` bigint(20) DEFAULT NULL,
  `account_code` varchar(32) NOT NULL,
  `account_name_en` varchar(191) NOT NULL,
  `account_name_bn` varchar(191) DEFAULT NULL,
  `account_type` varchar(32) NOT NULL,
  `is_leaf_account` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_acc_chart_of_accounts_account_code` (`account_code`),
  KEY `ix_acc_chart_of_accounts_organization_id` (`organization_id`),
  KEY `ix_acc_chart_of_accounts_parent_account_id` (`parent_account_id`),
  KEY `ix_acc_chart_of_accounts_account_type` (`account_type`),
  CONSTRAINT `acc_chart_of_accounts_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `sys_organizations` (`id`),
  CONSTRAINT `acc_chart_of_accounts_ibfk_2` FOREIGN KEY (`parent_account_id`) REFERENCES `acc_chart_of_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `acc_chart_of_accounts` */

insert  into `acc_chart_of_accounts`(`id`,`organization_id`,`parent_account_id`,`account_code`,`account_name_en`,`account_name_bn`,`account_type`,`is_leaf_account`,`is_active`,`created_at`,`updated_at`) values 
(1,1,NULL,'1000','Current Assets','চলতি সম্পদ','Asset',0,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(2,1,NULL,'1010','Cash in Hand (Head Office)','নগদ তহবিল','Asset',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(3,1,NULL,'1020','Eastern Bank PLC (Current A/C #104106008)','ইস্টার্ন ব্যাংক চলতি হিসাব','Asset',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(4,1,NULL,'1030','City Bank PLC (Escrow A/C #31019821)','সিটি ব্যাংক এসক্রো হিসাব','Asset',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(5,1,NULL,'1200','Accounts Receivable (Property Buyers)','প্রাপ্য হিসাব (ক্রেতা)','Asset',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(6,1,NULL,'1300','Work-in-Progress (Construction WIP)','নির্মাণাধীন প্রকল্প সম্পদ (WIP)','Asset',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(7,1,NULL,'1400','Site Construction Material Inventory','নির্মাণ সামগ্রী মজুদ','Asset',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(8,1,NULL,'2000','Current Liabilities','চলতি দায়','Liability',0,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(9,1,NULL,'2010','Accounts Payable (Material Vendors)','প্রদেয় হিসাব (সরবরাহকারী)','Liability',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(10,1,NULL,'2020','Subcontractor RA Bill Payable','উপ-ঠিকাদার প্রদেয় বিল','Liability',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(11,1,NULL,'2030','Contractor Retention Money Payable (5%)','ঠিকাদার জামানত দায় (৫%)','Liability',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(12,1,NULL,'2040','Customer Advance Booking Deposits','ক্রেতাদের অগ্রিম বুকিং আমানত','Liability',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(13,1,NULL,'2050','Statutory Tax Deductions Payable (TDS Sec 52/53)','উৎস কর কর্তন প্রদেয়','Liability',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(14,1,NULL,'2060','Statutory VAT Deducted at Source (VDS)','উৎস ভ্যাট কর্তন প্রদেয়','Liability',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(15,1,NULL,'3000','Shareholders Equity','মালিকানা স্বত্ব','Equity',0,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(16,1,NULL,'3010','Paid-up Share Capital','পরিশোধিত মূলধন','Equity',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(17,1,NULL,'3020','Retained Earnings','সংরক্ষিত আয়','Equity',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(18,1,NULL,'4000','Operating Revenue','পরিচালন আয়','Revenue',0,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(19,1,NULL,'4010','Apartment Sales Revenue','অ্যাপার্টমেন্ট বিক্রয় রাজস্ব','Revenue',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(20,1,NULL,'4020','Commercial Space Sales Revenue','বাণিজ্যিক ফ্লোর বিক্রয়','Revenue',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(21,1,NULL,'4040','Allotment Cancellation Forfeiture Income','বুকিং বাতিল বাজেয়াপ্তকরণ আয়','Revenue',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(22,1,NULL,'4050','Apartment Mutation & Transfer NOC Fees','নামজারি ও হস্তান্তর ফি','Revenue',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(23,1,NULL,'5000','Direct Construction Costs','প্রত্যক্ষ নির্মাণ ব্যয়','Expense',0,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(24,1,NULL,'5010','Subcontractor Labor & Civil Work','উপ-ঠিকাদার সিভিল খরচ','Expense',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(25,1,NULL,'5020','Rebar, Cement & Aggregate Material Cost','রড, সিমেন্ট ও পাথর সামগ্রী খরচ','Expense',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(26,1,NULL,'5030','Broker Commission & Marketing Fees','ব্রোকার কমিশন ও বিপণন খরচ','Expense',1,1,'2026-10-16 22:18:10','2026-10-16 22:18:10');

/*Table structure for table `acc_journal_entries` */

DROP TABLE IF EXISTS `acc_journal_entries`;

CREATE TABLE `acc_journal_entries` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `voucher_date` date NOT NULL,
  `voucher_id` bigint(20) NOT NULL,
  `company_id` bigint(20) DEFAULT 1,
  `project_id` bigint(20) DEFAULT NULL,
  `account_id` bigint(20) NOT NULL,
  `debit_amount` decimal(16,2) NOT NULL DEFAULT 0.00,
  `credit_amount` decimal(16,2) NOT NULL DEFAULT 0.00,
  `narration` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`,`voucher_date`),
  KEY `idx_je_proj_acct_date` (`project_id`,`account_id`,`voucher_date`),
  KEY `idx_je_voucher_id` (`voucher_id`),
  KEY `idx_je_company_voucher_date` (`company_id`,`voucher_date`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
 PARTITION BY RANGE (year(`voucher_date`))
(PARTITION `p2023` VALUES LESS THAN (2024) ENGINE = InnoDB,
 PARTITION `p2024` VALUES LESS THAN (2025) ENGINE = InnoDB,
 PARTITION `p2025` VALUES LESS THAN (2026) ENGINE = InnoDB,
 PARTITION `p2026` VALUES LESS THAN (2027) ENGINE = InnoDB,
 PARTITION `p2027` VALUES LESS THAN (2028) ENGINE = InnoDB,
 PARTITION `p_max` VALUES LESS THAN MAXVALUE ENGINE = InnoDB);

/*Data for the table `acc_journal_entries` */

insert  into `acc_journal_entries`(`id`,`voucher_date`,`voucher_id`,`company_id`,`project_id`,`account_id`,`debit_amount`,`credit_amount`,`narration`,`created_at`) values 
(1,'2026-10-11',1,1,1,3,8000000.00,0.00,'Down payment received in Eastern Bank','2026-10-16 22:18:10'),
(2,'2026-10-11',1,1,1,12,0.00,8000000.00,'Credit to Customer Advance Booking Deposit','2026-10-16 22:18:10'),
(3,'2026-10-13',2,1,1,6,4500000.00,0.00,'Gross Work Certified to Construction WIP','2026-10-16 22:18:10'),
(4,'2026-10-13',2,1,1,10,0.00,3625000.00,'Net payable to M/S Standard Civil Builders','2026-10-16 22:18:10'),
(5,'2026-10-13',2,1,1,11,0.00,225000.00,'5% Retention Money Withheld (12-Mo DLP)','2026-10-16 22:18:10'),
(6,'2026-10-13',2,1,1,13,0.00,225000.00,'TDS Withheld u/s 52 of Income Tax Act 2023','2026-10-16 22:18:10'),
(7,'2026-10-13',2,1,1,14,0.00,225000.00,'VAT Deducted at Source (VDS 5%)','2026-10-16 22:18:10');

/*Table structure for table `acc_mushak_tax_invoices` */

DROP TABLE IF EXISTS `acc_mushak_tax_invoices`;

CREATE TABLE `acc_mushak_tax_invoices` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `booking_id` bigint(20) NOT NULL,
  `mushak_challan_number` varchar(64) NOT NULL,
  `invoice_date` date NOT NULL,
  `developer_bin_number` varchar(32) NOT NULL,
  `customer_tin_nid` varchar(64) NOT NULL,
  `apartment_sqft` decimal(10,2) NOT NULL,
  `taxable_amount` decimal(14,2) NOT NULL,
  `vat_rate_percent` decimal(5,2) NOT NULL,
  `vat_amount` decimal(14,2) NOT NULL,
  `total_amount_collected` decimal(14,2) NOT NULL,
  `pdf_url` varchar(255) DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_acc_mushak_tax_invoices_mushak_challan_number` (`mushak_challan_number`),
  KEY `ix_acc_mushak_tax_invoices_booking_id` (`booking_id`),
  CONSTRAINT `acc_mushak_tax_invoices_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `sls_bookings` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `acc_mushak_tax_invoices` */

insert  into `acc_mushak_tax_invoices`(`id`,`booking_id`,`mushak_challan_number`,`invoice_date`,`developer_bin_number`,`customer_tin_nid`,`apartment_sqft`,`taxable_amount`,`vat_rate_percent`,`vat_amount`,`total_amount_collected`,`pdf_url`,`status`,`created_at`,`updated_at`) values 
(1,1,'MUSHAK-6.3-2026-0001','2026-10-06','001234567-0101','789012345678',3150.00,45218250.00,4.50,2034821.25,47253071.25,'assets/reports/mushak_6_3_0001.pdf','ISSUED','2026-10-16 22:18:10','2026-10-16 22:18:10'),
(2,2,'MUSHAK-6.3-2026-0002','2026-10-11','001234567-0101','654321098765',1450.00,18500000.00,2.00,370000.00,18870000.00,'assets/reports/mushak_6_3_0002.pdf','ISSUED','2026-10-16 22:18:10','2026-10-16 22:18:10');

/*Table structure for table `acc_tds_deductions` */

DROP TABLE IF EXISTS `acc_tds_deductions`;

CREATE TABLE `acc_tds_deductions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `voucher_id` bigint(20) DEFAULT NULL,
  `vendor_id` bigint(20) DEFAULT NULL,
  `contractor_id` bigint(20) DEFAULT NULL,
  `deduction_section` varchar(64) NOT NULL,
  `gross_amount` decimal(14,2) NOT NULL,
  `tax_rate_percent` decimal(5,2) NOT NULL,
  `withheld_amount` decimal(14,2) NOT NULL,
  `challan_number` varchar(64) DEFAULT NULL,
  `challan_deposit_date` date DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_acc_tds_deductions_deduction_section` (`deduction_section`),
  KEY `ix_acc_tds_deductions_voucher_id` (`voucher_id`),
  KEY `ix_acc_tds_deductions_contractor_id` (`contractor_id`),
  KEY `ix_acc_tds_deductions_vendor_id` (`vendor_id`),
  CONSTRAINT `acc_tds_deductions_ibfk_1` FOREIGN KEY (`voucher_id`) REFERENCES `acc_vouchers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `acc_tds_deductions_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `scm_vendors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `acc_tds_deductions_ibfk_3` FOREIGN KEY (`contractor_id`) REFERENCES `con_contractors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `acc_tds_deductions` */

insert  into `acc_tds_deductions`(`id`,`voucher_id`,`vendor_id`,`contractor_id`,`deduction_section`,`gross_amount`,`tax_rate_percent`,`withheld_amount`,`challan_number`,`challan_deposit_date`,`status`,`created_at`,`updated_at`) values 
(1,2,NULL,NULL,'Sec 52',4500000.00,5.00,225000.00,'TR-CHAL-DHAKA-2026-9901','2026-10-15','DEPOSITED_TO_TREASURY','2026-10-16 22:18:10','2026-10-16 22:18:10'),
(2,2,NULL,NULL,'VDS',4500000.00,5.00,225000.00,'VAT-CHAL-LARGE-TAX-0044','2026-10-15','DEPOSITED_TO_TREASURY','2026-10-16 22:18:10','2026-10-16 22:18:10');

/*Table structure for table `acc_vouchers` */

DROP TABLE IF EXISTS `acc_vouchers`;

CREATE TABLE `acc_vouchers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) NOT NULL,
  `project_id` bigint(20) DEFAULT NULL,
  `voucher_number` varchar(64) NOT NULL,
  `voucher_type` varchar(32) NOT NULL,
  `voucher_date` date NOT NULL,
  `narration` text NOT NULL,
  `total_debit_amount` decimal(16,2) NOT NULL,
  `total_credit_amount` decimal(16,2) NOT NULL,
  `status` varchar(32) NOT NULL,
  `created_by_user_id` bigint(20) DEFAULT NULL,
  `reversal_voucher_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_acc_vouchers_voucher_number` (`voucher_number`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `reversal_voucher_id` (`reversal_voucher_id`),
  KEY `ix_acc_vouchers_voucher_date` (`voucher_date`),
  KEY `ix_acc_vouchers_organization_id` (`organization_id`),
  KEY `ix_acc_vouchers_voucher_type` (`voucher_type`),
  KEY `ix_acc_vouchers_project_id` (`project_id`),
  KEY `ix_acc_vouchers_status` (`status`),
  CONSTRAINT `acc_vouchers_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `sys_organizations` (`id`),
  CONSTRAINT `acc_vouchers_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `acc_vouchers_ibfk_3` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `acc_vouchers_ibfk_4` FOREIGN KEY (`reversal_voucher_id`) REFERENCES `acc_vouchers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `acc_vouchers` */

insert  into `acc_vouchers`(`id`,`organization_id`,`project_id`,`voucher_number`,`voucher_type`,`voucher_date`,`narration`,`total_debit_amount`,`total_credit_amount`,`status`,`created_by_user_id`,`reversal_voucher_id`,`created_at`,`updated_at`) values 
(1,1,1,'BR-2026-0001','Bank_Receipt','2026-10-11','Received down payment from Mrs. Sultana Parveen for Unit T1-08A via Pay Order.',8000000.00,8000000.00,'Posted',4,NULL,'2026-10-16 22:18:10','2026-10-16 22:18:10'),
(2,1,1,'JV-2026-0088','Journal','2026-10-13','Approved Subcontractor RA Bill-01 for 4th Floor Superstructure Casting. 5% Retention and statutory TDS/VDS withheld.',4500000.00,4500000.00,'Posted',4,NULL,'2026-10-16 22:18:10','2026-10-16 22:18:10');

/*Table structure for table `ast_machinery_assets` */

DROP TABLE IF EXISTS `ast_machinery_assets`;

CREATE TABLE `ast_machinery_assets` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `asset_code` varchar(32) NOT NULL,
  `asset_name` varchar(128) NOT NULL,
  `category` varchar(64) NOT NULL,
  `current_assigned_project_id` bigint(20) DEFAULT NULL,
  `hourly_rate` decimal(10,2) NOT NULL,
  `meter_reading_hours` decimal(10,2) NOT NULL,
  `status` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_ast_machinery_assets_asset_code` (`asset_code`),
  KEY `ix_ast_machinery_assets_status` (`status`),
  KEY `ix_ast_machinery_assets_category` (`category`),
  KEY `ix_ast_machinery_assets_current_assigned_project_id` (`current_assigned_project_id`),
  CONSTRAINT `ast_machinery_assets_ibfk_1` FOREIGN KEY (`current_assigned_project_id`) REFERENCES `prj_projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `ast_machinery_assets` */

insert  into `ast_machinery_assets`(`id`,`asset_code`,`asset_name`,`category`,`current_assigned_project_id`,`hourly_rate`,`meter_reading_hours`,`status`,`created_at`,`updated_at`) values 
(1,'AST-CRN-01','Zoomlion TC-5040 Stationary Tower Crane (50M Jib)','Tower Crane',1,2500.00,1420.50,'OPERATIONAL','2026-10-16 22:18:11','2026-10-16 22:18:11'),
(2,'AST-HST-02','Alimak Twin-Cage Construction Passenger & Material Hoist (2-Ton)','Material Hoist',1,1200.00,890.00,'OPERATIONAL','2026-10-16 22:18:11','2026-10-16 22:18:11'),
(3,'AST-GEN-01','Cummins 250kVA Silent Soundproof Diesel Generator','Diesel Generator',1,1800.00,2150.00,'OPERATIONAL','2026-10-16 22:18:11','2026-10-16 22:18:11'),
(4,'AST-EXC-03','Sany SY215C Hydraulic Heavy Crawler Excavator','Excavator',2,3500.00,3410.00,'MAINTENANCE_REQUIRED','2026-10-16 22:18:11','2026-10-16 22:18:11');

/*Table structure for table `con_concrete_cube_tests` */

DROP TABLE IF EXISTS `con_concrete_cube_tests`;

CREATE TABLE `con_concrete_cube_tests` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `tower_id` bigint(20) DEFAULT NULL,
  `structural_element` varchar(128) NOT NULL,
  `casting_date` date NOT NULL,
  `design_compressive_strength_psi` int(11) NOT NULL,
  `concrete_grade` varchar(32) NOT NULL,
  `batching_plant_name` varchar(128) NOT NULL,
  `slump_test_mm` int(11) NOT NULL,
  `day7_testing_date` date DEFAULT NULL,
  `day7_strength_psi` int(11) DEFAULT NULL,
  `day14_testing_date` date DEFAULT NULL,
  `day14_strength_psi` int(11) DEFAULT NULL,
  `day28_testing_date` date DEFAULT NULL,
  `day28_strength_psi` int(11) DEFAULT NULL,
  `test_verdict` varchar(32) NOT NULL,
  `lab_test_report_url` varchar(255) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_con_concrete_cube_tests_test_verdict` (`test_verdict`),
  KEY `ix_con_concrete_cube_tests_project_id` (`project_id`),
  KEY `ix_con_concrete_cube_tests_casting_date` (`casting_date`),
  KEY `ix_con_concrete_cube_tests_tower_id` (`tower_id`),
  CONSTRAINT `con_concrete_cube_tests_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`),
  CONSTRAINT `con_concrete_cube_tests_ibfk_2` FOREIGN KEY (`tower_id`) REFERENCES `prj_towers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `con_concrete_cube_tests` */

insert  into `con_concrete_cube_tests`(`id`,`project_id`,`tower_id`,`structural_element`,`casting_date`,`design_compressive_strength_psi`,`concrete_grade`,`batching_plant_name`,`slump_test_mm`,`day7_testing_date`,`day7_strength_psi`,`day14_testing_date`,`day14_strength_psi`,`day28_testing_date`,`day28_strength_psi`,`test_verdict`,`lab_test_report_url`,`remarks`,`created_at`,`updated_at`) values 
(1,1,1,'Column C1-C8 (4th Floor)','2026-09-18',4000,'M25','Mir Ready-Mix Concrete Plant (Tejgaon)',120,'2026-09-25',2850,'2026-10-02',3650,'2026-10-16',4250,'PASSED','assets/reports/cube_test_c1_c8.pdf','Crushing test exceeds 4000 psi design strength (4250 psi achieved @ 28 days - 106% capacity).','2026-10-16 22:18:09','2026-10-16 22:18:09'),
(2,1,1,'Shear Wall SW-2 (4th Floor)','2026-10-09',4500,'M30','Crown Cement RMC (Aminbazar)',115,'2026-10-16',3150,NULL,NULL,NULL,NULL,'PENDING',NULL,'7-day test 3150 psi (70% achieved). 14-day and 28-day crushing awaited.','2026-10-16 22:18:09','2026-10-16 22:18:09');

/*Table structure for table `con_contractors` */

DROP TABLE IF EXISTS `con_contractors`;

CREATE TABLE `con_contractors` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `contractor_code` varchar(32) NOT NULL,
  `company_name` varchar(191) NOT NULL,
  `trade_specialization` varchar(64) NOT NULL,
  `contact_person` varchar(128) NOT NULL,
  `primary_phone` varchar(32) NOT NULL,
  `tin_number` varchar(64) DEFAULT NULL,
  `bin_number` varchar(64) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_con_contractors_contractor_code` (`contractor_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `con_contractors` */

insert  into `con_contractors`(`id`,`contractor_code`,`company_name`,`trade_specialization`,`contact_person`,`primary_phone`,`tin_number`,`bin_number`,`is_active`,`created_at`) values 
(1,'CONT-0001','M/S Standard Civil Builders & Engineering','CIVIL_STRUCTURE','Alhaj Mokbul Hossain','+8801711889900','128892109212','001882910-0101',1,'2026-10-16 22:18:09'),
(2,'CONT-0002','Dhaka Steel & Rod Binding Works','ROD_BINDING','Md. Shahidul Islam','+8801819223344','218892109333','002991821-0202',1,'2026-10-16 22:18:09'),
(3,'CONT-0003','Bengal Electromechanical Engineering','ELECTRICAL','Engr. Faruq Hasan','+8801911445566','334455667788','003882711-0303',1,'2026-10-16 22:18:09');

/*Table structure for table `con_dpr_reports` */

DROP TABLE IF EXISTS `con_dpr_reports`;

CREATE TABLE `con_dpr_reports` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `tower_id` bigint(20) DEFAULT NULL,
  `report_date` date NOT NULL,
  `weather_condition_id` varchar(32) NOT NULL,
  `site_engineer_id` bigint(20) DEFAULT NULL,
  `structural_activity_summary` text NOT NULL,
  `concrete_casting_cft` decimal(12,2) NOT NULL,
  `steel_rod_consumed_mt` decimal(10,3) NOT NULL,
  `cement_consumed_bags` int(11) NOT NULL,
  `total_workers_onsite` int(11) NOT NULL,
  `status` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `site_engineer_id` (`site_engineer_id`),
  KEY `ix_con_dpr_reports_report_date` (`report_date`),
  KEY `ix_con_dpr_reports_tower_id` (`tower_id`),
  KEY `ix_con_dpr_reports_status` (`status`),
  KEY `ix_con_dpr_reports_project_id` (`project_id`),
  CONSTRAINT `con_dpr_reports_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`),
  CONSTRAINT `con_dpr_reports_ibfk_2` FOREIGN KEY (`tower_id`) REFERENCES `prj_towers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `con_dpr_reports_ibfk_3` FOREIGN KEY (`site_engineer_id`) REFERENCES `sys_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `con_dpr_reports` */

insert  into `con_dpr_reports`(`id`,`project_id`,`tower_id`,`report_date`,`weather_condition_id`,`site_engineer_id`,`structural_activity_summary`,`concrete_casting_cft`,`steel_rod_consumed_mt`,`cement_consumed_bags`,`total_workers_onsite`,`status`,`created_at`,`updated_at`) values 
(1,1,1,'2026-10-15','SUNNY',6,'Casting of 4th Floor Main Columns (C1-C16) and Shear Wall SW-1. Slump test 120mm verified with M25 concrete grade.',2850.00,18.450,680,48,'APPROVED_BY_PM','2026-10-16 22:18:09','2026-10-16 22:18:09');

/*Table structure for table `con_labor_muster` */

DROP TABLE IF EXISTS `con_labor_muster`;

CREATE TABLE `con_labor_muster` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `dpr_id` bigint(20) NOT NULL,
  `contractor_id` bigint(20) DEFAULT NULL,
  `trade_category` varchar(64) NOT NULL,
  `worker_count` int(11) NOT NULL,
  `daily_wage_rate` decimal(10,2) NOT NULL,
  `total_wage` decimal(12,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `contractor_id` (`contractor_id`),
  KEY `ix_con_labor_muster_dpr_id` (`dpr_id`),
  CONSTRAINT `con_labor_muster_ibfk_1` FOREIGN KEY (`dpr_id`) REFERENCES `con_dpr_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `con_labor_muster_ibfk_2` FOREIGN KEY (`contractor_id`) REFERENCES `con_contractors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `con_labor_muster` */

insert  into `con_labor_muster`(`id`,`dpr_id`,`contractor_id`,`trade_category`,`worker_count`,`daily_wage_rate`,`total_wage`,`created_at`) values 
(1,1,1,'Mason',14,950.00,13300.00,'2026-10-16 22:18:09'),
(2,1,2,'Rod-binder',18,900.00,16200.00,'2026-10-16 22:18:09'),
(3,1,1,'Carpenter',10,900.00,9000.00,'2026-10-16 22:18:09'),
(4,1,1,'Helper',6,650.00,3900.00,'2026-10-16 22:18:09');

/*Table structure for table `con_ra_bills` */

DROP TABLE IF EXISTS `con_ra_bills`;

CREATE TABLE `con_ra_bills` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `work_order_id` bigint(20) NOT NULL,
  `ra_bill_number` varchar(64) NOT NULL,
  `bill_date` date NOT NULL,
  `gross_work_certified_amount` decimal(14,2) NOT NULL,
  `retention_money_deducted` decimal(14,2) NOT NULL,
  `advance_recovery_deducted` decimal(14,2) NOT NULL,
  `tds_withheld_amount` decimal(14,2) NOT NULL,
  `vds_withheld_amount` decimal(14,2) NOT NULL,
  `net_payable_amount` decimal(14,2) NOT NULL,
  `status` varchar(32) NOT NULL,
  `accounts_journal_voucher_ref` varchar(64) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_con_ra_bills_status` (`status`),
  KEY `ix_con_ra_bills_work_order_id` (`work_order_id`),
  CONSTRAINT `con_ra_bills_ibfk_1` FOREIGN KEY (`work_order_id`) REFERENCES `con_work_orders` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `con_ra_bills` */

insert  into `con_ra_bills`(`id`,`work_order_id`,`ra_bill_number`,`bill_date`,`gross_work_certified_amount`,`retention_money_deducted`,`advance_recovery_deducted`,`tds_withheld_amount`,`vds_withheld_amount`,`net_payable_amount`,`status`,`accounts_journal_voucher_ref`,`remarks`,`created_at`,`updated_at`) values 
(1,1,'RA-BILL-01','2026-10-13',4500000.00,225000.00,200000.00,225000.00,225000.00,3625000.00,'ACCOUNTS_VOUCHER_POSTED','JV-2026-0088','Certified 4th floor columns by Project Director. 5% Retention and statutory TDS/VDS withheld.','2026-10-16 22:18:09','2026-10-16 22:18:09');

/*Table structure for table `con_safety_ncrs` */

DROP TABLE IF EXISTS `con_safety_ncrs`;

CREATE TABLE `con_safety_ncrs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `ncr_number` varchar(64) NOT NULL,
  `category` varchar(64) NOT NULL,
  `severity` varchar(32) NOT NULL,
  `description` text DEFAULT NULL,
  `location_details` varchar(191) DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `assigned_contractor_id` bigint(20) DEFAULT NULL,
  `rectification_deadline` date NOT NULL,
  `status` varchar(32) NOT NULL,
  `rectification_notes` text DEFAULT NULL,
  `rectification_photo_url` varchar(255) DEFAULT NULL,
  `closed_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_con_safety_ncrs_ncr_number` (`ncr_number`),
  KEY `ix_con_safety_ncrs_assigned_contractor_id` (`assigned_contractor_id`),
  KEY `ix_con_safety_ncrs_status` (`status`),
  KEY `ix_con_safety_ncrs_project_id` (`project_id`),
  CONSTRAINT `con_safety_ncrs_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`),
  CONSTRAINT `con_safety_ncrs_ibfk_2` FOREIGN KEY (`assigned_contractor_id`) REFERENCES `con_contractors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `con_safety_ncrs` */

insert  into `con_safety_ncrs`(`id`,`project_id`,`ncr_number`,`category`,`severity`,`description`,`location_details`,`photo_url`,`assigned_contractor_id`,`rectification_deadline`,`status`,`rectification_notes`,`rectification_photo_url`,`closed_date`,`created_at`,`updated_at`) values 
(1,1,'NCR-PRJ01-2026-001','Structural Defect','High','Minor honeycombing observed on outer face of Column C-12 between Floor 3 and 4 after deshutting.','Tower A - 3rd Floor Grid 3-C','assets/images/common/honeycomb_sample.jpg',1,'2026-10-19','Open','Requires polymer modified non-shrink epoxy grout injection under QC supervision.',NULL,NULL,'2026-10-16 22:18:09','2026-10-16 22:18:09'),
(2,1,'NCR-PRJ01-2026-002','Safety Violation','Critical','Workers working at Floor 5 external scaffolding without safety harnesses and safety nets.','East Facade Scaffolding - Floor 5','assets/images/common/safety_violation.jpg',1,'2026-10-15','Verified_Closed','Full safety harness lifeline installed. Safety briefing conducted.',NULL,'2026-10-16','2026-10-16 22:18:09','2026-10-16 22:18:09');

/*Table structure for table `con_work_orders` */

DROP TABLE IF EXISTS `con_work_orders`;

CREATE TABLE `con_work_orders` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `contractor_id` bigint(20) NOT NULL,
  `work_order_no` varchar(64) NOT NULL,
  `contract_type` varchar(64) NOT NULL,
  `total_contract_value` decimal(14,2) NOT NULL,
  `retention_money_percent` decimal(5,2) NOT NULL,
  `defect_liability_months` int(11) NOT NULL,
  `status` varchar(32) NOT NULL,
  `scope_of_work` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_con_work_orders_work_order_no` (`work_order_no`),
  KEY `ix_con_work_orders_project_id` (`project_id`),
  KEY `ix_con_work_orders_contractor_id` (`contractor_id`),
  CONSTRAINT `con_work_orders_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`),
  CONSTRAINT `con_work_orders_ibfk_2` FOREIGN KEY (`contractor_id`) REFERENCES `con_contractors` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `con_work_orders` */

insert  into `con_work_orders`(`id`,`project_id`,`contractor_id`,`work_order_no`,`contract_type`,`total_contract_value`,`retention_money_percent`,`defect_liability_months`,`status`,`scope_of_work`,`created_at`,`updated_at`) values 
(1,1,1,'WO-2026-0001','CIVIL_SUPERSTRUCTURE',45000000.00,5.00,12,'ACTIVE','Complete RCC Super-structure from Ground to 18th Floor including formwork shuttering, rebar binding, and concrete casting.','2026-10-16 22:18:09','2026-10-16 22:18:09');

/*Table structure for table `crm_customers` */

DROP TABLE IF EXISTS `crm_customers`;

CREATE TABLE `crm_customers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `customer_code` varchar(64) NOT NULL,
  `full_name_en` varchar(191) NOT NULL,
  `full_name_bn` varchar(191) DEFAULT NULL,
  `father_husband_name` varchar(191) DEFAULT NULL,
  `mother_name` varchar(191) DEFAULT NULL,
  `nid_number` varchar(64) DEFAULT NULL,
  `tin_number` varchar(64) DEFAULT NULL,
  `primary_phone` varchar(32) NOT NULL,
  `email` varchar(128) DEFAULT NULL,
  `present_address` text DEFAULT NULL,
  `permanent_address` text DEFAULT NULL,
  `is_nrb` tinyint(1) NOT NULL,
  `passport_number` varchar(64) DEFAULT NULL,
  `profile_photo_url` varchar(255) DEFAULT NULL,
  `nid_scan_front_url` varchar(255) DEFAULT NULL,
  `nid_scan_back_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_crm_customers_customer_code` (`customer_code`),
  UNIQUE KEY `ix_crm_customers_nid_number` (`nid_number`),
  KEY `ix_crm_customers_is_nrb` (`is_nrb`),
  KEY `ix_crm_customers_primary_phone` (`primary_phone`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `crm_customers` */

insert  into `crm_customers`(`id`,`customer_code`,`full_name_en`,`full_name_bn`,`father_husband_name`,`mother_name`,`nid_number`,`tin_number`,`primary_phone`,`email`,`present_address`,`permanent_address`,`is_nrb`,`passport_number`,`profile_photo_url`,`nid_scan_front_url`,`nid_scan_back_url`,`created_at`,`updated_at`) values 
(1,'CUST-2026-0001','Mrs. Sultana Parveen','মোসাঃ সুলতানা পারভীন','Late Golam Mostafa','Begum Rokeya Banu','19822695500001234','789012345678','+8801612334455','sultana.parveen@gmail.com','House 42, Road 11, Block D, Banani, Dhaka-1213','Village: Alipur, PO: Faridpur Sadar, District: Faridpur',0,NULL,'assets/images/auth/avatar-default.png',NULL,NULL,'2026-10-16 22:18:08','2026-10-16 22:18:08'),
(2,'CUST-2026-0002','Engr. Kazi Masudul Alam','প্রকৌঃ কাজী মাসুদুল আলম','Kazi Shamsul Alam','Nazma Begum','19752695500009876','654321098765','+8801713009988','masudul.alam@exxonmobil.com','Al-Reem Tower, Corniche, Doha, Qatar','House 15, Road 4, Sector 7, Uttara, Dhaka-1230',1,'BW0982341','assets/images/auth/avatar-default.png',NULL,NULL,'2026-10-16 22:18:09','2026-10-16 22:18:09'),
(3,'CUST-2026-0003','Dr. Shahriar Hossain','ডাঃ শাহরিয়ার হোসেন','Prof. Dr. Anwar Hossain','Suraiya Begum','19852695500004455','543210987654','+8801715443322','shahriar.hossain@bsmmu.edu.bd','Flat 6B, Concord Lake City, Khilkhet, Dhaka','College Road, Mymensingh Sadar, Mymensingh',0,NULL,'assets/images/auth/avatar-default.png',NULL,NULL,'2026-10-16 22:18:09','2026-10-16 22:18:09'),
(4,'CUST-2026-0004','Mr. Anisur Rahman','জনাব আনিসুর রহমান','Abdul Jalil','Amena Khatun','19682695500008899','432109876543','+8801817112233','anisur.rahman@transcombd.com','House 12, Road 7, Gulshan-1, Dhaka-1212','Village: Joynagar, PS: Shibpur, Narsingdi',0,NULL,'assets/images/auth/avatar-default.png',NULL,NULL,'2026-10-16 22:18:09','2026-10-16 22:18:09');

/*Table structure for table `crm_lead_activities` */

DROP TABLE IF EXISTS `crm_lead_activities`;

CREATE TABLE `crm_lead_activities` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `lead_id` bigint(20) NOT NULL,
  `sales_rep_id` bigint(20) DEFAULT NULL,
  `activity_type` varchar(32) NOT NULL,
  `activity_summary` varchar(255) NOT NULL,
  `scheduled_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `outcome` varchar(64) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `sales_rep_id` (`sales_rep_id`),
  KEY `ix_crm_lead_activities_lead_id` (`lead_id`),
  CONSTRAINT `crm_lead_activities_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `crm_leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `crm_lead_activities_ibfk_2` FOREIGN KEY (`sales_rep_id`) REFERENCES `sys_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `crm_lead_activities` */

insert  into `crm_lead_activities`(`id`,`lead_id`,`sales_rep_id`,`activity_type`,`activity_summary`,`scheduled_at`,`completed_at`,`outcome`,`created_at`) values 
(1,1,1,'PHONE_CALL','Outbound intro call: Customer asked for project e-brochure over WhatsApp.',NULL,NULL,'INTERESTED','2026-10-16 22:18:09'),
(2,2,1,'WHATSAPP','Shared floor plan diagrams and architectural 3D elevation renders.',NULL,NULL,'PENDING_REVIEW','2026-10-16 22:18:09'),
(3,3,1,'SITE_VISIT','Accompanied client to Banani site. Inspected sample mock floor.',NULL,NULL,'VISITED_POSITIVE','2026-10-16 22:18:09'),
(4,4,1,'OFFICE_MEETING','Negotiation meeting in Head Office Boardroom on installment tenure.',NULL,NULL,'AGREED_ON_TERMS','2026-10-16 22:18:09'),
(5,5,1,'STAGE_CHANGE','Converted to verified buyer. Booking earnest money token finalized.',NULL,NULL,'BOOKED','2026-10-16 22:18:09');

/*Table structure for table `crm_leads` */

DROP TABLE IF EXISTS `crm_leads`;

CREATE TABLE `crm_leads` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) DEFAULT NULL,
  `lead_source_id` varchar(32) NOT NULL,
  `campaign_name` varchar(128) DEFAULT NULL,
  `lead_name` varchar(191) NOT NULL,
  `primary_phone` varchar(32) NOT NULL,
  `email` varchar(128) DEFAULT NULL,
  `interested_project_id` bigint(20) DEFAULT NULL,
  `budget_range_min` decimal(14,2) DEFAULT NULL,
  `budget_range_max` decimal(14,2) DEFAULT NULL,
  `assigned_sales_rep_id` bigint(20) DEFAULT NULL,
  `lead_stage` varchar(32) NOT NULL,
  `lead_score` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_crm_leads_lead_stage` (`lead_stage`),
  KEY `ix_crm_leads_assigned_sales_rep_id` (`assigned_sales_rep_id`),
  KEY `ix_crm_leads_interested_project_id` (`interested_project_id`),
  KEY `ix_crm_leads_primary_phone` (`primary_phone`),
  KEY `ix_crm_leads_organization_id` (`organization_id`),
  KEY `ix_crm_leads_lead_source_id` (`lead_source_id`),
  CONSTRAINT `crm_leads_ibfk_1` FOREIGN KEY (`interested_project_id`) REFERENCES `prj_projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `crm_leads_ibfk_2` FOREIGN KEY (`assigned_sales_rep_id`) REFERENCES `sys_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `crm_leads` */

insert  into `crm_leads`(`id`,`organization_id`,`lead_source_id`,`campaign_name`,`lead_name`,`primary_phone`,`email`,`interested_project_id`,`budget_range_min`,`budget_range_max`,`assigned_sales_rep_id`,`lead_stage`,`lead_score`,`notes`,`created_at`,`updated_at`) values 
(1,NULL,'FACEBOOK_ADS','Gulshan-Heights-Q4-Luxury','Barrister Rafiqul Islam','+8801711223344','rafiqul.islam@supremecourt.gov.bd',1,25000000.00,35000000.00,1,'NEW',85,'Inquired via Facebook Lead Gen Form for 4-Bed Duplex overlooking Gulshan Lake.','2026-10-16 22:18:08','2026-10-16 22:18:08'),
(2,NULL,'WHATSAPP','Direct-Inbound-WhatsApp','Dr. Shireen Akhter','+8801819988776','shireen.akhter@squarehospital.com',1,18000000.00,22000000.00,1,'CONTACTED',75,'Initial phone discussion completed. Shared South-facing floor layout brochure.','2026-10-16 22:18:08','2026-10-16 22:18:08'),
(3,NULL,'WALK_IN','Corporate-Headquarters-Walkin','Engr. Maksudul Haque','+8801914556677','maksudul.haque@petrobangla.gov.bd',2,14000000.00,18000000.00,1,'VISITED',90,'Completed physical site visit on Saturday with family. Impressed by Banani Road 11 frontage.','2026-10-16 22:18:08','2026-10-16 22:18:08'),
(4,NULL,'BROKER','Uttara-Elite-Channel-Partner','Mr. Tariq Ahmed Chowdhury','+8801730445566','tariq.ahmed@bproperty-partner.com',2,15000000.00,19000000.00,1,'NEGOTIATION',95,'Drafting installment schedule. Negotiating 2.5% volume purchase discount.','2026-10-16 22:18:08','2026-10-16 22:18:08'),
(5,NULL,'WEB_FORM','Website-Inquiry-Portal','Mrs. Sultana Parveen','+8801612334455','sultana.parveen@gmail.com',1,30000000.00,40000000.00,1,'BOOKED',100,'Earnest money token received BDT 1,000,000 via Pay Order. Allotted Unit T1-08A.','2026-10-16 22:18:08','2026-10-16 22:18:08'),
(6,NULL,'REFERRAL','Existing-Client-Referral','Mohammad Kamal Hossain','+8801755112233','kamal.hossain@yahoo.com',1,8000000.00,10000000.00,1,'DROPPED',20,'Budget mismatch. Customer looking for sub-10M apartments outside Gulshan.','2026-10-16 22:18:08','2026-10-16 22:18:08');

/*Table structure for table `crm_nominees` */

DROP TABLE IF EXISTS `crm_nominees`;

CREATE TABLE `crm_nominees` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `customer_id` bigint(20) NOT NULL,
  `nominee_name` varchar(191) NOT NULL,
  `relation_type` varchar(64) NOT NULL,
  `nid_number` varchar(64) DEFAULT NULL,
  `share_percentage` decimal(5,2) NOT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_crm_nominees_customer_id` (`customer_id`),
  CONSTRAINT `crm_nominees_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `crm_customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `crm_nominees` */

insert  into `crm_nominees`(`id`,`customer_id`,`nominee_name`,`relation_type`,`nid_number`,`share_percentage`,`photo_url`,`created_at`) values 
(1,1,'Tanvir Mostafa','SON','19992695500005678',60.00,NULL,'2026-10-16 22:18:09'),
(2,1,'Tahmina Mostafa','DAUGHTER','20032695500009999',40.00,NULL,'2026-10-16 22:18:09'),
(3,2,'Sabrina Masud','SPOUSE','19802695500004321',100.00,NULL,'2026-10-16 22:18:09'),
(4,3,'Dr. Farhana Yasmin','SPOUSE','19882695500007788',50.00,NULL,'2026-10-16 22:18:09'),
(5,3,'Abrar Hossain','SON','20122695500003322',50.00,NULL,'2026-10-16 22:18:09'),
(6,4,'Roksana Rahman','SPOUSE','19722695500006677',100.00,NULL,'2026-10-16 22:18:09');

/*Table structure for table `hnd_dlp_tickets` */

DROP TABLE IF EXISTS `hnd_dlp_tickets`;

CREATE TABLE `hnd_dlp_tickets` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `unit_id` bigint(20) NOT NULL,
  `ticket_category` varchar(64) NOT NULL,
  `issue_description` text NOT NULL,
  `reported_date` date NOT NULL,
  `rectification_deadline` date NOT NULL,
  `status` varchar(32) NOT NULL,
  `rectified_date` date DEFAULT NULL,
  `rectification_notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_hnd_dlp_tickets_unit_id` (`unit_id`),
  KEY `ix_hnd_dlp_tickets_status` (`status`),
  CONSTRAINT `hnd_dlp_tickets_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `inv_units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `hnd_dlp_tickets` */

insert  into `hnd_dlp_tickets`(`id`,`unit_id`,`ticket_category`,`issue_description`,`reported_date`,`rectification_deadline`,`status`,`rectified_date`,`rectification_notes`,`created_at`,`updated_at`) values 
(1,1,'Plumbing','Concealed CPVC hot water pipe slow drip beneath master bathroom vanity unit.','2026-10-12','2026-10-18','IN_PROGRESS',NULL,'Plumber opened vanity panel. Replacing brass nipple elbow.','2026-10-16 22:18:11','2026-10-16 22:18:11'),
(2,1,'Electrical','Master bedroom main dual-gang rocker switch plate loose fit.','2026-10-06','2026-10-11','RESOLVED','2026-10-10','Schneider electric modular box re-anchored and tested.','2026-10-16 22:18:11','2026-10-16 22:18:11'),
(3,1,'Tiles','Hollow sound detected under 2 floor tiles in dining area corner.','2026-10-15','2026-10-21','OPEN',NULL,NULL,'2026-10-16 22:18:11','2026-10-16 22:18:11'),
(4,1,'Doors','Burma Teak entrance door rub against bottom brass threshold plate.','2026-10-08','2026-10-13','CLOSED','2026-10-12','Hinges planed and lubricated. Smooth closure verified by client.','2026-10-16 22:18:11','2026-10-16 22:18:11');

/*Table structure for table `hnd_handover_inspections` */

DROP TABLE IF EXISTS `hnd_handover_inspections`;

CREATE TABLE `hnd_handover_inspections` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `booking_id` bigint(20) NOT NULL,
  `unit_id` bigint(20) NOT NULL,
  `site_engineer_id` bigint(20) NOT NULL,
  `inspection_date` date NOT NULL,
  `all_financial_dues_cleared` tinyint(1) NOT NULL,
  `possession_letter_number` varchar(64) DEFAULT NULL,
  `possession_handover_date` date DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_hnd_handover_inspections_possession_letter_number` (`possession_letter_number`),
  KEY `site_engineer_id` (`site_engineer_id`),
  KEY `ix_hnd_handover_inspections_unit_id` (`unit_id`),
  KEY `ix_hnd_handover_inspections_status` (`status`),
  KEY `ix_hnd_handover_inspections_booking_id` (`booking_id`),
  CONSTRAINT `hnd_handover_inspections_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `sls_bookings` (`id`),
  CONSTRAINT `hnd_handover_inspections_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `inv_units` (`id`),
  CONSTRAINT `hnd_handover_inspections_ibfk_3` FOREIGN KEY (`site_engineer_id`) REFERENCES `sys_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `hnd_handover_inspections` */

insert  into `hnd_handover_inspections`(`id`,`booking_id`,`unit_id`,`site_engineer_id`,`inspection_date`,`all_financial_dues_cleared`,`possession_letter_number`,`possession_handover_date`,`status`,`notes`,`created_at`,`updated_at`) values 
(1,5,5,6,'2026-10-14',1,'POSS-LET-2026-0012','2026-10-16','POSSESSION_HANDED_OVER','Keys, appliance warranties, and sub-meter electric cards handed over to customer.','2026-10-16 22:18:11','2026-10-16 22:18:11');

/*Table structure for table `hnd_owners_associations` */

DROP TABLE IF EXISTS `hnd_owners_associations`;

CREATE TABLE `hnd_owners_associations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `association_name` varchar(128) NOT NULL,
  `handover_date` date NOT NULL,
  `sinking_fund_transferred_bdt` decimal(14,2) NOT NULL,
  `monthly_service_charge_per_flat` decimal(10,2) NOT NULL,
  `president_name` varchar(100) DEFAULT NULL,
  `secretary_name` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(32) DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_hnd_owners_associations_project_id` (`project_id`),
  CONSTRAINT `hnd_owners_associations_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `hnd_owners_associations` */

insert  into `hnd_owners_associations`(`id`,`project_id`,`association_name`,`handover_date`,`sinking_fund_transferred_bdt`,`monthly_service_charge_per_flat`,`president_name`,`secretary_name`,`contact_phone`,`status`,`created_at`,`updated_at`) values 
(1,1,'The Grand Emerald Flat Owners Welfare Committee (গ্র্যান্ড এমারেল্ড ফ্ল্যাট মালিক কল্যাণ সমিতি)','2026-09-16',2500000.00,6500.00,'Dr. Shireen Akhter','Engr. Maksudul Haque','+8801711223399','FORMED','2026-10-16 22:18:11','2026-10-16 22:18:11');

/*Table structure for table `inv_parking_bays` */

DROP TABLE IF EXISTS `inv_parking_bays`;

CREATE TABLE `inv_parking_bays` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `basement_level` varchar(16) NOT NULL,
  `bay_number` varchar(32) NOT NULL,
  `parking_type_id` varchar(32) NOT NULL,
  `price` decimal(14,2) NOT NULL,
  `is_allocated` tinyint(1) NOT NULL,
  `allocated_to_unit_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_inv_parking_bays_allocated_to_unit_id` (`allocated_to_unit_id`),
  KEY `ix_inv_parking_bays_bay_number` (`bay_number`),
  KEY `ix_inv_parking_bays_is_allocated` (`is_allocated`),
  KEY `ix_inv_parking_bays_project_id` (`project_id`),
  CONSTRAINT `inv_parking_bays_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inv_parking_bays_ibfk_2` FOREIGN KEY (`allocated_to_unit_id`) REFERENCES `inv_units` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `inv_parking_bays` */

insert  into `inv_parking_bays`(`id`,`project_id`,`basement_level`,`bay_number`,`parking_type_id`,`price`,`is_allocated`,`allocated_to_unit_id`,`created_at`,`updated_at`) values 
(1,1,'B1','P-B1-01','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(2,1,'B1','P-B1-02','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(3,1,'B1','P-B1-03','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(4,1,'B1','P-B1-04','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(5,1,'B1','P-B1-05','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(6,1,'B1','P-B1-06','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(7,1,'B1','P-B1-07','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(8,1,'B1','P-B1-08','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(9,1,'B1','P-B1-09','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(10,1,'B1','P-B1-10','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(11,1,'B1','P-B1-11','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(12,1,'B1','P-B1-12','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(13,1,'B1','P-B1-13','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(14,1,'B1','P-B1-14','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(15,1,'B1','P-B1-15','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(16,1,'B1','P-B1-16','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(17,1,'B1','P-B1-17','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(18,1,'B1','P-B1-18','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(19,1,'B1','P-B1-19','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(20,1,'B1','P-B1-20','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(21,1,'B1','P-B1-21','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(22,1,'B1','P-B1-22','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(23,1,'B1','P-B1-23','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(24,1,'B1','P-B1-24','SINGLE_CAR',600000.00,0,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56');

/*Table structure for table `inv_units` */

DROP TABLE IF EXISTS `inv_units`;

CREATE TABLE `inv_units` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `tower_id` bigint(20) NOT NULL,
  `floor_number` int(11) NOT NULL,
  `unit_number` varchar(32) NOT NULL,
  `unit_type_id` varchar(32) NOT NULL,
  `facing_id` varchar(32) NOT NULL,
  `net_carpet_area_sqft` decimal(10,2) NOT NULL,
  `gross_saleable_area_sqft` decimal(10,2) NOT NULL,
  `base_rate_per_sqft` decimal(12,2) NOT NULL,
  `floor_escalation_rate` decimal(10,2) NOT NULL,
  `facing_premium_rate` decimal(10,2) NOT NULL,
  `effective_rate_per_sqft` decimal(12,2) NOT NULL,
  `total_unit_price` decimal(16,2) NOT NULL,
  `status_id` varchar(32) NOT NULL,
  `is_landowner_share` tinyint(1) NOT NULL,
  `current_locked_by_user_id` bigint(20) DEFAULT NULL,
  `current_locked_by_user_name` varchar(128) DEFAULT NULL,
  `lock_expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_inv_units_unit_type_id` (`unit_type_id`),
  KEY `ix_inv_units_is_landowner_share` (`is_landowner_share`),
  KEY `ix_inv_units_project_id` (`project_id`),
  KEY `ix_inv_units_unit_number` (`unit_number`),
  KEY `ix_inv_units_status_id` (`status_id`),
  KEY `ix_inv_units_tower_id` (`tower_id`),
  KEY `ix_inv_units_facing_id` (`facing_id`),
  KEY `ix_inv_units_floor_number` (`floor_number`),
  CONSTRAINT `inv_units_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `inv_units_ibfk_2` FOREIGN KEY (`tower_id`) REFERENCES `prj_towers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `inv_units` */

insert  into `inv_units`(`id`,`project_id`,`tower_id`,`floor_number`,`unit_number`,`unit_type_id`,`facing_id`,`net_carpet_area_sqft`,`gross_saleable_area_sqft`,`base_rate_per_sqft`,`floor_escalation_rate`,`facing_premium_rate`,`effective_rate_per_sqft`,`total_unit_price`,`status_id`,`is_landowner_share`,`current_locked_by_user_id`,`current_locked_by_user_name`,`lock_expires_at`,`created_at`,`updated_at`) values 
(1,1,1,3,'3A','TYPE_4BHK','LAKE_VIEW',2450.00,3150.00,14500.00,0.00,750.00,15250.00,48037500.00,'BOOKED',1,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 22:18:09'),
(2,1,1,3,'3B','TYPE_3BHK','SOUTH_FACING',1950.00,2480.00,14500.00,0.00,500.00,15000.00,37200000.00,'BOOKED',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 22:18:09'),
(3,1,1,3,'3C','TYPE_3BHK','CORNER_PLOT',1820.00,2350.00,14500.00,0.00,400.00,14900.00,35015000.00,'BOOKED',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 22:18:09'),
(4,1,1,3,'3D','TYPE_3BHK','ROAD_FACING',1780.00,2250.00,14500.00,0.00,200.00,14700.00,33075000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(5,1,1,4,'4A','TYPE_4BHK','LAKE_VIEW',2450.00,3150.00,14500.00,150.00,750.00,15400.00,48510000.00,'BOOKED',1,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 22:18:09'),
(6,1,1,4,'4B','TYPE_3BHK','SOUTH_FACING',1950.00,2480.00,14500.00,150.00,500.00,15150.00,37572000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(7,1,1,4,'4C','TYPE_3BHK','CORNER_PLOT',1820.00,2350.00,14500.00,150.00,400.00,15050.00,35367500.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(8,1,1,4,'4D','TYPE_3BHK','ROAD_FACING',1780.00,2250.00,14500.00,150.00,200.00,14850.00,33412500.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(9,1,1,5,'5A','TYPE_4BHK','LAKE_VIEW',2450.00,3150.00,14500.00,300.00,750.00,15550.00,48982500.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(10,1,1,5,'5B','TYPE_3BHK','SOUTH_FACING',1950.00,2480.00,14500.00,300.00,500.00,15300.00,37944000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(11,1,1,5,'5C','TYPE_3BHK','CORNER_PLOT',1820.00,2350.00,14500.00,300.00,400.00,15200.00,35720000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(12,1,1,5,'5D','TYPE_3BHK','ROAD_FACING',1780.00,2250.00,14500.00,300.00,200.00,15000.00,33750000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(13,1,1,6,'6A','TYPE_4BHK','LAKE_VIEW',2450.00,3150.00,14500.00,450.00,750.00,15700.00,49455000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(14,1,1,6,'6B','TYPE_3BHK','SOUTH_FACING',1950.00,2480.00,14500.00,450.00,500.00,15450.00,38316000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(15,1,1,6,'6C','TYPE_3BHK','CORNER_PLOT',1820.00,2350.00,14500.00,450.00,400.00,15350.00,36072500.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(16,1,1,6,'6D','TYPE_3BHK','ROAD_FACING',1780.00,2250.00,14500.00,450.00,200.00,15150.00,34087500.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(17,1,1,7,'7A','TYPE_4BHK','LAKE_VIEW',2450.00,3150.00,14500.00,600.00,750.00,15850.00,49927500.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(18,1,1,7,'7B','TYPE_3BHK','SOUTH_FACING',1950.00,2480.00,14500.00,600.00,500.00,15600.00,38688000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(19,1,1,7,'7C','TYPE_3BHK','CORNER_PLOT',1820.00,2350.00,14500.00,600.00,400.00,15500.00,36425000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(20,1,1,7,'7D','TYPE_3BHK','ROAD_FACING',1780.00,2250.00,14500.00,600.00,200.00,15300.00,34425000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(21,1,1,8,'8A','TYPE_4BHK','LAKE_VIEW',2450.00,3150.00,14500.00,750.00,750.00,16000.00,50400000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(22,1,1,8,'8B','TYPE_3BHK','SOUTH_FACING',1950.00,2480.00,14500.00,750.00,500.00,15750.00,39060000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(23,1,1,8,'8C','TYPE_3BHK','CORNER_PLOT',1820.00,2350.00,14500.00,750.00,400.00,15650.00,36777500.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(24,1,1,8,'8D','TYPE_3BHK','ROAD_FACING',1780.00,2250.00,14500.00,750.00,200.00,15450.00,34762500.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(25,1,1,9,'9A','TYPE_4BHK','LAKE_VIEW',2450.00,3150.00,14500.00,900.00,750.00,16150.00,50872500.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(26,1,1,9,'9B','TYPE_3BHK','SOUTH_FACING',1950.00,2480.00,14500.00,900.00,500.00,15900.00,39432000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(27,1,1,9,'9C','TYPE_3BHK','CORNER_PLOT',1820.00,2350.00,14500.00,900.00,400.00,15800.00,37130000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(28,1,1,9,'9D','TYPE_3BHK','ROAD_FACING',1780.00,2250.00,14500.00,900.00,200.00,15600.00,35100000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(29,1,1,10,'10A','TYPE_4BHK','LAKE_VIEW',2450.00,3150.00,14500.00,1050.00,750.00,16300.00,51345000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(30,1,1,10,'10B','TYPE_3BHK','SOUTH_FACING',1950.00,2480.00,14500.00,1050.00,500.00,16050.00,39804000.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(31,1,1,10,'10C','TYPE_3BHK','CORNER_PLOT',1820.00,2350.00,14500.00,1050.00,400.00,15950.00,37482500.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56'),
(32,1,1,10,'10D','TYPE_3BHK','ROAD_FACING',1780.00,2250.00,14500.00,1050.00,200.00,15750.00,35437500.00,'AVAILABLE',0,NULL,NULL,NULL,'2026-10-16 21:18:56','2026-10-16 21:18:56');

/*Table structure for table `leg_court_cases` */

DROP TABLE IF EXISTS `leg_court_cases`;

CREATE TABLE `leg_court_cases` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) DEFAULT NULL,
  `case_type` varchar(64) NOT NULL,
  `case_number` varchar(64) NOT NULL,
  `concerned_court` varchar(128) NOT NULL,
  `plaintiff` varchar(128) NOT NULL,
  `defendant` varchar(128) NOT NULL,
  `appointed_advocate` varchar(128) NOT NULL,
  `next_hearing_date` date DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `case_summary` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_leg_court_cases_case_number` (`case_number`),
  KEY `ix_leg_court_cases_project_id` (`project_id`),
  KEY `ix_leg_court_cases_status` (`status`),
  KEY `ix_leg_court_cases_case_type` (`case_type`),
  CONSTRAINT `leg_court_cases_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `leg_court_cases` */

insert  into `leg_court_cases`(`id`,`project_id`,`case_type`,`case_number`,`concerned_court`,`plaintiff`,`defendant`,`appointed_advocate`,`next_hearing_date`,`status`,`case_summary`,`created_at`,`updated_at`) values 
(1,1,'Title Suit','Title Suit No. 142/2025','Joint District Judge 1st Court, Dhaka','Md. Abdul Jalil & Others','Apex Holdings Ltd & Landowners','Advocate Rafiqul Islam, Supreme Court Bar','2026-11-30','HEARING_ONGOING','Frivolous boundary wall injunction petition filed by adjacent plot owner. High Court vacation bench previously vacated ad-interim stay.','2026-10-16 22:18:11','2026-10-16 22:18:11'),
(2,1,'NI Act 138','CR Case No. 892/2026','Chief Metropolitan Magistrate (CMM) Court No. 4, Dhaka','Apex Holdings Ltd','Defaulting Commercial Buyer','Barrister Tanvir Ahmed','2026-11-05','HEARING_ONGOING','Statutory criminal proceeding u/s 138 of Negotiable Instruments Act 1881 for bounced Pay Order of BDT 4,500,000.','2026-10-16 22:18:11','2026-10-16 22:18:11');

/*Table structure for table `lnd_jv_agreements` */

DROP TABLE IF EXISTS `lnd_jv_agreements`;

CREATE TABLE `lnd_jv_agreements` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `land_bank_id` bigint(20) NOT NULL,
  `agreement_deed_no` varchar(128) NOT NULL,
  `landowner_share_percent` decimal(6,2) NOT NULL,
  `developer_share_percent` decimal(6,2) NOT NULL,
  `signing_money_total` decimal(16,2) NOT NULL,
  `tenure_months` int(11) NOT NULL,
  `signing_date` timestamp NULL DEFAULT NULL,
  `handover_commitment_date` timestamp NULL DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_lnd_jv_agreements_agreement_deed_no` (`agreement_deed_no`),
  KEY `ix_lnd_jv_agreements_land_bank_id` (`land_bank_id`),
  CONSTRAINT `lnd_jv_agreements_ibfk_1` FOREIGN KEY (`land_bank_id`) REFERENCES `lnd_land_banks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `lnd_jv_agreements` */

insert  into `lnd_jv_agreements`(`id`,`land_bank_id`,`agreement_deed_no`,`landowner_share_percent`,`developer_share_percent`,`signing_money_total`,`tenure_months`,`signing_date`,`handover_commitment_date`,`status`,`created_at`,`updated_at`) values 
(1,1,'DEED-DHK-2026-90412',45.00,55.00,50000000.00,42,NULL,NULL,'ACTIVE','2026-10-16 21:18:36','2026-10-16 21:18:36');

/*Table structure for table `lnd_jv_unit_allocations` */

DROP TABLE IF EXISTS `lnd_jv_unit_allocations`;

CREATE TABLE `lnd_jv_unit_allocations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `jv_agreement_id` bigint(20) NOT NULL,
  `unit_identifier` varchar(64) NOT NULL,
  `allocation_type` varchar(32) NOT NULL,
  `is_locked_for_sales` tinyint(1) NOT NULL,
  `allocation_notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_lnd_jv_unit_allocations_allocation_type` (`allocation_type`),
  KEY `ix_lnd_jv_unit_allocations_is_locked_for_sales` (`is_locked_for_sales`),
  KEY `ix_lnd_jv_unit_allocations_jv_agreement_id` (`jv_agreement_id`),
  CONSTRAINT `lnd_jv_unit_allocations_ibfk_1` FOREIGN KEY (`jv_agreement_id`) REFERENCES `lnd_jv_agreements` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `lnd_jv_unit_allocations` */

insert  into `lnd_jv_unit_allocations`(`id`,`jv_agreement_id`,`unit_identifier`,`allocation_type`,`is_locked_for_sales`,`allocation_notes`,`created_at`,`updated_at`) values 
(1,1,'Tower A - 3rd Floor (Unit 3A)','LANDOWNER_UNIT',1,'Permanent landowner residential flat. Strictly non-saleable.','2026-10-16 21:18:36','2026-10-16 21:18:36'),
(2,1,'Tower A - 4th Floor (Unit 4A)','LANDOWNER_UNIT',1,'Landowner daughter residential allotment. Locked for sales.','2026-10-16 21:18:36','2026-10-16 21:18:36'),
(3,1,'Tower A - 5th Floor (Unit 5A)','DEVELOPER_UNIT',0,'Open for general customer booking via CRM sales inventory.','2026-10-16 21:18:36','2026-10-16 21:18:36'),
(4,1,'Tower A - 6th Floor (Unit 6A)','DEVELOPER_UNIT',0,'Open for general customer booking.','2026-10-16 21:18:36','2026-10-16 21:18:36');

/*Table structure for table `lnd_land_banks` */

DROP TABLE IF EXISTS `lnd_land_banks`;

CREATE TABLE `lnd_land_banks` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_code` varchar(64) NOT NULL,
  `proposal_title` varchar(255) NOT NULL,
  `mouza_name` varchar(128) NOT NULL,
  `jl_number` varchar(64) NOT NULL,
  `total_area_katha` decimal(14,4) NOT NULL,
  `total_area_decimal` decimal(14,4) NOT NULL,
  `total_area_sqft` decimal(16,2) NOT NULL,
  `deal_type` varchar(64) NOT NULL,
  `status` varchar(64) NOT NULL,
  `location_description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_lnd_land_banks_project_code` (`project_code`),
  KEY `ix_lnd_land_banks_deal_type` (`deal_type`),
  KEY `ix_lnd_land_banks_status` (`status`),
  KEY `ix_lnd_land_banks_mouza_name` (`mouza_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `lnd_land_banks` */

insert  into `lnd_land_banks`(`id`,`project_code`,`proposal_title`,`mouza_name`,`jl_number`,`total_area_katha`,`total_area_decimal`,`total_area_sqft`,`deal_type`,`status`,`location_description`,`created_at`,`updated_at`) values 
(1,'PRJ-GULSHAN-AVENUE','Gulshan North Avenue Prime Lakefront Land','Gulshan Model Town','JL-24',18.5000,30.5785,13320.00,'JOINT_VENTURE','JV_SIGNED','Plot #14, Road #71, Gulshan-2, Dhaka 1212. Facing Gulshan North Lake.','2026-10-16 21:18:36','2026-10-16 21:18:36'),
(2,'PRJ-BANANI-COMMERCIAL','Banani Road 11 Boutique Commercial Plot','Banani C/A','JL-19',12.0000,19.8347,8640.00,'JOINT_VENTURE','LEGAL_VETTING','Plot 55, Block D, Road 11, Banani, Dhaka.','2026-10-16 21:18:36','2026-10-16 21:18:36');

/*Table structure for table `lnd_landowners` */

DROP TABLE IF EXISTS `lnd_landowners`;

CREATE TABLE `lnd_landowners` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `land_bank_id` bigint(20) NOT NULL,
  `owner_type` varchar(32) NOT NULL,
  `full_name_en` varchar(191) NOT NULL,
  `full_name_bn` varchar(191) DEFAULT NULL,
  `nid_number` varchar(64) DEFAULT NULL,
  `tin_number` varchar(64) DEFAULT NULL,
  `phone_number` varchar(32) DEFAULT NULL,
  `ownership_share_ratio` decimal(6,4) NOT NULL,
  `bank_details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`bank_details`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_lnd_landowners_land_bank_id` (`land_bank_id`),
  KEY `ix_lnd_landowners_nid_number` (`nid_number`),
  CONSTRAINT `lnd_landowners_ibfk_1` FOREIGN KEY (`land_bank_id`) REFERENCES `lnd_land_banks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `lnd_landowners` */

insert  into `lnd_landowners`(`id`,`land_bank_id`,`owner_type`,`full_name_en`,`full_name_bn`,`nid_number`,`tin_number`,`phone_number`,`ownership_share_ratio`,`bank_details`,`created_at`,`updated_at`) values 
(1,1,'INDIVIDUAL','Alhaj Rafiqul Islam Chowdhury','আলহাজ্ব রফিকুল ইসলাম চৌধুরী','19782690223450012','214589632145','+8801711223344',0.6000,'{\"bank_name\": \"Dutch-Bangla Bank PLC\", \"branch\": \"Gulshan\", \"account_no\": \"116.120.0049281\"}','2026-10-16 21:18:36','2026-10-16 21:18:36'),
(2,1,'INDIVIDUAL','Begum Nurunnahar Chowdhury','বেগম নুরুননাহার চৌধুরী','19822690223450088','345678912345','+8801711998877',0.4000,'{\"bank_name\": \"City Bank PLC\", \"branch\": \"Gulshan Avenue\", \"account_no\": \"310.228.0091122\"}','2026-10-16 21:18:36','2026-10-16 21:18:36'),
(3,2,'COMPANY','Orion Holdings BD Ltd.','ওরিয়ন হোল্ডিংস বিডি লি.',NULL,'998877665544','+8801911002233',1.0000,'{\"bank_name\": \"Standard Chartered Bank\", \"branch\": \"Gulshan\", \"account_no\": \"01-9283741-01\"}','2026-10-16 21:18:36','2026-10-16 21:18:36');

/*Table structure for table `lnd_survey_records` */

DROP TABLE IF EXISTS `lnd_survey_records`;

CREATE TABLE `lnd_survey_records` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `land_bank_id` bigint(20) NOT NULL,
  `survey_type_id` varchar(64) NOT NULL,
  `khatian_number` varchar(64) NOT NULL,
  `recorded_tenant_name` varchar(191) NOT NULL,
  `dag_number` varchar(64) NOT NULL,
  `recorded_area_decimal` decimal(14,4) NOT NULL,
  `recorded_area_katha` decimal(14,4) NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_lnd_survey_records_dag_number` (`dag_number`),
  KEY `ix_lnd_survey_records_survey_type_id` (`survey_type_id`),
  KEY `ix_lnd_survey_records_khatian_number` (`khatian_number`),
  KEY `ix_lnd_survey_records_land_bank_id` (`land_bank_id`),
  CONSTRAINT `lnd_survey_records_ibfk_1` FOREIGN KEY (`land_bank_id`) REFERENCES `lnd_land_banks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `lnd_survey_records` */

insert  into `lnd_survey_records`(`id`,`land_bank_id`,`survey_type_id`,`khatian_number`,`recorded_tenant_name`,`dag_number`,`recorded_area_decimal`,`recorded_area_katha`,`remarks`,`created_at`,`updated_at`) values 
(1,1,'CS','CS-112','Late Golam Rahman Mia','CS-504',30.5500,18.4800,'Cadastral Survey 1912 - Title originating ancestor','2026-10-16 21:18:36','2026-10-16 21:18:36'),
(2,1,'SA','SA-489','Late Golam Rahman Mia','SA-812',30.5500,18.4800,'State Acquisition Survey 1956','2026-10-16 21:18:36','2026-10-16 21:18:36'),
(3,1,'RS','RS-1402','Alhaj Rafiqul Islam Chowdhury','RS-2201',30.5800,18.5000,'Revisional Survey - Mutated and up-to-date dakhila','2026-10-16 21:18:36','2026-10-16 21:18:36'),
(4,1,'BS_CITY','BS-8891','Alhaj Rafiqul Islam Chowdhury & Co.','BS-4410',30.5800,18.5000,'City Survey Dhaka - Final title published','2026-10-16 21:18:36','2026-10-16 21:18:36'),
(5,2,'SA','SA-702','Dacca Cantonment Land Registry','SA-110',19.8300,12.0000,'SA Record under District Settlement','2026-10-16 21:18:36','2026-10-16 21:18:36'),
(6,2,'RS','RS-3310','Orion Holdings BD Ltd.','RS-890',19.8300,12.0000,'RS record mutated in 2018','2026-10-16 21:18:36','2026-10-16 21:18:36');

/*Table structure for table `mig_import_batches` */

DROP TABLE IF EXISTS `mig_import_batches`;

CREATE TABLE `mig_import_batches` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `entity_type` varchar(64) NOT NULL,
  `file_url` varchar(256) NOT NULL,
  `total_records` int(11) NOT NULL,
  `successful_records` int(11) NOT NULL,
  `failed_records` int(11) NOT NULL,
  `status` varchar(32) NOT NULL,
  `error_log` text DEFAULT NULL,
  `imported_by_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `imported_by_id` (`imported_by_id`),
  KEY `ix_mig_import_batches_entity_type` (`entity_type`),
  KEY `ix_mig_import_batches_status` (`status`),
  CONSTRAINT `mig_import_batches_ibfk_1` FOREIGN KEY (`imported_by_id`) REFERENCES `sys_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `mig_import_batches` */

insert  into `mig_import_batches`(`id`,`entity_type`,`file_url`,`total_records`,`successful_records`,`failed_records`,`status`,`error_log`,`imported_by_id`,`created_at`,`updated_at`) values 
(1,'Land','uploads/migration/Gulshan_Plot_Cadastral_Matrix.xlsx',48,48,0,'COMPLETED',NULL,1,'2026-10-16 22:18:11','2026-10-16 22:18:11'),
(2,'COA_Opening','uploads/migration/Opening_General_Ledger_2026.xlsx',120,120,0,'COMPLETED',NULL,4,'2026-10-16 22:18:11','2026-10-16 22:18:11'),
(3,'Inventory','uploads/migration/The_Grand_Emerald_Units_Pricing.xlsx',32,32,0,'COMPLETED',NULL,1,'2026-10-16 22:18:11','2026-10-16 22:18:11');

/*Table structure for table `prj_authority_clearances` */

DROP TABLE IF EXISTS `prj_authority_clearances`;

CREATE TABLE `prj_authority_clearances` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `clearance_type_id` varchar(64) NOT NULL,
  `application_memo_no` varchar(128) DEFAULT NULL,
  `approved_memo_no` varchar(128) DEFAULT NULL,
  `approval_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `document_url` varchar(255) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_prj_authority_clearances_project_id` (`project_id`),
  KEY `ix_prj_authority_clearances_status` (`status`),
  KEY `ix_prj_authority_clearances_clearance_type_id` (`clearance_type_id`),
  CONSTRAINT `prj_authority_clearances_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `prj_authority_clearances` */

insert  into `prj_authority_clearances`(`id`,`project_id`,`clearance_type_id`,`application_memo_no`,`approved_memo_no`,`approval_date`,`expiry_date`,`status`,`document_url`,`remarks`,`created_at`,`updated_at`) values 
(1,1,'LUC','RAJUK/LUC/2025/908','RAJUK/LUC/APP/1402','2026-03-30','2028-12-24','APPROVED',NULL,'Land Use Clearance for Residential Tower validated','2026-10-16 21:18:45','2026-10-16 21:18:45'),
(2,1,'AVIATION_HEIGHT','CAAB/NOC/2025/1102','CAAB/PERMIT/884','2026-05-19','2029-04-03','APPROVED',NULL,'Civil Aviation permitted maximum height: 215 ft MSL','2026-10-16 21:18:45','2026-10-16 21:18:45'),
(3,1,'FIRE_NOC','FSCD/DHK/2025/441','FSCD/NOC/8901','2026-07-18','2027-07-18','APPROVED',NULL,'Dual fire escape staircases & automatic sprinkler layout certified','2026-10-16 21:18:45','2026-10-16 21:18:45'),
(4,1,'BUILDING_PLAN','RAJUK/BP/2025/7841','RAJUK/BP/APPR/3309','2026-09-01','2029-08-31','APPROVED',NULL,'Full Building Plan & Structural Layout approved by BC Committee','2026-10-16 21:18:45','2026-10-16 21:18:45'),
(5,1,'ENVIRONMENTAL','DOE/ENV/2026/092',NULL,NULL,NULL,'IN_REVIEW',NULL,'Site inspection completed by Department of Environment','2026-10-16 21:18:45','2026-10-16 21:18:45'),
(6,1,'WASA','DWASA/MODS-5/2026/301',NULL,NULL,NULL,'SUBMITTED',NULL,'Deep tube-well and drainage connection clearance applied','2026-10-16 21:18:45','2026-10-16 21:18:45');

/*Table structure for table `prj_boq_items` */

DROP TABLE IF EXISTS `prj_boq_items`;

CREATE TABLE `prj_boq_items` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `tower_id` bigint(20) DEFAULT NULL,
  `wbs_phase_id` varchar(64) NOT NULL,
  `material_category_id` varchar(64) NOT NULL,
  `item_description` varchar(255) NOT NULL,
  `unit_of_measure_id` varchar(32) NOT NULL,
  `estimated_quantity` decimal(14,4) NOT NULL,
  `estimated_unit_rate` decimal(14,2) NOT NULL,
  `total_estimated_cost` decimal(16,2) NOT NULL,
  `actual_consumed_quantity` decimal(14,4) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_prj_boq_items_wbs_phase_id` (`wbs_phase_id`),
  KEY `ix_prj_boq_items_tower_id` (`tower_id`),
  KEY `ix_prj_boq_items_material_category_id` (`material_category_id`),
  KEY `ix_prj_boq_items_project_id` (`project_id`),
  CONSTRAINT `prj_boq_items_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `prj_boq_items_ibfk_2` FOREIGN KEY (`tower_id`) REFERENCES `prj_towers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `prj_boq_items` */

insert  into `prj_boq_items`(`id`,`project_id`,`tower_id`,`wbs_phase_id`,`material_category_id`,`item_description`,`unit_of_measure_id`,`estimated_quantity`,`estimated_unit_rate`,`total_estimated_cost`,`actual_consumed_quantity`,`created_at`,`updated_at`) values 
(1,1,1,'SUB_STRUCTURE','REBAR_500W','BSRM / AKS 500W Deformed High-Yield Rebar (16mm to 32mm)','TON',450.0000,98500.00,44325000.00,180.0000,'2026-10-16 21:18:45','2026-10-16 21:18:45'),
(2,1,1,'SUB_STRUCTURE','CEMENT_OPC','Shah / Seven Rings Portland Composite Cement (OPC Grade)','BAG',18000.0000,540.00,9720000.00,7500.0000,'2026-10-16 21:18:45','2026-10-16 21:18:45'),
(3,1,1,'SUPER_STRUCTURE','STONE_CHIPS','Pakur Black Hard Stone Chips (3/4 inch graded)','CFT',65000.0000,225.00,14625000.00,22000.0000,'2026-10-16 21:18:45','2026-10-16 21:18:45'),
(4,1,1,'SUPER_STRUCTURE','SAND_FM_2_5','Sylhet Coarse Sand (FM 2.50 to 2.80)','CFT',42000.0000,65.00,2730000.00,14000.0000,'2026-10-16 21:18:45','2026-10-16 21:18:45'),
(5,1,1,'BRICK_WORK','BRICKS_AUTO','Gas-fired Automatic Solid Clay Bricks (1st Class)','THOUSAND_NOS',120.0000,14500.00,1740000.00,15.0000,'2026-10-16 21:18:45','2026-10-16 21:18:45');

/*Table structure for table `prj_drawings` */

DROP TABLE IF EXISTS `prj_drawings`;

CREATE TABLE `prj_drawings` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `drawing_category_id` varchar(64) NOT NULL,
  `drawing_number` varchar(64) NOT NULL,
  `drawing_title` varchar(191) NOT NULL,
  `revision_number` varchar(16) NOT NULL,
  `is_approved_for_construction` tinyint(1) NOT NULL,
  `approved_by` varchar(128) DEFAULT NULL,
  `approval_date` date DEFAULT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `revision_notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_prj_drawings_is_approved_for_construction` (`is_approved_for_construction`),
  KEY `ix_prj_drawings_project_id` (`project_id`),
  KEY `ix_prj_drawings_drawing_number` (`drawing_number`),
  KEY `ix_prj_drawings_drawing_category_id` (`drawing_category_id`),
  CONSTRAINT `prj_drawings_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `prj_drawings` */

insert  into `prj_drawings`(`id`,`project_id`,`drawing_category_id`,`drawing_number`,`drawing_title`,`revision_number`,`is_approved_for_construction`,`approved_by`,`approval_date`,`file_url`,`revision_notes`,`created_at`,`updated_at`) values 
(1,1,'STRUCTURAL','STR-COL-001','Mat Foundation & Basement Column Layout','R0',0,NULL,NULL,NULL,'Superseded by R1 revised column load calculations','2026-10-16 21:18:45','2026-10-16 21:18:45'),
(2,1,'STRUCTURAL','STR-COL-001','Mat Foundation & Basement Column Layout','R1',1,'Chief Structural Consultant Engr. Shamsul Haque','2026-09-26',NULL,'IFC: Issued for Construction approved by Project Director','2026-10-16 21:18:45','2026-10-16 21:18:45');

/*Table structure for table `prj_projects` */

DROP TABLE IF EXISTS `prj_projects`;

CREATE TABLE `prj_projects` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `land_bank_id` bigint(20) DEFAULT NULL,
  `project_code` varchar(64) NOT NULL,
  `project_name` varchar(191) NOT NULL,
  `development_authority_id` varchar(32) NOT NULL,
  `far_allocated` decimal(6,2) NOT NULL,
  `mgc_percent` decimal(5,2) NOT NULL,
  `road_width_feet` decimal(6,2) NOT NULL,
  `plot_area_sqft` decimal(14,2) NOT NULL,
  `total_builtup_area_sqft` decimal(16,2) NOT NULL,
  `total_saleable_area_sqft` decimal(16,2) NOT NULL,
  `planned_handover_date` date DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_prj_projects_project_code` (`project_code`),
  KEY `ix_prj_projects_status` (`status`),
  KEY `ix_prj_projects_land_bank_id` (`land_bank_id`),
  KEY `ix_prj_projects_development_authority_id` (`development_authority_id`),
  CONSTRAINT `prj_projects_ibfk_1` FOREIGN KEY (`land_bank_id`) REFERENCES `lnd_land_banks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `prj_projects` */

insert  into `prj_projects`(`id`,`land_bank_id`,`project_code`,`project_name`,`development_authority_id`,`far_allocated`,`mgc_percent`,`road_width_feet`,`plot_area_sqft`,`total_builtup_area_sqft`,`total_saleable_area_sqft`,`planned_handover_date`,`status`,`description`,`created_at`,`updated_at`) values 
(1,1,'PRJ-GULSHAN-AVENUE','The Grand Emerald Residences & Suites','RAJUK',4.50,52.50,60.00,13320.00,59940.00,46753.20,'2029-09-30','UNDER_CONSTRUCTION','Ultra-luxury 2B+G+18 storey residential landmark overlooking Gulshan North Lake.','2026-10-16 21:18:45','2026-10-16 21:18:45'),
(2,2,'PRJ-BANANI-COMMERCIAL','Banani Signature Commercial Hub & Corporate Suites','RAJUK',5.50,55.00,80.00,8640.00,47520.00,38000.00,'2029-04-03','UNDER_CONSTRUCTION','Boutique Grade-A Corporate Office Tower on Prime Road 11 Banani Commercial Zone.','2026-10-16 22:18:08','2026-10-16 22:18:08');

/*Table structure for table `prj_towers` */

DROP TABLE IF EXISTS `prj_towers`;

CREATE TABLE `prj_towers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `tower_code` varchar(64) NOT NULL,
  `tower_name` varchar(128) NOT NULL,
  `basement_floors` int(11) NOT NULL,
  `residential_floors` int(11) NOT NULL,
  `commercial_floors` int(11) NOT NULL,
  `total_lifts` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_prj_towers_project_id` (`project_id`),
  CONSTRAINT `prj_towers_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `prj_towers` */

insert  into `prj_towers`(`id`,`project_id`,`tower_code`,`tower_name`,`basement_floors`,`residential_floors`,`commercial_floors`,`total_lifts`,`created_at`,`updated_at`) values 
(1,1,'TOWER-A','Lake-View Signature Tower',2,18,0,3,'2026-10-16 21:18:45','2026-10-16 21:18:45');

/*Table structure for table `rnt_lease_agreements` */

DROP TABLE IF EXISTS `rnt_lease_agreements`;

CREATE TABLE `rnt_lease_agreements` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `unit_id` bigint(20) NOT NULL,
  `tenant_name` varchar(128) NOT NULL,
  `tenant_nid` varchar(32) NOT NULL,
  `tenant_phone` varchar(32) DEFAULT NULL,
  `lease_start_date` date NOT NULL,
  `lease_expiry_date` date NOT NULL,
  `monthly_rent_bdt` decimal(12,2) NOT NULL,
  `security_deposit_bdt` decimal(12,2) NOT NULL,
  `rent_escalation_percent` decimal(5,2) NOT NULL,
  `status` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_rnt_lease_agreements_unit_id` (`unit_id`),
  CONSTRAINT `rnt_lease_agreements_ibfk_1` FOREIGN KEY (`unit_id`) REFERENCES `inv_units` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `rnt_lease_agreements` */

insert  into `rnt_lease_agreements`(`id`,`unit_id`,`tenant_name`,`tenant_nid`,`tenant_phone`,`lease_start_date`,`lease_expiry_date`,`monthly_rent_bdt`,`security_deposit_bdt`,`rent_escalation_percent`,`status`,`created_at`,`updated_at`) values 
(1,2,'HSBC Bangladesh (Corporate Banking Booth & ATM Lounge)','001928374655','+8801713009911','2026-01-01','2030-12-31',250000.00,1500000.00,10.00,'ACTIVE','2026-10-16 22:18:11','2026-10-16 22:18:11');

/*Table structure for table `scm_comparative_statements` */

DROP TABLE IF EXISTS `scm_comparative_statements`;

CREATE TABLE `scm_comparative_statements` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `pr_id` bigint(20) NOT NULL,
  `cs_number` varchar(64) NOT NULL,
  `cs_date` date NOT NULL,
  `recommended_vendor_id` bigint(20) DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `justification_summary` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_scm_comparative_statements_cs_number` (`cs_number`),
  KEY `ix_scm_comparative_statements_recommended_vendor_id` (`recommended_vendor_id`),
  KEY `ix_scm_comparative_statements_pr_id` (`pr_id`),
  KEY `ix_scm_comparative_statements_status` (`status`),
  CONSTRAINT `scm_comparative_statements_ibfk_1` FOREIGN KEY (`pr_id`) REFERENCES `scm_purchase_requisitions` (`id`),
  CONSTRAINT `scm_comparative_statements_ibfk_2` FOREIGN KEY (`recommended_vendor_id`) REFERENCES `scm_vendors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `scm_comparative_statements` */

insert  into `scm_comparative_statements`(`id`,`pr_id`,`cs_number`,`cs_date`,`recommended_vendor_id`,`status`,`justification_summary`,`created_at`,`updated_at`) values 
(1,1,'CS-2026-0009','2026-10-08',1,'APPROVED','BSRM Steels is lowest responsive bidder with compliant elongation test report and 30-day credit facility.','2026-10-16 22:18:10','2026-10-16 22:18:10');

/*Table structure for table `scm_cs_quotations` */

DROP TABLE IF EXISTS `scm_cs_quotations`;

CREATE TABLE `scm_cs_quotations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `cs_id` bigint(20) NOT NULL,
  `vendor_id` bigint(20) NOT NULL,
  `quoted_unit_rate` decimal(14,2) NOT NULL,
  `quoted_quantity` decimal(14,4) NOT NULL,
  `total_quoted_amount` decimal(16,2) NOT NULL,
  `credit_days_offered` int(11) NOT NULL,
  `lead_time_days` int(11) NOT NULL,
  `is_recommended` tinyint(1) NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_scm_cs_quotations_vendor_id` (`vendor_id`),
  KEY `ix_scm_cs_quotations_cs_id` (`cs_id`),
  CONSTRAINT `scm_cs_quotations_ibfk_1` FOREIGN KEY (`cs_id`) REFERENCES `scm_comparative_statements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scm_cs_quotations_ibfk_2` FOREIGN KEY (`vendor_id`) REFERENCES `scm_vendors` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `scm_cs_quotations` */

insert  into `scm_cs_quotations`(`id`,`cs_id`,`vendor_id`,`quoted_unit_rate`,`quoted_quantity`,`total_quoted_amount`,`credit_days_offered`,`lead_time_days`,`is_recommended`,`remarks`) values 
(1,1,1,98500.00,50.0000,4925000.00,30,2,1,'Original BUET test certificate attached.'),
(2,1,2,101000.00,50.0000,5050000.00,15,4,0,'Higher unit rate.');

/*Table structure for table `scm_goods_receipts` */

DROP TABLE IF EXISTS `scm_goods_receipts`;

CREATE TABLE `scm_goods_receipts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `po_id` bigint(20) NOT NULL,
  `grn_number` varchar(64) NOT NULL,
  `receipt_date` date NOT NULL,
  `delivery_challan_number` varchar(64) NOT NULL,
  `challan_photo_url` varchar(255) DEFAULT NULL,
  `received_by_user_id` bigint(20) NOT NULL,
  `received_quantity` decimal(14,4) NOT NULL,
  `rejected_quantity` decimal(14,4) NOT NULL,
  `accepted_quantity` decimal(14,4) NOT NULL,
  `supplier_invoice_number` varchar(64) DEFAULT NULL,
  `supplier_invoice_amount` decimal(16,2) DEFAULT NULL,
  `calculated_expected_amount` decimal(16,2) NOT NULL,
  `variance_amount` decimal(16,2) NOT NULL,
  `three_way_match_status` varchar(32) NOT NULL,
  `accounts_voucher_ref` varchar(64) DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `inspection_remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_scm_goods_receipts_grn_number` (`grn_number`),
  KEY `ix_scm_goods_receipts_status` (`status`),
  KEY `ix_scm_goods_receipts_po_id` (`po_id`),
  KEY `ix_scm_goods_receipts_three_way_match_status` (`three_way_match_status`),
  KEY `ix_scm_goods_receipts_received_by_user_id` (`received_by_user_id`),
  CONSTRAINT `scm_goods_receipts_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `scm_purchase_orders` (`id`),
  CONSTRAINT `scm_goods_receipts_ibfk_2` FOREIGN KEY (`received_by_user_id`) REFERENCES `sys_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `scm_goods_receipts` */

insert  into `scm_goods_receipts`(`id`,`po_id`,`grn_number`,`receipt_date`,`delivery_challan_number`,`challan_photo_url`,`received_by_user_id`,`received_quantity`,`rejected_quantity`,`accepted_quantity`,`supplier_invoice_number`,`supplier_invoice_amount`,`calculated_expected_amount`,`variance_amount`,`three_way_match_status`,`accounts_voucher_ref`,`status`,`inspection_remarks`,`created_at`,`updated_at`) values 
(1,1,'GRN-2026-0044','2026-10-14','CHL-BSRM-88912','assets/images/common/challan_sample.jpg',5,25.0000,0.0000,25.0000,'INV-BSRM-2026-9901',2462500.00,2462500.00,0.00,'MATCHED_OK','JV-2026-0092','POSTED_ACCOUNTS','Random caliper gauge test verified 20mm & 25mm dia. Weighbridge tare/gross verified.','2026-10-16 22:18:10','2026-10-16 22:18:10');

/*Table structure for table `scm_materials` */

DROP TABLE IF EXISTS `scm_materials`;

CREATE TABLE `scm_materials` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `material_code` varchar(32) NOT NULL,
  `material_name` varchar(191) NOT NULL,
  `category` varchar(64) NOT NULL,
  `unit_of_measure` varchar(32) NOT NULL,
  `standard_unit_cost` decimal(14,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_scm_materials_material_code` (`material_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `scm_materials` */

insert  into `scm_materials`(`id`,`material_code`,`material_name`,`category`,`unit_of_measure`,`standard_unit_cost`,`is_active`,`created_at`) values 
(1,'MAT-REBAR-500W','500W TMT Deformed Rebar (16mm/20mm/25mm)','REBAR','TON',98500.00,1,'2026-10-16 22:18:10'),
(2,'MAT-CEM-PCC','Portland Composite Cement (PCC 42.5N)','CEMENT','BAG',540.00,1,'2026-10-16 22:18:10'),
(3,'MAT-SAND-SYLHET','Sylhet Coarse Sand (FM 2.5)','SAND','CFT',65.00,1,'2026-10-16 22:18:10'),
(4,'MAT-STONE-CHIPS','20mm Down Black Bholaganj Crushed Stone Chips','STONE_CHIPS','CFT',175.00,1,'2026-10-16 22:18:10'),
(5,'MAT-BRICK-AUTO','1st Class Gas-Burned Auto Machine Bricks','BRICKS','NOS',14.50,1,'2026-10-16 22:18:10'),
(6,'MAT-TILES-PORC','60x60cm Glazed Mirror Polish Porcelain Tiles','FINISHING','SQFT',185.00,1,'2026-10-16 22:18:10');

/*Table structure for table `scm_purchase_orders` */

DROP TABLE IF EXISTS `scm_purchase_orders`;

CREATE TABLE `scm_purchase_orders` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `po_number` varchar(64) NOT NULL,
  `cs_id` bigint(20) DEFAULT NULL,
  `project_id` bigint(20) NOT NULL,
  `vendor_id` bigint(20) NOT NULL,
  `material_id` bigint(20) NOT NULL,
  `ordered_quantity` decimal(14,4) NOT NULL,
  `unit_price` decimal(14,2) NOT NULL,
  `total_po_amount` decimal(16,2) NOT NULL,
  `po_date` date NOT NULL,
  `delivery_deadline` date NOT NULL,
  `destination_store_id` bigint(20) NOT NULL,
  `status` varchar(32) NOT NULL,
  `terms_and_conditions` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_scm_purchase_orders_po_number` (`po_number`),
  KEY `ix_scm_purchase_orders_status` (`status`),
  KEY `ix_scm_purchase_orders_destination_store_id` (`destination_store_id`),
  KEY `ix_scm_purchase_orders_material_id` (`material_id`),
  KEY `ix_scm_purchase_orders_vendor_id` (`vendor_id`),
  KEY `ix_scm_purchase_orders_project_id` (`project_id`),
  KEY `ix_scm_purchase_orders_cs_id` (`cs_id`),
  CONSTRAINT `scm_purchase_orders_ibfk_1` FOREIGN KEY (`cs_id`) REFERENCES `scm_comparative_statements` (`id`) ON DELETE SET NULL,
  CONSTRAINT `scm_purchase_orders_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`),
  CONSTRAINT `scm_purchase_orders_ibfk_3` FOREIGN KEY (`vendor_id`) REFERENCES `scm_vendors` (`id`),
  CONSTRAINT `scm_purchase_orders_ibfk_4` FOREIGN KEY (`material_id`) REFERENCES `scm_materials` (`id`),
  CONSTRAINT `scm_purchase_orders_ibfk_5` FOREIGN KEY (`destination_store_id`) REFERENCES `scm_site_stores` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `scm_purchase_orders` */

insert  into `scm_purchase_orders`(`id`,`po_number`,`cs_id`,`project_id`,`vendor_id`,`material_id`,`ordered_quantity`,`unit_price`,`total_po_amount`,`po_date`,`delivery_deadline`,`destination_store_id`,`status`,`terms_and_conditions`,`created_at`,`updated_at`) values 
(1,'PO-2026-0015',1,1,1,1,50.0000,98500.00,4925000.00,'2026-10-11','2026-10-18',1,'PARTIALLY_RECEIVED','Price inclusive of delivery to Gulshan site. Weighbridge slip mandatory.','2026-10-16 22:18:10','2026-10-16 22:18:10');

/*Table structure for table `scm_purchase_requisitions` */

DROP TABLE IF EXISTS `scm_purchase_requisitions`;

CREATE TABLE `scm_purchase_requisitions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `pr_number` varchar(64) NOT NULL,
  `requested_by_user_id` bigint(20) NOT NULL,
  `requisition_date` date NOT NULL,
  `required_by_date` date DEFAULT NULL,
  `material_id` bigint(20) NOT NULL,
  `requested_quantity` decimal(14,4) NOT NULL,
  `purpose_notes` text DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_scm_purchase_requisitions_pr_number` (`pr_number`),
  KEY `ix_scm_purchase_requisitions_project_id` (`project_id`),
  KEY `ix_scm_purchase_requisitions_status` (`status`),
  KEY `ix_scm_purchase_requisitions_material_id` (`material_id`),
  KEY `ix_scm_purchase_requisitions_requested_by_user_id` (`requested_by_user_id`),
  CONSTRAINT `scm_purchase_requisitions_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`),
  CONSTRAINT `scm_purchase_requisitions_ibfk_2` FOREIGN KEY (`requested_by_user_id`) REFERENCES `sys_users` (`id`),
  CONSTRAINT `scm_purchase_requisitions_ibfk_3` FOREIGN KEY (`material_id`) REFERENCES `scm_materials` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `scm_purchase_requisitions` */

insert  into `scm_purchase_requisitions`(`id`,`project_id`,`pr_number`,`requested_by_user_id`,`requisition_date`,`required_by_date`,`material_id`,`requested_quantity`,`purpose_notes`,`status`,`created_at`,`updated_at`) values 
(1,1,'PR-2026-0021',3,'2026-10-04','2026-10-21',1,50.0000,'Required for 5th & 6th Floor main column cage binding and shear wall reinforcement.','CS_PREPARED','2026-10-16 22:18:10','2026-10-16 22:18:10');

/*Table structure for table `scm_site_stores` */

DROP TABLE IF EXISTS `scm_site_stores`;

CREATE TABLE `scm_site_stores` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) NOT NULL,
  `store_name` varchar(128) NOT NULL,
  `location_details` varchar(191) DEFAULT NULL,
  `store_in_charge_user_id` bigint(20) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_scm_site_stores_project_id` (`project_id`),
  KEY `ix_scm_site_stores_store_in_charge_user_id` (`store_in_charge_user_id`),
  CONSTRAINT `scm_site_stores_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`),
  CONSTRAINT `scm_site_stores_ibfk_2` FOREIGN KEY (`store_in_charge_user_id`) REFERENCES `sys_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `scm_site_stores` */

insert  into `scm_site_stores`(`id`,`project_id`,`store_name`,`location_details`,`store_in_charge_user_id`,`is_active`,`created_at`,`updated_at`) values 
(1,1,'Gulshan Emerald Project Site Store','Basement B1 Secured Storage Bay',5,1,'2026-10-16 22:18:10','2026-10-16 22:18:10');

/*Table structure for table `scm_store_stock` */

DROP TABLE IF EXISTS `scm_store_stock`;

CREATE TABLE `scm_store_stock` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `store_id` bigint(20) NOT NULL,
  `material_id` bigint(20) NOT NULL,
  `current_stock_quantity` decimal(14,4) NOT NULL,
  `reorder_level` decimal(14,4) NOT NULL,
  `last_updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_scm_store_stock_material_id` (`material_id`),
  KEY `ix_scm_store_stock_store_id` (`store_id`),
  CONSTRAINT `scm_store_stock_ibfk_1` FOREIGN KEY (`store_id`) REFERENCES `scm_site_stores` (`id`) ON DELETE CASCADE,
  CONSTRAINT `scm_store_stock_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `scm_materials` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `scm_store_stock` */

insert  into `scm_store_stock`(`id`,`store_id`,`material_id`,`current_stock_quantity`,`reorder_level`,`last_updated_at`) values 
(1,1,1,35.5000,15.0000,'2026-10-16 22:18:10'),
(2,1,2,1450.0000,500.0000,'2026-10-16 22:18:10'),
(3,1,3,4200.0000,1000.0000,'2026-10-16 22:18:10'),
(4,1,4,6500.0000,1500.0000,'2026-10-16 22:18:10');

/*Table structure for table `scm_vendors` */

DROP TABLE IF EXISTS `scm_vendors`;

CREATE TABLE `scm_vendors` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `vendor_code` varchar(32) NOT NULL,
  `vendor_name` varchar(191) NOT NULL,
  `trade_category` varchar(64) NOT NULL,
  `contact_person` varchar(128) NOT NULL,
  `phone_number` varchar(32) NOT NULL,
  `email` varchar(128) DEFAULT NULL,
  `tin_number` varchar(64) DEFAULT NULL,
  `bin_number` varchar(64) DEFAULT NULL,
  `payment_terms_days` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_scm_vendors_vendor_code` (`vendor_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `scm_vendors` */

insert  into `scm_vendors`(`id`,`vendor_code`,`vendor_name`,`trade_category`,`contact_person`,`phone_number`,`email`,`tin_number`,`bin_number`,`payment_terms_days`,`is_active`,`created_at`) values 
(1,'VEND-0001','BSRM Steels Limited','STEEL_REBAR','Md. Ashraful Kabir','+8801713001122','sales@bsrm.com','112233445566','000123456-0101',30,1,'2026-10-16 22:18:09'),
(2,'VEND-0002','Crown Cement PLC','CEMENT','Syed Mahmudul Haque','+8801819334455','commercial@crowncement.com','223344556677','000234567-0202',45,1,'2026-10-16 22:18:09'),
(3,'VEND-0003','Mir Ceramic Ltd','TILES_SANITARY','Kamrul Hasan','+8801912445566','corporate@mirceramic.com','334455667788','000345678-0303',30,1,'2026-10-16 22:18:09');

/*Table structure for table `sls_booking_cancellations` */

DROP TABLE IF EXISTS `sls_booking_cancellations`;

CREATE TABLE `sls_booking_cancellations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `booking_id` bigint(20) NOT NULL,
  `cancellation_date` date NOT NULL,
  `cancellation_reason` text NOT NULL,
  `total_paid` decimal(14,2) NOT NULL,
  `forfeiture_deduction_percentage` decimal(5,2) NOT NULL,
  `forfeiture_deduction_amount` decimal(14,2) NOT NULL,
  `net_refund_amount` decimal(14,2) NOT NULL,
  `status` varchar(32) NOT NULL,
  `refund_cheque_no` varchar(64) DEFAULT NULL,
  `settlement_notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_sls_booking_cancellations_booking_id` (`booking_id`),
  KEY `ix_sls_booking_cancellations_status` (`status`),
  CONSTRAINT `sls_booking_cancellations_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `sls_bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sls_booking_cancellations` */

insert  into `sls_booking_cancellations`(`id`,`booking_id`,`cancellation_date`,`cancellation_reason`,`total_paid`,`forfeiture_deduction_percentage`,`forfeiture_deduction_amount`,`net_refund_amount`,`status`,`refund_cheque_no`,`settlement_notes`,`created_at`,`updated_at`) values 
(1,4,'2026-07-20','Emigration to Toronto, Canada. Mutual settlement as per REHAB Act statutory norms.',2000000.00,10.00,200000.00,1800000.00,'SETTLED','CHQ-EBL-9912044','Net refund paid via Eastern Bank Account Payee Cheque after statutory 10% forfeiture.','2026-10-16 22:18:09','2026-10-16 22:18:09');

/*Table structure for table `sls_bookings` */

DROP TABLE IF EXISTS `sls_bookings`;

CREATE TABLE `sls_bookings` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `booking_reference_no` varchar(64) NOT NULL,
  `project_id` bigint(20) NOT NULL,
  `unit_id` bigint(20) NOT NULL,
  `primary_customer_id` bigint(20) NOT NULL,
  `booking_date` date NOT NULL,
  `base_unit_price` decimal(14,2) NOT NULL,
  `discount_amount` decimal(14,2) NOT NULL,
  `discount_percentage` decimal(5,2) NOT NULL,
  `required_approval_tier` varchar(64) NOT NULL,
  `discount_approval_status` varchar(32) NOT NULL,
  `discount_approved_by_id` bigint(20) DEFAULT NULL,
  `discount_approval_notes` text DEFAULT NULL,
  `final_contract_value` decimal(14,2) NOT NULL,
  `earnest_money_received` decimal(14,2) NOT NULL,
  `down_payment_total` decimal(14,2) NOT NULL,
  `status` varchar(32) NOT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_sls_bookings_booking_reference_no` (`booking_reference_no`),
  KEY `discount_approved_by_id` (`discount_approved_by_id`),
  KEY `ix_sls_bookings_primary_customer_id` (`primary_customer_id`),
  KEY `ix_sls_bookings_unit_id` (`unit_id`),
  KEY `ix_sls_bookings_project_id` (`project_id`),
  KEY `ix_sls_bookings_status` (`status`),
  CONSTRAINT `sls_bookings_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `prj_projects` (`id`),
  CONSTRAINT `sls_bookings_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `inv_units` (`id`),
  CONSTRAINT `sls_bookings_ibfk_3` FOREIGN KEY (`primary_customer_id`) REFERENCES `crm_customers` (`id`),
  CONSTRAINT `sls_bookings_ibfk_4` FOREIGN KEY (`discount_approved_by_id`) REFERENCES `sys_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sls_bookings` */

insert  into `sls_bookings`(`id`,`booking_reference_no`,`project_id`,`unit_id`,`primary_customer_id`,`booking_date`,`base_unit_price`,`discount_amount`,`discount_percentage`,`required_approval_tier`,`discount_approval_status`,`discount_approved_by_id`,`discount_approval_notes`,`final_contract_value`,`earnest_money_received`,`down_payment_total`,`status`,`notes`,`created_at`,`updated_at`) values 
(1,'BK-2026-0001',1,1,1,'2026-08-15',48037500.00,480375.00,1.00,'SALES_MANAGER','APPROVED',1,'Approved under festival festive promo.',47557125.00,1500000.00,8000000.00,'AGREEMENT_SIGNED','Bainama deed signed on 300 Tk non-judicial stamp. Down payment cleared.','2026-10-16 22:18:09','2026-10-16 22:18:09'),
(2,'BK-2026-0002',1,2,2,'2026-09-01',37200000.00,930000.00,2.50,'DIRECTOR','APPROVED',1,'NRB high-volume buyer special waiver.',36270000.00,1000000.00,6000000.00,'AGREEMENT_SIGNED','Full remittance received from Qatar Islamic Bank.','2026-10-16 22:18:09','2026-10-16 22:18:09'),
(3,'BK-2026-0003',1,3,3,'2026-10-05',35015000.00,1575675.00,4.50,'MANAGING_DIRECTOR','PENDING_APPROVAL',NULL,NULL,33439325.00,1000000.00,0.00,'PROVISIONAL','Prominent Senior Physician. Requested 4.5% executive waiver pending MD biometric sign-off.','2026-10-16 22:18:09','2026-10-16 22:18:09'),
(4,'BK-2026-0004',1,4,4,'2026-05-10',33075000.00,0.00,0.00,'SALES_MANAGER','APPROVED',NULL,NULL,33075000.00,500000.00,1500000.00,'CANCELLED','Customer emigrated to Canada. Requested formal allotment cancellation.','2026-10-16 22:18:09','2026-10-16 22:18:09'),
(5,'BK-2026-0005',1,5,1,'2026-03-10',48510000.00,0.00,0.00,'SALES_MANAGER','APPROVED',NULL,NULL,48510000.00,2000000.00,31000000.00,'REGISTRATION_DONE','100% payments completed. Ready for keys handover inspection.','2026-10-16 22:18:09','2026-10-16 22:18:09');

/*Table structure for table `sls_broker_commissions` */

DROP TABLE IF EXISTS `sls_broker_commissions`;

CREATE TABLE `sls_broker_commissions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `broker_id` bigint(20) NOT NULL,
  `booking_id` bigint(20) NOT NULL,
  `total_unit_value` decimal(14,2) NOT NULL,
  `commission_percent` decimal(5,2) NOT NULL,
  `total_commission_amount` decimal(14,2) NOT NULL,
  `disbursed_amount` decimal(14,2) NOT NULL,
  `tds_withheld_amount` decimal(14,2) NOT NULL,
  `down_payment_disbursed` tinyint(1) NOT NULL,
  `ground_slab_disbursed` tinyint(1) NOT NULL,
  `registration_deed_disbursed` tinyint(1) NOT NULL,
  `status` varchar(32) NOT NULL,
  `disbursement_notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_sls_broker_commissions_booking_id` (`booking_id`),
  KEY `ix_sls_broker_commissions_broker_id` (`broker_id`),
  KEY `ix_sls_broker_commissions_status` (`status`),
  CONSTRAINT `sls_broker_commissions_ibfk_1` FOREIGN KEY (`broker_id`) REFERENCES `sls_brokers` (`id`),
  CONSTRAINT `sls_broker_commissions_ibfk_2` FOREIGN KEY (`booking_id`) REFERENCES `sls_bookings` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sls_broker_commissions` */

insert  into `sls_broker_commissions`(`id`,`broker_id`,`booking_id`,`total_unit_value`,`commission_percent`,`total_commission_amount`,`disbursed_amount`,`tds_withheld_amount`,`down_payment_disbursed`,`ground_slab_disbursed`,`registration_deed_disbursed`,`status`,`disbursement_notes`,`created_at`,`updated_at`) values 
(1,1,1,45218250.00,2.00,904365.00,361746.00,36174.60,1,0,0,'PARTIALLY_DISBURSED','First 40% tranche disbursed upon down payment clearance. Section 53 TDS (10%) deducted.','2026-10-16 22:18:11','2026-10-16 22:18:11');

/*Table structure for table `sls_brokers` */

DROP TABLE IF EXISTS `sls_brokers`;

CREATE TABLE `sls_brokers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `broker_code` varchar(32) NOT NULL,
  `agency_name` varchar(128) NOT NULL,
  `contact_person` varchar(128) NOT NULL,
  `phone_number` varchar(32) NOT NULL,
  `nid_number` varchar(32) DEFAULT NULL,
  `tin_number` varchar(32) DEFAULT NULL,
  `commission_slab_percent` decimal(5,2) NOT NULL,
  `bank_details` text DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_sls_brokers_broker_code` (`broker_code`),
  KEY `ix_sls_brokers_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sls_brokers` */

insert  into `sls_brokers`(`id`,`broker_code`,`agency_name`,`contact_person`,`phone_number`,`nid_number`,`tin_number`,`commission_slab_percent`,`bank_details`,`status`,`created_at`,`updated_at`) values 
(1,'BRK-0001','Bproperty Partner Network','Rashedul Karim','+8801711335577','19802695500001122','987654321012',2.00,'City Bank Gulshan Branch A/C 110293812','ACTIVE','2026-10-16 22:18:11','2026-10-16 22:18:11'),
(2,'BRK-0002','Remax Prime Properties BD','Syed Nayeem Akhtar','+8801819446688','19832695500003344','876543210923',2.50,'BRAC Bank Banani Branch A/C 220194821','ACTIVE','2026-10-16 22:18:11','2026-10-16 22:18:11');

/*Table structure for table `sls_customer_installments` */

DROP TABLE IF EXISTS `sls_customer_installments`;

CREATE TABLE `sls_customer_installments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `booking_id` bigint(20) NOT NULL,
  `installment_no` int(11) NOT NULL,
  `title` varchar(191) NOT NULL,
  `due_date` date NOT NULL,
  `grace_period_days` int(11) NOT NULL,
  `payable_amount` decimal(14,2) NOT NULL,
  `paid_amount` decimal(14,2) NOT NULL,
  `late_fee_accrued` decimal(14,2) NOT NULL,
  `status` varchar(32) NOT NULL,
  `milestone_trigger` varchar(128) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ix_sls_customer_installments_booking_id` (`booking_id`),
  KEY `ix_sls_customer_installments_status` (`status`),
  KEY `ix_sls_customer_installments_due_date` (`due_date`),
  CONSTRAINT `sls_customer_installments_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `sls_bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sls_customer_installments` */

insert  into `sls_customer_installments`(`id`,`booking_id`,`installment_no`,`title`,`due_date`,`grace_period_days`,`payable_amount`,`paid_amount`,`late_fee_accrued`,`status`,`milestone_trigger`,`created_at`,`updated_at`) values 
(1,1,1,'Milestone 1: Piling & Foundation Completed','2026-07-18',15,5000000.00,5000000.00,0.00,'PAID','FOUNDATION_DONE','2026-10-16 22:18:09','2026-10-16 22:18:09'),
(2,1,2,'Milestone 2: Basement & Ground Slab Casting','2026-09-26',15,5000000.00,5000000.00,0.00,'PAID','BASEMENT_CASTING','2026-10-16 22:18:09','2026-10-16 22:18:09'),
(3,1,3,'Milestone 3: 4th Floor Roof Slab Casting','2026-10-11',15,5000000.00,0.00,15000.00,'DUE','ROOF_SLAB_L4','2026-10-16 22:18:09','2026-10-16 22:18:09'),
(4,1,4,'Milestone 4: 8th Floor Roof Slab Casting','2026-12-15',15,5000000.00,0.00,0.00,'UPCOMING','ROOF_SLAB_L8','2026-10-16 22:18:09','2026-10-16 22:18:09'),
(5,1,5,'Milestone 5: Brickwork & Internal Plastering','2027-02-13',15,5000000.00,0.00,0.00,'UPCOMING','BRICKWORK_PLASTER','2026-10-16 22:18:09','2026-10-16 22:18:09'),
(6,1,6,'Milestone 6: Final Possession & Key Handover','2027-06-13',15,10218250.00,0.00,0.00,'UPCOMING','FINAL_HANDOVER','2026-10-16 22:18:09','2026-10-16 22:18:09');

/*Table structure for table `sls_ni138_legal_actions` */

DROP TABLE IF EXISTS `sls_ni138_legal_actions`;

CREATE TABLE `sls_ni138_legal_actions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `pdc_cheque_id` bigint(20) NOT NULL,
  `dishonour_memo_received_date` date NOT NULL,
  `statutory_notice_deadline_date` date NOT NULL,
  `notice_served_to_client_date` date DEFAULT NULL,
  `registered_post_ad_no` varchar(64) DEFAULT NULL,
  `client_30day_settlement_deadline` date DEFAULT NULL,
  `status` varchar(32) NOT NULL,
  `court_case_no` varchar(64) DEFAULT NULL,
  `legal_counsel_name` varchar(128) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_sls_ni138_legal_actions_pdc_cheque_id` (`pdc_cheque_id`),
  KEY `ix_sls_ni138_legal_actions_status` (`status`),
  CONSTRAINT `sls_ni138_legal_actions_ibfk_1` FOREIGN KEY (`pdc_cheque_id`) REFERENCES `sls_pdc_vault` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sls_ni138_legal_actions` */

insert  into `sls_ni138_legal_actions`(`id`,`pdc_cheque_id`,`dishonour_memo_received_date`,`statutory_notice_deadline_date`,`notice_served_to_client_date`,`registered_post_ad_no`,`client_30day_settlement_deadline`,`status`,`court_case_no`,`legal_counsel_name`,`remarks`,`created_at`,`updated_at`) values 
(1,3,'2026-10-06','2026-11-05','2026-10-12','REG-AD-DHAKA-GPO-99412','2026-11-11','NOTICE_SERVED','Draft CR Case u/s 138 (CMM Court Dhaka)','Barrister Tanvir Ahmed (Supreme Court of Bangladesh)','Statutory Notice u/s 138 dispatched via Registered Post with A/D. 30-day criminal liability timer running.','2026-10-16 22:18:09','2026-10-16 22:18:09');

/*Table structure for table `sls_pdc_vault` */

DROP TABLE IF EXISTS `sls_pdc_vault`;

CREATE TABLE `sls_pdc_vault` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `booking_id` bigint(20) NOT NULL,
  `customer_id` bigint(20) NOT NULL,
  `cheque_number` varchar(64) NOT NULL,
  `bank_name` varchar(128) NOT NULL,
  `branch_name` varchar(128) NOT NULL,
  `routing_number` varchar(32) DEFAULT NULL,
  `maturity_date` date NOT NULL,
  `cheque_amount` decimal(14,2) NOT NULL,
  `pouch_barcode` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL,
  `dishonour_memo_date` date DEFAULT NULL,
  `dishonour_reason` varchar(255) DEFAULT NULL,
  `sms_reminder_sent` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_sls_pdc_vault_pouch_barcode` (`pouch_barcode`),
  KEY `ix_sls_pdc_vault_booking_id` (`booking_id`),
  KEY `ix_sls_pdc_vault_maturity_date` (`maturity_date`),
  KEY `ix_sls_pdc_vault_customer_id` (`customer_id`),
  KEY `ix_sls_pdc_vault_status` (`status`),
  KEY `ix_sls_pdc_vault_cheque_number` (`cheque_number`),
  CONSTRAINT `sls_pdc_vault_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `sls_bookings` (`id`),
  CONSTRAINT `sls_pdc_vault_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `crm_customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sls_pdc_vault` */

insert  into `sls_pdc_vault`(`id`,`booking_id`,`customer_id`,`cheque_number`,`bank_name`,`branch_name`,`routing_number`,`maturity_date`,`cheque_amount`,`pouch_barcode`,`status`,`dishonour_memo_date`,`dishonour_reason`,`sms_reminder_sent`,`created_at`,`updated_at`) values 
(1,1,1,'CHQ-EBL-884920','Eastern Bank PLC','Gulshan Branch','095261120','2026-10-19',5000000.00,'PDC-VAULT-2026-0001','IN_VAULT',NULL,NULL,0,'2026-10-16 22:18:09','2026-10-16 22:18:09'),
(2,1,1,'CHQ-EBL-884921','Eastern Bank PLC','Gulshan Branch','095261120','2026-12-15',5000000.00,'PDC-VAULT-2026-0002','IN_VAULT',NULL,NULL,0,'2026-10-16 22:18:09','2026-10-16 22:18:09'),
(3,2,2,'CHQ-SCB-449102','Standard Chartered Bank','Gulshan North Branch','215264881','2026-10-01',4500000.00,'PDC-VAULT-2026-0003','DISHONOURED_BOUNCED','2026-10-06','Insufficient Funds / Drawers Total Balance Deficient',0,'2026-10-16 22:18:09','2026-10-16 22:18:09'),
(4,2,2,'CHQ-CBL-771239','City Bank PLC','Banani Branch','225260811','2026-09-01',3500000.00,'PDC-VAULT-2026-0004','HONOURED',NULL,NULL,0,'2026-10-16 22:18:09','2026-10-16 22:18:09');

/*Table structure for table `sls_unit_transfers` */

DROP TABLE IF EXISTS `sls_unit_transfers`;

CREATE TABLE `sls_unit_transfers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `booking_id` bigint(20) NOT NULL,
  `from_customer_id` bigint(20) NOT NULL,
  `to_customer_id` bigint(20) NOT NULL,
  `transfer_date` date NOT NULL,
  `transfer_fee_bdt` decimal(14,2) NOT NULL,
  `transfer_memo_no` varchar(64) DEFAULT NULL,
  `approval_status` varchar(32) NOT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `from_customer_id` (`from_customer_id`),
  KEY `to_customer_id` (`to_customer_id`),
  KEY `ix_sls_unit_transfers_booking_id` (`booking_id`),
  CONSTRAINT `sls_unit_transfers_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `sls_bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sls_unit_transfers_ibfk_2` FOREIGN KEY (`from_customer_id`) REFERENCES `crm_customers` (`id`),
  CONSTRAINT `sls_unit_transfers_ibfk_3` FOREIGN KEY (`to_customer_id`) REFERENCES `crm_customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sls_unit_transfers` */

insert  into `sls_unit_transfers`(`id`,`booking_id`,`from_customer_id`,`to_customer_id`,`transfer_date`,`transfer_fee_bdt`,`transfer_memo_no`,`approval_status`,`remarks`,`created_at`) values 
(1,2,2,3,'2026-10-10',250000.00,'NOC-TRF-2026-081','COMPLETED','Sub-Registry Mutation NOC granted upon receipt of developer transfer endorsement fees.','2026-10-16 22:18:09');

/*Table structure for table `sys_audit_trails` */

DROP TABLE IF EXISTS `sys_audit_trails`;

CREATE TABLE `sys_audit_trails` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `user_id` bigint(20) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `microservice_name` varchar(64) NOT NULL,
  `entity_name` varchar(64) NOT NULL,
  `entity_id` varchar(64) DEFAULT NULL,
  `action_type` enum('CREATE','UPDATE','DELETE','CUSTOM') NOT NULL,
  `payload_before` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload_before`)),
  `payload_after` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`payload_after`)),
  PRIMARY KEY (`id`,`created_at`),
  KEY `ix_sys_audit_trails_entity_name` (`entity_name`),
  KEY `ix_sys_audit_trails_user_id` (`user_id`),
  KEY `idx_audit_user_created` (`user_id`,`created_at`),
  KEY `idx_audit_entity_name_id` (`entity_name`,`entity_id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
 PARTITION BY RANGE (year(`created_at`))
(PARTITION `p2023` VALUES LESS THAN (2024) ENGINE = InnoDB,
 PARTITION `p2024` VALUES LESS THAN (2025) ENGINE = InnoDB,
 PARTITION `p2025` VALUES LESS THAN (2026) ENGINE = InnoDB,
 PARTITION `p2026` VALUES LESS THAN (2027) ENGINE = InnoDB,
 PARTITION `p2027` VALUES LESS THAN (2028) ENGINE = InnoDB,
 PARTITION `p_max` VALUES LESS THAN MAXVALUE ENGINE = InnoDB);

/*Data for the table `sys_audit_trails` */

insert  into `sys_audit_trails`(`id`,`created_at`,`user_id`,`ip_address`,`microservice_name`,`entity_name`,`entity_id`,`action_type`,`payload_before`,`payload_after`) values 
(2,'2026-10-16 20:28:38',1,'127.0.0.1','erp-core-gateway','lookups','categories','CREATE','null','{\"category_code\": \"TEST_CAT_EFD55FAB\", \"category_name\": \"Test Trade Categories\", \"is_active\": true}'),
(3,'2026-10-16 20:28:38',1,'127.0.0.1','erp-core-gateway','lookups','TEST_CAT_EFD55FAB','CREATE','null','{\"item_name\": \"Aluminium Fabrication & Curtain Walls\"}'),
(4,'2026-10-16 20:28:38',1,'127.0.0.1','erp-core-gateway','lookups','TEST_CAT_EFD55FAB','CREATE','null','{\"item_name\": \"Glass & Glazing Solutions\"}'),
(5,'2026-10-16 20:28:50',1,'127.0.0.1','erp-core-gateway','lookups','categories','CREATE','null','{\"category_code\": \"TEST_CAT_0BF57551\", \"category_name\": \"Test Trade Categories\", \"is_active\": true}'),
(6,'2026-10-16 20:28:52',1,'127.0.0.1','erp-core-gateway','lookups','TEST_CAT_0BF57551','CREATE','null','{\"item_name\": \"Aluminium Fabrication & Curtain Walls\"}'),
(7,'2026-10-16 20:28:52',1,'127.0.0.1','erp-core-gateway','lookups','TEST_CAT_0BF57551','CREATE','null','{\"item_name\": \"Glass & Glazing Solutions\"}'),
(8,'2026-10-16 20:37:02',1,'127.0.0.1','erp-core-gateway','lookups','categories','CREATE','null','{\"category_code\": \"TEST_CAT_6F5CE2EB\", \"category_name\": \"Test Trade Categories\", \"is_active\": true}'),
(9,'2026-10-16 20:37:05',1,'127.0.0.1','erp-core-gateway','lookups','TEST_CAT_6F5CE2EB','CREATE','null','{\"item_name\": \"Aluminium Fabrication & Curtain Walls\"}'),
(10,'2026-10-16 20:37:05',1,'127.0.0.1','erp-core-gateway','lookups','TEST_CAT_6F5CE2EB','CREATE','null','{\"item_name\": \"Glass & Glazing Solutions\"}'),
(11,'2026-10-16 20:43:04',1,'127.0.0.1','erp-core-gateway','installments','cron','CREATE','null','{}'),
(12,'2026-10-16 20:43:51',1,'127.0.0.1','erp-core-gateway','auth','logout','CREATE','null','{}'),
(13,'2026-10-16 20:44:02',1,'127.0.0.1','erp-core-gateway','auth','logout','CREATE','null','{}'),
(14,'2026-10-16 21:39:33',1,'127.0.0.1','erp-core-gateway','auth','logout','CREATE','null','{}'),
(15,'2026-10-16 21:41:51',1,'127.0.0.1','erp-core-gateway','auth','logout','CREATE','null','{}'),
(16,'2026-10-16 21:43:49',1,'127.0.0.1','erp-core-gateway','auth','logout','CREATE','null','{}'),
(17,'2026-10-16 21:43:54',2,'127.0.0.1','erp-core-gateway','auth','logout','CREATE','null','{}'),
(18,'2026-10-16 21:44:44',1,'127.0.0.1','erp-core-gateway','auth','logout','CREATE','null','{}');

/*Table structure for table `sys_lookup_categories` */

DROP TABLE IF EXISTS `sys_lookup_categories`;

CREATE TABLE `sys_lookup_categories` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `category_code` varchar(64) NOT NULL,
  `category_name` varchar(128) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_hierarchical` tinyint(1) DEFAULT NULL,
  `is_system_locked` tinyint(1) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_sys_lookup_categories_category_code` (`category_code`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sys_lookup_categories` */

insert  into `sys_lookup_categories`(`id`,`category_code`,`category_name`,`description`,`is_hierarchical`,`is_system_locked`,`is_active`,`created_at`,`updated_at`) values 
(1,'TEST_TRADE_CATEGORIES','Test Trade Categories',NULL,0,0,1,'2026-10-16 20:17:18','2026-10-16 20:17:18'),
(2,'LAND_SURVEY_TYPE','Land Survey Types (Bangladesh)','Historic and active Bangladesh land survey khatian types',0,1,1,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(3,'LAND_CLASS','Land Class / Category (জমি শ্রেণি)','Sub-Registry & AC Land classification of land in Bangladesh',0,1,1,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(4,'LAND_MEASUREMENT_UNIT','Land Measurement Units','Standard land area units used across Bangladesh',0,1,1,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(5,'UNIT_FACING','Apartment / Unit Facing & Orientation','Directional orientation of flat/plot units',0,1,1,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(6,'UNIT_STATUS','Property Inventory Availability Status','Lifecycle state of apartment/commercial floor space',0,1,1,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(7,'DEV_AUTHORITY','Development Authorities (Bangladesh)','City development & building approval authorities',0,1,1,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(8,'PAYMENT_MODE','Payment Modes & Gateways (Bangladesh)','Accepted transaction and collection channels',0,1,1,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(9,'TEST_CAT_1A00B120','Test Trade Categories',NULL,0,0,1,'2026-10-16 20:28:07','2026-10-16 20:28:07'),
(10,'TEST_CAT_EFD55FAB','Test Trade Categories',NULL,0,0,1,'2026-10-16 20:28:38','2026-10-16 20:28:38'),
(11,'TEST_CAT_0BF57551','Test Trade Categories',NULL,0,0,1,'2026-10-16 20:28:50','2026-10-16 20:28:50'),
(12,'TEST_CAT_6F5CE2EB','Test Trade Categories',NULL,0,0,1,'2026-10-16 20:37:02','2026-10-16 20:37:02');

/*Table structure for table `sys_lookup_items` */

DROP TABLE IF EXISTS `sys_lookup_items`;

CREATE TABLE `sys_lookup_items` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `category_id` bigint(20) NOT NULL,
  `item_code` varchar(64) NOT NULL,
  `item_name_en` varchar(191) NOT NULL,
  `item_name_bn` varchar(191) NOT NULL,
  `parent_id` bigint(20) DEFAULT NULL,
  `color_badge` varchar(32) DEFAULT NULL,
  `sort_order` int(11) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `is_default` tinyint(1) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_by` bigint(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `sys_lookup_items_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `sys_lookup_categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sys_lookup_items_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `sys_lookup_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sys_lookup_items` */

insert  into `sys_lookup_items`(`id`,`category_id`,`item_code`,`item_name_en`,`item_name_bn`,`parent_id`,`color_badge`,`sort_order`,`metadata`,`is_default`,`is_active`,`created_by`,`created_at`,`updated_at`) values 
(1,2,'CS','Cadastral Survey (CS)','সিএস (ক্যাডাস্ট্রাল সার্ভে)',NULL,'#64748B',1,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(2,2,'SA','State Acquisition Survey (SA)','এসএ (স্টেট একুইজিশন)',NULL,'#64748B',2,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(3,2,'RS','Revisional Survey (RS)','আরএস (রিভিশনাল সার্ভে)',NULL,'#0EA5E9',3,'null',1,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(4,2,'BS_CITY','BS / City Survey','বিএস / সিটি জরিপ',NULL,'#10B981',4,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(5,2,'MUTATION','Mutation Khatian (Namjari)','নামজারি খতিয়ান',NULL,'#8B5CF6',5,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(6,3,'NAL','Nal (Agricultural Low Land)','নাল',NULL,'#10B981',1,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(7,3,'BHITI','Bhiti / High Land','ভিটি',NULL,'#F59E0B',2,'null',1,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(8,3,'COMMERCIAL','Commercial Land','বাণিজ্যিক',NULL,'#3B82F6',3,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(9,3,'RESIDENTIAL','Residential Land (Bastu)','বাস্তু / আবাসিক',NULL,'#8B5CF6',4,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(10,3,'NALJOMI','Nal Jomi (Cultivable)','নালজমি',NULL,'#84CC16',5,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(11,3,'DOBA_POND','Pond / Low Waterbody','পুকুর / ডোবা',NULL,'#06B6D4',6,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(12,4,'KATHA','Katha','কাঠা',NULL,'#6366F1',1,'{\"sqft_ratio\": 720.0}',1,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(13,4,'DECIMAL','Decimal / Shotok','শতাংশ / শতক',NULL,'#6366F1',2,'{\"sqft_ratio\": 435.6}',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(14,4,'BIGHA','Bigha (20 Katha)','বিঘা',NULL,'#6366F1',3,'{\"sqft_ratio\": 14400.0}',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(15,4,'ACRE','Acre (100 Decimal)','একর',NULL,'#6366F1',4,'{\"sqft_ratio\": 43560.0}',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(16,4,'SQFT','Square Feet','বর্গফুট',NULL,'#64748B',5,'{\"sqft_ratio\": 1.0}',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(17,5,'SOUTH_FACING','South-Facing','দক্ষিণমুখী',NULL,'#10B981',1,'null',1,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(18,5,'NORTH_FACING','North-Facing','উত্তরমুখী',NULL,'#64748B',2,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(19,5,'EAST_FACING','East-Facing','পূর্বমুখী',NULL,'#F59E0B',3,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(20,5,'WEST_FACING','West-Facing','পশ্চিমমুখী',NULL,'#F97316',4,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(21,5,'LAKE_VIEW','Lake-View','লেক ভিউ',NULL,'#06B6D4',5,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(22,5,'CORNER_PLOT','Corner-Plot / Multi-Facing','কর্ণার প্লট',NULL,'#8B5CF6',6,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(23,5,'ROAD_FACING','Main Road Facing','মেইন রোড ফেসিং',NULL,'#3B82F6',7,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(24,6,'AVAILABLE','Available for Sale','বিক্রয়যোগ্য',NULL,'#10B981',1,'null',1,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(25,6,'ON_HOLD','On-Hold (Temporary Lock)','হোল্ড (লক)',NULL,'#F59E0B',2,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(26,6,'BOOKED','Booked (Down-payment Received)','বুকড',NULL,'#3B82F6',3,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(27,6,'SOLD','Sold (Allotment Issued)','বিক্রীত',NULL,'#EF4444',4,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(28,6,'LANDOWNER_SHARE','Landowner-Share','জমির মালিকের অংশ',NULL,'#8B5CF6',5,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(29,6,'HANDED_OVER','Handed Over','হস্তান্তরিত',NULL,'#065F46',6,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(30,7,'RAJUK','RAJUK (Rajdhani Unnayan Kartripakkha)','রাজউক (রাজধানী উন্নয়ন কর্তৃপক্ষ)',NULL,'#DC2626',1,'null',1,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(31,7,'CDA','CDA (Chattogram Development Authority)','সিডিএ (চট্টগ্রাম উন্নয়ন কর্তৃপক্ষ)',NULL,'#2563EB',2,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(32,7,'KDA','KDA (Khulna Development Authority)','কেডিএ (খুলনা উন্নয়ন কর্তৃপক্ষ)',NULL,'#059669',3,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(33,7,'RDA','RDA (Rajshahi Development Authority)','আরডিএ (রাজশাহী উন্নয়ন কর্তৃপক্ষ)',NULL,'#D97706',4,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(34,7,'CANTONMENT','Cantonment Board / Military Estate','সেনানিবাস পর্ষদ / সামরিক এস্টেট',NULL,'#4B5563',5,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(35,7,'MUNICIPALITY','Pourashava / City Corporation','পৌরসভা / সিটি কর্পোরেশন',NULL,'#4F46E5',6,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(36,8,'CASH','Cash (In Hand / Receipt)','নগদ',NULL,'#10B981',1,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(37,8,'CHEQUE','Cheque (Clearing)','চেক',NULL,'#3B82F6',2,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(38,8,'PAY_ORDER','Pay Order / Banker\'s Cheque','পে অর্ডার',NULL,'#6366F1',3,'null',1,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(39,8,'BKASH','bKash MFS','বিকাশ',NULL,'#E11D48',4,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(40,8,'NAGAD','Nagad MFS','নগদ (এমএফএস)',NULL,'#EA580C',5,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(41,8,'BANK_TRANSFER','Bank Transfer (NPSB / BEFTN / RTGS)','ব্যাংক ট্রান্সফার',NULL,'#0284C7',6,'null',0,1,NULL,'2026-10-16 20:24:32','2026-10-16 20:24:32'),
(42,1,'ALUMINIUM_FABRICATION__CURTAIN_WALLS','Aluminium Fabrication & Curtain Walls','Aluminium Fabrication & Curtain Walls',NULL,NULL,99,NULL,0,1,NULL,'2026-10-16 20:26:57','2026-10-16 20:26:57'),
(43,1,'ALUMINIUM_FABRICATION_CURTAIN_WALLS','Aluminium Fabrication & Curtain Walls','Aluminium Fabrication & Curtain Walls',NULL,NULL,99,NULL,0,1,NULL,'2026-10-16 20:27:27','2026-10-16 20:27:27'),
(44,1,'GLASS_GLAZING_SOLUTIONS','Glass & Glazing Solutions','Glass & Glazing Solutions',NULL,NULL,99,NULL,0,1,NULL,'2026-10-16 20:27:28','2026-10-16 20:27:28'),
(45,10,'ALUMINIUM_FABRICATION_CURTAIN_WALLS','Aluminium Fabrication & Curtain Walls','Aluminium Fabrication & Curtain Walls',NULL,NULL,99,NULL,0,1,NULL,'2026-10-16 20:28:38','2026-10-16 20:28:38'),
(46,10,'GLASS_GLAZING_SOLUTIONS','Glass & Glazing Solutions','Glass & Glazing Solutions',NULL,NULL,99,NULL,0,1,NULL,'2026-10-16 20:28:38','2026-10-16 20:28:38'),
(47,11,'ALUMINIUM_FABRICATION_CURTAIN_WALLS','Aluminium Fabrication & Curtain Walls','Aluminium Fabrication & Curtain Walls',NULL,NULL,99,NULL,0,1,NULL,'2026-10-16 20:28:50','2026-10-16 20:28:50'),
(48,11,'GLASS_GLAZING_SOLUTIONS','Glass & Glazing Solutions','Glass & Glazing Solutions',NULL,NULL,99,NULL,0,1,NULL,'2026-10-16 20:28:52','2026-10-16 20:28:52'),
(49,12,'ALUMINIUM_FABRICATION_CURTAIN_WALLS','Aluminium Fabrication & Curtain Walls','Aluminium Fabrication & Curtain Walls',NULL,NULL,99,NULL,0,1,NULL,'2026-10-16 20:37:02','2026-10-16 20:37:02'),
(50,12,'GLASS_GLAZING_SOLUTIONS','Glass & Glazing Solutions','Glass & Glazing Solutions',NULL,NULL,99,NULL,0,1,NULL,'2026-10-16 20:37:05','2026-10-16 20:37:05');

/*Table structure for table `sys_organizations` */

DROP TABLE IF EXISTS `sys_organizations`;

CREATE TABLE `sys_organizations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `organization_code` varchar(32) NOT NULL,
  `legal_name_en` varchar(191) NOT NULL,
  `legal_name_bn` varchar(191) NOT NULL,
  `tin_number` varchar(64) DEFAULT NULL,
  `bin_vat_number` varchar(64) DEFAULT NULL,
  `rehab_membership_number` varchar(64) DEFAULT NULL,
  `parent_organization_id` bigint(20) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_sys_organizations_organization_code` (`organization_code`),
  KEY `parent_organization_id` (`parent_organization_id`),
  CONSTRAINT `sys_organizations_ibfk_1` FOREIGN KEY (`parent_organization_id`) REFERENCES `sys_organizations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sys_organizations` */

insert  into `sys_organizations`(`id`,`organization_code`,`legal_name_en`,`legal_name_bn`,`tin_number`,`bin_vat_number`,`rehab_membership_number`,`parent_organization_id`,`is_active`,`created_at`,`updated_at`) values 
(1,'NAVANA_GROUP','Navana & Bay Real Estate Consortium Ltd.','নাভানা অ্যান্ড বে রিয়েল এস্টেট কনসোর্টিয়াম লি.','123456789012','9876543210123','REHAB-DHK-2011',NULL,1,'2026-10-16 20:24:24','2026-10-16 20:24:24'),
(2,'BAY_DEV','Bay Development & Construction Ltd.','বে ডেভেলপমেন্ট অ্যান্ড কনস্ট্রাকশন লি.','888777666555','5554443332211','REHAB-CTG-1044',1,1,'2026-10-16 20:24:24','2026-10-16 20:24:24');

/*Table structure for table `sys_roles` */

DROP TABLE IF EXISTS `sys_roles`;

CREATE TABLE `sys_roles` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `role_code` varchar(64) NOT NULL,
  `role_name` varchar(128) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_sys_roles_role_code` (`role_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sys_roles` */

insert  into `sys_roles`(`id`,`role_code`,`role_name`,`description`,`is_active`,`created_at`) values 
(1,'GROUP_ADMIN','Group Super Administrator','Unrestricted group-wide access',1,'2026-10-16 20:24:25'),
(2,'PROJECT_DIRECTOR','Project Director','Senior strategic director',1,'2026-10-16 20:24:25'),
(3,'PROJECT_MANAGER','Project Manager / In-Charge','Project operations in-charge',1,'2026-10-16 20:24:25'),
(4,'SALES_MANAGER','Sales & Marketing Manager','Customer CRM & unit sales',1,'2026-10-16 20:24:25'),
(5,'ACCOUNTS_OFFICER','Accounts & Finance Officer','Ledgers, invoices & money receipts',1,'2026-10-16 20:24:25'),
(6,'SITE_ENGINEER','Civil Site Engineer','Site QA/QC, progress & materials',1,'2026-10-16 20:24:25');

/*Table structure for table `sys_user_project_assignments` */

DROP TABLE IF EXISTS `sys_user_project_assignments`;

CREATE TABLE `sys_user_project_assignments` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) NOT NULL,
  `project_id` bigint(20) NOT NULL,
  `role_code` varchar(64) NOT NULL,
  `can_view_financials` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `ix_sys_user_project_assignments_project_id` (`project_id`),
  CONSTRAINT `sys_user_project_assignments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `sys_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sys_user_project_assignments` */

insert  into `sys_user_project_assignments`(`id`,`user_id`,`project_id`,`role_code`,`can_view_financials`,`created_at`) values 
(1,1,101,'GROUP_ADMIN',1,'2026-10-16 20:24:25'),
(2,1,102,'GROUP_ADMIN',1,'2026-10-16 20:24:25'),
(3,2,101,'SITE_ENGINEER',0,'2026-10-16 20:24:25');

/*Table structure for table `sys_users` */

DROP TABLE IF EXISTS `sys_users`;

CREATE TABLE `sys_users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `organization_id` bigint(20) NOT NULL,
  `username` varchar(64) NOT NULL,
  `email` varchar(191) NOT NULL,
  `phone_number` varchar(32) DEFAULT NULL,
  `hashed_password` varchar(255) NOT NULL,
  `full_name_en` varchar(128) NOT NULL,
  `full_name_bn` varchar(128) NOT NULL,
  `is_group_admin` tinyint(1) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_sys_users_email` (`email`),
  UNIQUE KEY `ix_sys_users_username` (`username`),
  KEY `organization_id` (`organization_id`),
  CONSTRAINT `sys_users_ibfk_1` FOREIGN KEY (`organization_id`) REFERENCES `sys_organizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

/*Data for the table `sys_users` */

insert  into `sys_users`(`id`,`organization_id`,`username`,`email`,`phone_number`,`hashed_password`,`full_name_en`,`full_name_bn`,`is_group_admin`,`is_active`,`created_at`,`updated_at`) values 
(1,1,'admin','admin@realestate-erp.bd','+8801700000001','$2b$12$5GCUkEm0wM/e8cY.wAZ28OipkxwaIdhcG8Oq/Ev.bEhI/YqOrLyy2','Principal Administrator','প্রধান প্রশাসক',1,1,'2026-10-16 20:24:25','2026-10-16 20:24:25'),
(2,2,'engineer_kamal','kamal@realestate-erp.bd','+8801700000002','$2b$12$2WYrUtdRtu5dBb5yXuFldehUBffcLjr81/LJwKG5Sv9hjiTgn3WGC','Engr. Kamal Hossain','প্রকৌ. কামাল হোসেন',0,1,'2026-10-16 20:24:25','2026-10-16 20:24:25'),
(3,1,'project_dir','shamsul.arefin@apex-realestate.com','+8801713998811','$2b$12$5GCUkEm0wM/e8cY.wAZ28OipkxwaIdhcG8Oq/Ev.bEhI/YqOrLyy2','Engr. Shamsul Arefin','প্রকৌঃ শামসুল আরেফিন',0,1,'2026-10-16 22:18:08','2026-10-16 22:18:08'),
(4,1,'head_accounts','nurul.huda@apex-realestate.com','+8801713998822','$2b$12$5GCUkEm0wM/e8cY.wAZ28OipkxwaIdhcG8Oq/Ev.bEhI/YqOrLyy2','Mohammad Nurul Huda, FCA','মোহাম্মদ নুরুল হুদা',0,1,'2026-10-16 22:18:08','2026-10-16 22:18:08'),
(5,1,'site_store_officer','zahid.hasan@apex-realestate.com','+8801713998833','$2b$12$5GCUkEm0wM/e8cY.wAZ28OipkxwaIdhcG8Oq/Ev.bEhI/YqOrLyy2','Md. Zahid Hasan','মোঃ জাহিদ হাসান',0,1,'2026-10-16 22:18:08','2026-10-16 22:18:08'),
(6,1,'qa_qc_engineer','tanvir.qc@apex-realestate.com','+8801713998844','$2b$12$5GCUkEm0wM/e8cY.wAZ28OipkxwaIdhcG8Oq/Ev.bEhI/YqOrLyy2','Engr. Tanvir Ahmed','প্রকৌঃ তানভীর আহমেদ',0,1,'2026-10-16 22:18:08','2026-10-16 22:18:08');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
