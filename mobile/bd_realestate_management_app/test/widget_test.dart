import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bd_realestate_management_app/main.dart';
import 'package:bd_realestate_management_app/core/security/biometric_service.dart';
import 'package:bd_realestate_management_app/models/approval_item.dart';
import 'package:bd_realestate_management_app/models/scurve_data.dart';
import 'package:bd_realestate_management_app/models/cash_flow_forecast.dart';
import 'package:bd_realestate_management_app/screens/bi_cockpit_screen.dart';
import 'package:bd_realestate_management_app/screens/approval_center_screen.dart';
import 'package:bd_realestate_management_app/screens/scurve_radar_screen.dart';
import 'package:bd_realestate_management_app/screens/cashflow_forecast_screen.dart';

void main() {
  setUp(() {
    BiometricService().lock();
  });

  group('1. Biometric Security Gate Tests', () {
    testWidgets('Cold-start locks app behind Biometric Gate and unlocks with Face ID', (WidgetTester tester) async {
      await tester.pumpWidget(const BdRealestateManagementApp());
      await tester.pump();

      // Verify gate is displayed
      expect(find.text('EXECUTIVE BI COCKPIT'), findsOneWidget);
      expect(find.text('Managing Director & Board Portal'), findsOneWidget);
      expect(find.text('Unlock with Biometrics'), findsOneWidget);

      // Tap Unlock with Biometrics
      await tester.tap(find.text('Unlock with Biometrics'));
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pumpAndSettle();

      // App should be unlocked and display BI Cockpit
      expect(find.text('Bangladesh Enterprise Radar'), findsOneWidget);
      expect(find.text('FINANCIAL POSITION IN BDT'), findsOneWidget);

      // Tap lock action in AppBar
      await tester.tap(find.byIcon(Icons.lock_outline));
      await tester.pumpAndSettle();

      // App should lock back to Biometric Gate
      expect(find.text('Managing Director & Board Portal'), findsOneWidget);
    });
  });

  group('2. Executive BI Cockpit (BDT Metrics) Tests', () {
    testWidgets('Displays all top financial KPIs and liquid bank balances in BDT', (WidgetTester tester) async {
      BiometricService().unlock();
      await tester.pumpWidget(
        const MaterialApp(home: BiCockpitScreen()),
      );
      await tester.pumpAndSettle();

      // Top KPI Cards
      expect(find.text("Today's Sales"), findsOneWidget);
      expect(find.text('৳ 4.80 Cr'), findsOneWidget);

      expect(find.text('Month Collection'), findsOneWidget);
      expect(find.text('৳ 21.50 Cr'), findsOneWidget);

      expect(find.text('Total Overdue'), findsOneWidget);
      expect(find.text('৳ 9.45 Cr'), findsOneWidget);

      expect(find.text('Unsold Inventory'), findsOneWidget);
      expect(find.text('৳ 185.0 Cr'), findsOneWidget);

      // Liquid Bank Balances
      expect(find.text('Liquid Cash & Bank Balances'), findsOneWidget);
      expect(find.text('৳ 38.20 Cr'), findsOneWidget);
      expect(find.text('Prime Bank Ltd'), findsOneWidget);
      expect(find.text('Eastern Bank PLC'), findsOneWidget);
      expect(find.text('Dutch-Bangla Bank PLC'), findsOneWidget);
      expect(find.text('The City Bank Ltd'), findsOneWidget);
    });
  });

  group('3. Universal 1-Tap Biometric Approval Center Tests', () {
    test('ApprovalItem model captures category, discount waiver >3%, and margin impact', () {
      final item = ApprovalItem(
        id: 'APR-TEST',
        title: '7.5% Sales Discount Exception',
        category: ApprovalCategory.discountException,
        discountPercent: 7.5,
        project: 'Green Horizon Tower',
        subject: 'Flat A-7',
        amountBdt: 18500000.0,
        marginImpactBdt: 462500.0,
        requestedBy: 'Head of Sales',
        submissionDate: DateTime.now(),
        details: 'Margin impact tested',
      );

      expect(item.discountPercent, equals(7.5));
      expect(item.discountPercent! > 3.0, isTrue);
      expect(item.marginImpactBdt, equals(462500.0));
      expect(item.categoryLabel, equals('DISCOUNT EXCEPTION'));
      expect(item.isApproved, isFalse);
    });

    testWidgets('Displays approvals, filters categories, and authorises with Biometrics', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: ApprovalCenterScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Executive Approval Center'), findsOneWidget);

      // Verify discount waiver exceeds 3% threshold chip
      expect(find.textContaining('DISCOUNT WAIVER: 7.5% (Exceeds >3.0% Sales Ceiling)'), findsOneWidget);
      expect(find.text('Purchase Order & CS: BSRM 500W Rebar (250 MT)'), findsOneWidget);

      // Tap 1-Tap Biometric Approval button on first item
      final approveBtn = find.text('1-Tap Approve').first;
      await tester.tap(approveBtn);
      await tester.pumpAndSettle();

      // Biometric modal sheet should appear
      expect(find.text('MD BIOMETRIC APPROVAL'), findsOneWidget);
      expect(find.textContaining('BDT ৳ 18500000'), findsOneWidget);

      // Tap Authorize button on sheet
      await tester.tap(find.text('Authorize'));
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pump(const Duration(milliseconds: 700));
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pumpAndSettle();

      // Verified approval badge should replace button
      expect(find.text('AUTHORIZED (FACE ID)'), findsOneWidget);
    });
  });

  group('4. Construction S-Curve Radar Tests', () {
    test('ProjectSCurve validates EVM metrics', () {
      const scurve = ProjectSCurve(
        projectName: 'Green Horizon Tower',
        location: 'Gulshan-2',
        overallPlanned: 58.0,
        overallActual: 56.4,
        scheduleVariance: -1.6,
        cpi: 1.04,
        spi: 0.97,
        points: [],
      );

      expect(scurve.overallPlanned, equals(58.0));
      expect(scurve.overallActual, equals(56.4));
      expect(scurve.scheduleVariance, equals(-1.6));
      expect(scurve.cpi, equals(1.04));
      expect(scurve.spi, equals(0.97));
    });

    testWidgets('Renders S-Curve Radar screen with EVM KPIs and milestone checklist', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: SCurveRadarScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Construction S-Curve Radar'), findsOneWidget);
      expect(find.text('Green Horizon Tower (Gulshan-2)'), findsOneWidget);
      expect(find.text('S-CURVE PROGRESS RADAR'), findsOneWidget);
      expect(find.text('EARNED VALUE MANAGEMENT (EVM)'), findsOneWidget);
      expect(find.text('CPI (Cost)'), findsOneWidget);
      expect(find.text('1.04'), findsOneWidget);
      expect(find.text('Under Budget'), findsOneWidget);
      expect(find.text('SPI (Schedule)'), findsOneWidget);
      expect(find.text('0.97'), findsOneWidget);
      expect(find.text('Minor Delay (4d)'), findsOneWidget);
      expect(find.text('-1.6%'), findsOneWidget);
    });
  });

  group('5. 90-Day Cash Flow Forecast Tests', () {
    test('NinetyDayForecast calculates inflows, outflows, and ending liquidity correctly', () {
      const forecast = NinetyDayForecast(
        liquidCashBalanceBdt: 382000000.0, // 38.20 Cr
        buckets: [
          CashFlowBucket(
            periodName: 'Next 30 Days (M1)',
            projectedInflowsBdt: 84000000.0,
            contractorLiabilitiesBdt: 32000000.0,
            materialProcurementBdt: 18000000.0,
            debtRepaymentsBdt: 12000000.0,
          ),
          CashFlowBucket(
            periodName: 'Day 31 - 60 (M2)',
            projectedInflowsBdt: 91000000.0,
            contractorLiabilitiesBdt: 38000000.0,
            materialProcurementBdt: 22000000.0,
            debtRepaymentsBdt: 18000000.0,
          ),
          CashFlowBucket(
            periodName: 'Day 61 - 90 (M3)',
            projectedInflowsBdt: 115000000.0,
            contractorLiabilitiesBdt: 42000000.0,
            materialProcurementBdt: 29000000.0,
            debtRepaymentsBdt: 18000000.0,
          ),
        ],
      );

      expect(forecast.total90DayInflow, equals(290000000.0)); // 29.0 Cr
      expect(forecast.total90DayOutflow, equals(229000000.0)); // 22.9 Cr
      expect(forecast.projectedEndingLiquidity, equals(443000000.0)); // 44.3 Cr
    });

    testWidgets('Renders 90-day cash flow forecast screen with period breakdown buckets', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: CashFlowForecastScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('90-Day Cash Flow Forecast'), findsOneWidget);
      expect(find.text('PROJECTED DAY-90 LIQUIDITY'), findsOneWidget);
      expect(find.text('90-Day Collections'), findsOneWidget);
      expect(find.text('90-Day Liabilities'), findsOneWidget);
      expect(find.text('3-MONTH ROLLING LIQUIDITY BREAKDOWN'), findsOneWidget);
      expect(find.text('Next 30 Days (M1)'), findsOneWidget);
      expect(find.text('Day 31 - 60 (M2)'), findsOneWidget);
      expect(find.text('Day 61 - 90 (M3)'), findsOneWidget);
    });
  });
}
