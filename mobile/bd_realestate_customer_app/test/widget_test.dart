import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bd_realestate_customer_app/main.dart';
import 'package:bd_realestate_customer_app/screens/property_portfolio_screen.dart';
import 'package:bd_realestate_customer_app/screens/construction_tracker_screen.dart';
import 'package:bd_realestate_customer_app/screens/financial_center_screen.dart';
import 'package:bd_realestate_customer_app/screens/snagging_tool_screen.dart';
import 'package:bd_realestate_customer_app/screens/dlp_helpdesk_screen.dart';

void main() {
  testWidgets('1. Navigation Bar switches tabs correctly', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(const BdRealestateCustomerApp());
    await tester.pumpAndSettle();

    expect(find.text('CUSTOMER SELF-SERVICE'), findsOneWidget);
    expect(find.text('Green Horizon Residence'), findsOneWidget);

    // Switch to My Unit
    await tester.tap(find.text('My Unit'));
    await tester.pumpAndSettle();
    expect(find.text('My Property Portfolio'), findsOneWidget);

    // Switch to Progress
    await tester.tap(find.text('Progress'));
    await tester.pumpAndSettle();
    expect(find.text('Live Construction Progress'), findsOneWidget);

    // Switch to Financials
    await tester.tap(find.text('Financials'));
    await tester.pumpAndSettle();
    expect(find.text('Financial Center & Payments'), findsOneWidget);

    // Switch to Snags
    await tester.tap(find.text('Snags'));
    await tester.pumpAndSettle();
    expect(find.text('Pre-Handover Snagging Tool'), findsOneWidget);

    // Switch to Support
    await tester.tap(find.text('Support'));
    await tester.pumpAndSettle();
    expect(find.text('Helpdesk & Owners Association'), findsOneWidget);
  });

  testWidgets('2. Property Portfolio displays specs, parking bay and doc downloads', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const MaterialApp(
        home: PropertyPortfolioScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify apartment specifications
    expect(find.text('Unit A-7'), findsOneWidget);
    expect(find.text('1850 Sq. Ft.'), findsOneWidget);
    expect(find.text('North-East Facing (Open Lake View)'), findsOneWidget);

    // Verify allotted parking bay
    expect(find.text('Allotted Parking Bay'), findsOneWidget);
    expect(find.text('Bay P-14 (Basement 1, Dedicated RFID)'), findsOneWidget);
    expect(find.text('RFID ACTIVE'), findsOneWidget);

    // Verify official documents
    expect(find.text('Official Allotment Letter'), findsOneWidget);
    expect(find.text('Bilingual Deed of Agreement'), findsOneWidget);

    // Tap download icon on first document
    final downloadButtons = find.byIcon(Icons.download_rounded);
    expect(downloadButtons, findsWidgets);
    await tester.tap(downloadButtons.first);
    await tester.pumpAndSettle();

    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.textContaining('Downloading official signed document'), findsOneWidget);
  });

  testWidgets('3. Construction Tracker shows milestone progress, gallery & 360 tour', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const MaterialApp(
        home: ConstructionTrackerScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify progress header & milestones
    expect(find.text('OVERALL CONSTRUCTION PROGRESS'), findsOneWidget);
    expect(find.text('68%'), findsOneWidget);
    expect(find.text('ON TRACK (ON TIME)'), findsOneWidget);
    expect(find.text('Deep Foundation & Cast-in-situ Piling'), findsOneWidget);
    expect(find.text('8th Floor to 14th Floor Rebar & RCC Casting'), findsOneWidget);

    // Verify photo gallery
    expect(find.text('7th Floor Slab RCC Casting'), findsOneWidget);
    expect(find.text('Floor 5-7 Brick Masonry & Plaster'), findsOneWidget);

    // Test 360 virtual site tour
    final tourButton = find.text('360° Virtual Site Experience');
    expect(tourButton, findsOneWidget);
    await tester.tap(tourButton);
    await tester.pumpAndSettle();

    expect(find.text('360° Virtual Site Tour'), findsOneWidget);
    expect(find.text('Interactive 360° Sphere Loaded'), findsOneWidget);

    // Close tour
    await tester.tap(find.text('Close Tour'));
    await tester.pumpAndSettle();
    expect(find.text('Interactive 360° Sphere Loaded'), findsNothing);
  });

  testWidgets('4. Financial Center displays ledger and supports online installment payments', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const MaterialApp(
        home: FinancialCenterScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify financial ledger
    expect(find.text('TOTAL UNIT VALUE'), findsOneWidget);
    expect(find.text('৳ 185 Lac'), findsOneWidget);
    expect(find.text('Paid: ৳ 110 Lac'), findsOneWidget);
    expect(find.text('Remaining: ৳ 75 Lac'), findsOneWidget);

    // Verify upcoming due installment card
    expect(find.text('Upcoming Due Installment'), findsOneWidget);
    expect(find.text('Pay Now'), findsOneWidget);

    // Open payment modal
    await tester.tap(find.text('Pay Now'));
    await tester.pumpAndSettle();

    expect(find.text('Online Installment Payment'), findsOneWidget);
    expect(find.text('bKash Payment'), findsOneWidget);
    expect(find.text('Nagad Payment'), findsOneWidget);
    expect(find.text('Visa / Mastercard'), findsOneWidget);

    // Pay with bKash
    await tester.tap(find.text('bKash Payment'));
    await tester.pumpAndSettle();

    // Verify Payment Success Dialog and Money Receipt
    expect(find.text('Payment Successful!'), findsOneWidget);
    expect(find.text('Gateway: bKash'), findsOneWidget);
    expect(find.textContaining('Official Money Receipt: MR-2026-'), findsOneWidget);

    // Download receipt
    await tester.tap(find.text('Download Receipt'));
    await tester.pumpAndSettle();

    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.textContaining('Downloading official Money Receipt MR-2026-'), findsOneWidget);
  });

  testWidgets('5. Pre-Handover Snagging Tool allows defect logging and rectification tracking', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const MaterialApp(
        home: SnaggingToolScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify form fields
    expect(find.text('Pre-Handover Quality Walkthrough'), findsOneWidget);
    expect(find.text('Report a New Defect'), findsOneWidget);
    expect(find.text('Master Bedroom'), findsOneWidget);
    expect(find.text('Paint & Wall Finish'), findsOneWidget);
    expect(find.text('Defect_Photo_Tile_CloseUp.jpg Attached'), findsOneWidget);

    // Verify existing snags & statuses
    expect(find.text('SNAG RECTIFICATION STATUS'), findsOneWidget);
    expect(find.text('IN RECTIFICATION'), findsOneWidget);
    expect(find.text('RESOLVED & VERIFIED'), findsOneWidget);
    expect(find.text('Hairline crack on 2x2 floor porcelain tile near shower glass partition.'), findsOneWidget);

    // Submit new snag
    final submitBtn = find.text('Submit Snag to Site Engineer');
    await tester.ensureVisible(submitBtn);
    await tester.tap(submitBtn);
    await tester.pumpAndSettle();

    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.text('Pre-handover snag reported! Site engineer notified for immediate rectification.'), findsOneWidget);
    expect(find.text('REPORTED'), findsOneWidget);
  });

  testWidgets('6. DLP Helpdesk manages 12-month warranty tickets and Owners Association notices', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const MaterialApp(
        home: DlpHelpdeskScreen(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify DLP Tab
    expect(find.text('12-Month Comprehensive DLP Active'), findsOneWidget);
    expect(find.text('Plumbing & Concealed Pipe'), findsOneWidget);
    expect(find.text('Electrical & Inverter'), findsOneWidget);
    expect(find.text('Concealed CPVC hot water line low water pressure in Master Bath.'), findsOneWidget);

    // Log a new warranty claim
    await tester.tap(find.text('New Claim'));
    await tester.pumpAndSettle();

    expect(find.text('Submit 12-Month DLP Warranty Ticket'), findsOneWidget);
    expect(find.text('Dispatch Warranty Technician'), findsOneWidget);

    await tester.tap(find.text('Dispatch Warranty Technician'));
    await tester.pumpAndSettle();

    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.text('DLP Ticket logged! A warranty technician will visit within 24 hours.'), findsOneWidget);

    // Switch to Association Tab
    await tester.tap(find.text('কল্যাণ সমিতি (Association)'));
    await tester.pumpAndSettle();

    expect(find.text('Monthly Service'), findsOneWidget);
    expect(find.text('৳ 6,500'), findsOneWidget);
    expect(find.text('Sinking Fund Reserve'), findsOneWidget);
    expect(find.text('৳ 25.0 Lac'), findsOneWidget);
    expect(find.text('Annual General Meeting (AGM) 2026'), findsOneWidget);
    expect(find.text('Monthly Service Charge & Sinking Fund'), findsOneWidget);
    expect(find.text('Kohler Generator Servicing & Elevator AMC'), findsOneWidget);
  });
}
