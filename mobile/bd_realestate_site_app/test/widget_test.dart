import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:bd_realestate_site_app/main.dart';
import 'package:bd_realestate_site_app/core/offline/offline_sync_queue.dart';
import 'package:bd_realestate_site_app/models/labor_muster.dart';
import 'package:bd_realestate_site_app/models/cube_test.dart';
import 'package:bd_realestate_site_app/models/store_grn.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('Construction Tech Site App Tests', () {
    testWidgets('Site app boots and displays navigation tabs', (WidgetTester tester) async {
      await tester.pumpWidget(const BdRealestateSiteApp());
      await tester.pump();

      expect(find.text('SITE OPERATIONS HUB'), findsOneWidget);
      expect(find.text('DPR'), findsOneWidget);
      expect(find.text('Labor'), findsOneWidget);
      expect(find.text('Cubes'), findsOneWidget);
      expect(find.text('Stores'), findsOneWidget);

      await tester.pumpWidget(const SizedBox());
    });

    test('OfflineSyncQueue properly enqueues records and tracks pending sync items', () async {
      final queue = OfflineSyncQueue();
      queue.setConnectivity(false); // test offline mode

      final initialPending = queue.pendingCount;

      queue.enqueue('DPR', {
        'project': 'Green Horizon Tower',
        'concrete_cft': 350.0,
        'rod_mt': 5.2,
      });

      expect(queue.pendingCount, initialPending + 1);
      final latest = queue.pendingItems.first;
      expect(latest.type, 'DPR');
      expect(latest.isSynced, isFalse);
    });

    test('LaborMusterRoll calculates trade wages and overtime correctly', () {
      final muster = LaborMusterRoll(
        id: 'M-01',
        subcontractorName: 'Anwar Steel Ltd',
        tradeScope: 'RCC Casting',
        rodBinders: 10,  // 10 * 900 = 9000
        masons: 5,       // 5 * 950 = 4750
        carpenters: 5,   // 5 * 900 = 4500
        plumbers: 2,     // 2 * 900 = 1800
        helpers: 10,     // 10 * 650 = 6500
        overtimeHours: 2.0,
        date: DateTime.now(),
      );

      expect(muster.totalHeadcount, 32);
      expect(muster.baseDailyWageTotal, 26550.0);
      expect(muster.grossDailyWageTotal, greaterThan(26550.0));
    });

    test('ConcreteCubeTest calculates age in days and Day 7, 14, 28 milestone alerts', () {
      final day7Test = ConcreteCubeTest(
        sampleCode: 'CUBE-07',
        projectName: 'Green Horizon',
        structuralElement: '8th Floor Column',
        castingDate: DateTime.now().subtract(const Duration(days: 7)),
        mixDesign: '1:1.5:3',
        slumpMm: 95,
        status: 'PENDING',
      );

      expect(day7Test.ageInDays, 7);
      expect(day7Test.isDay7Due, isTrue);
      expect(day7Test.isDay28Due, isFalse);

      final day28Test = ConcreteCubeTest(
        sampleCode: 'CUBE-28',
        projectName: 'Green Horizon',
        structuralElement: '7th Floor Slab',
        castingDate: DateTime.now().subtract(const Duration(days: 28)),
        mixDesign: '1:1.5:3',
        slumpMm: 100,
        day7StrengthPsi: 2450,
        day14StrengthPsi: 3100,
        day28StrengthPsi: 3750,
        status: 'PASSED',
      );

      expect(day28Test.ageInDays, 28);
      expect(day28Test.isDay28Due, isFalse); // already tested
      expect(day28Test.currentStageLabel, contains('Day 28 Completed'));
    });

    test('StoreGrnChallan stores PO number and verification status', () {
      final grn = StoreGrnChallan(
        id: 'GRN-101',
        challanNumber: 'CH-9921',
        purchaseOrderNumber: 'PO-2026-BSRM-0442',
        truckNumber: 'DHAKA METRO-TA 11-4890',
        supplierName: 'BSRM Steels Ltd',
        materialName: '20mm 500W TMT Rebar',
        quantityReceived: 22.5,
        unitOfMeasure: 'MT',
        receivedDate: DateTime.now(),
        driverName: 'Rafiqul Islam',
      );

      expect(grn.isPoMatched, isTrue);
      expect(grn.hasPhysicalInspectionPassed, isTrue);
      expect(grn.hasWeightBridgeSlipAttached, isTrue);
    });
  });
}
