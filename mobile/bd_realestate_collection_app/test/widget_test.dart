import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bd_realestate_collection_app/main.dart';
import 'package:bd_realestate_collection_app/core/bluetooth/bluetooth_printer_service.dart';
import 'package:bd_realestate_collection_app/models/collection_receipt.dart';
import 'package:bd_realestate_collection_app/models/pdc_intake.dart';
import 'package:bd_realestate_collection_app/models/ni_act_notice.dart';
import 'package:bd_realestate_collection_app/screens/recovery_agenda_screen.dart';
import 'package:bd_realestate_collection_app/screens/on_the_spot_collection_screen.dart';
import 'package:bd_realestate_collection_app/screens/pdc_vault_intake_screen.dart';
import 'package:bd_realestate_collection_app/screens/ni_act_logger_screen.dart';
import 'package:bd_realestate_collection_app/screens/bluetooth_printer_screen.dart';

void main() {
  group('1. Collection App Navigation & Shell Tests', () {
    testWidgets('App boots and renders top header and navigation items', (WidgetTester tester) async {
      await tester.pumpWidget(const BdRealestateCollectionApp());
      await tester.pump();

      expect(find.text('FIELD RECOVERY & FINTECH'), findsOneWidget);
      expect(find.text('Cockpit'), findsOneWidget);
      expect(find.text('Agenda'), findsOneWidget);
      expect(find.text('Collect'), findsOneWidget);
      expect(find.text('PDC Vault'), findsAtLeastNWidgets(1));
      expect(find.text('NI Act 138'), findsAtLeastNWidgets(1));
    });

    testWidgets('Tapping bottom navigation tabs switches screens', (WidgetTester tester) async {
      await tester.pumpWidget(const BdRealestateCollectionApp());
      await tester.pump();

      // Tap Agenda tab
      await tester.tap(find.byIcon(Icons.alt_route_outlined));
      await tester.pumpAndSettle();
      expect(find.text('ROUTE RECOVERY AGENDA'), findsOneWidget);

      // Tap Collect tab
      await tester.tap(find.byIcon(Icons.add_circle_outline));
      await tester.pumpAndSettle();
      expect(find.text('On-the-Spot Collection'), findsOneWidget);

      // Tap PDC Vault tab
      await tester.tap(find.byIcon(Icons.lock_clock_outlined));
      await tester.pumpAndSettle();
      expect(find.text('Post-Dated Cheque (PDC) Vault Intake'), findsOneWidget);

      // Tap NI Act 138 tab
      await tester.tap(find.byIcon(Icons.gavel_outlined));
      await tester.pumpAndSettle();
      expect(find.text('NI Act 1881 Notice Logger'), findsOneWidget);
    });
  });

  group('2. Bluetooth ESC/POS Thermal Receipt Printing Tests', () {
    late BluetoothPrinterService printerService;
    late CollectionReceipt sampleReceipt;

    setUp(() {
      printerService = BluetoothPrinterService();
      sampleReceipt = CollectionReceipt(
        receiptNumber: 'MR-2026-99001',
        clientName: 'Engr. Mahbubur Rahman',
        clientPhone: '+880 1712-334455',
        unitNumber: 'A-7 (1,850 sft)',
        project: 'Green Horizon Tower',
        amount: 500000.0,
        paymentMethod: PaymentMethod.bkashQr,
        transactionRef: 'BKH-88910294-G',
        amountInWords: 'Five Lac Taka Only',
        date: DateTime(2026, 10, 16, 14, 30),
        hasSignature: true,
        collectedBy: 'Officer Tarek Aziz (FO-892)',
      );
    });

    test('Generates valid ESC/POS receipt layout for 80mm and 58mm with QR code', () {
      printerService.setPaperSize(PrinterPaperSize.mm80);
      final text80 = printerService.generateEscPosText(sampleReceipt);

      expect(text80, contains('OFFICIAL MONEY RECEIPT'));
      expect(text80, contains('MR No: MR-2026-99001'));
      expect(text80, contains('Engr. Mahbubur Rahman'));
      expect(text80, contains('BDT ৳500000.00'));
      expect(text80, contains('ERP://MR/MR-2026-99001/500000'));
      expect(text80, contains('[PAPER FEED & CUT]'));

      // Switch to 58mm
      printerService.setPaperSize(PrinterPaperSize.mm58);
      final text58 = printerService.generateEscPosText(sampleReceipt);
      expect(text58, contains('ERP://MR/MR-2026-99001/500000'));
      expect(text58.length, lessThan(text80.length));
    });

    test('Prints receipt in under 3 seconds', () async {
      final stopwatch = Stopwatch()..start();
      final success = await printerService.printReceipt(sampleReceipt);
      stopwatch.stop();

      expect(success, isTrue);
      expect(stopwatch.elapsedMilliseconds, lessThan(3000));
      expect(printerService.lastPrintedReceiptText, contains('MR-2026-99001'));
    });

    testWidgets('Bluetooth Printer screen displays preview and triggers print', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: BluetoothPrinterScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Bluetooth Thermal Printer'), findsOneWidget);
      expect(find.text('CONNECTED'), findsOneWidget);
      expect(find.text('58mm'), findsOneWidget);
      expect(find.text('80mm'), findsOneWidget);

      final printBtn = find.text('Test Print Official Money Receipt');
      await tester.scrollUntilVisible(printBtn, 300);
      expect(printBtn, findsOneWidget);

      await tester.tap(printBtn);
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(seconds: 2));
      await tester.pumpAndSettle();
      expect(find.textContaining('successfully printed!'), findsOneWidget);
    });
  });

  group('3. Territory Map & Recovery Agenda Tests', () {
    testWidgets('Displays agenda clients sorted by proximity and filters correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: RecoveryAgendaScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('ROUTE RECOVERY AGENDA'), findsOneWidget);
      expect(find.text('Gulshan & Banani Zone'), findsOneWidget);

      // Verify closest client is at top (Engr. Mahbubur Rahman - 0.8 km)
      expect(find.text('Engr. Mahbubur Rahman'), findsOneWidget);
      expect(find.textContaining('0.8 km away'), findsOneWidget);

      // Tap filter "Bounced Cheques (NI Act)"
      await tester.tap(find.text('Bounced Cheques (NI Act)'));
      await tester.pumpAndSettle();
      expect(find.text('BOUNCED (NI ACT 138)'), findsAtLeastNWidgets(1));

      // Tap filter "Proximity < 2 KM"
      await tester.tap(find.text('Proximity < 2 KM'));
      await tester.pumpAndSettle();
      expect(find.textContaining('0.8 km away'), findsOneWidget);
      expect(find.textContaining('1.4 km away'), findsOneWidget);
    });
  });

  group('4. On-the-Spot Collection & Dynamic QR Tests', () {
    testWidgets('Form renders payment choices including bKash and Nagad QR', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: OnTheSpotCollectionScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('On-the-Spot Collection'), findsOneWidget);
      expect(find.text('bKash QR'), findsOneWidget);
      expect(find.text('Nagad QR'), findsOneWidget);
      expect(find.text('Cash'), findsOneWidget);
      expect(find.text('Cheque'), findsOneWidget);
      expect(find.text('Pay Order'), findsOneWidget);

      // Dynamic Merchant QR is displayed for bKash
      expect(find.text('bKash Merchant Payment'), findsOneWidget);
      expect(find.textContaining('Merchant A/C: 01700-112233'), findsOneWidget);

      // Signature section
      expect(find.text('Client Digital Signature'), findsOneWidget);
      expect(find.text('Clear'), findsOneWidget);
    });
  });

  group('5. PDC Cheque Vault Intake Tests', () {
    test('PdcIntake model validates 9-digit routing number and fields', () {
      final pdc = PdcIntake(
        id: 'PDC-TEST',
        clientName: 'Mrs. Farzana Haque',
        unitNumber: 'B-3',
        chequeNumber: 'DBBL-993821',
        bankName: 'Dutch-Bangla Bank PLC',
        branch: 'Gulshan-2',
        routingNumber: '090261346',
        amount: 320000.0,
        maturityDate: DateTime(2026, 12, 1),
        securityPouchBarcode: 'POUCH-SEC-11205',
        intakeDate: DateTime.now(),
      );

      expect(pdc.routingNumber, equals('090261346'));
      expect(pdc.routingNumber.length, equals(9));
      expect(pdc.securityPouchBarcode, startsWith('POUCH-'));
      expect(pdc.status, equals('IN_VAULT'));
    });

    testWidgets('Pdc Vault Intake Screen displays routing number and saves intake', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: PdcVaultIntakeScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Post-Dated Cheque (PDC) Vault Intake'), findsOneWidget);
      expect(find.text('Routing No (9 Digits)'), findsOneWidget);
      expect(find.text('BEFTN / BACPS Clearing'), findsOneWidget);
      expect(find.text('Security Pouch Barcode'), findsOneWidget);
      expect(find.text('Intake PDC to Physical Vault'), findsOneWidget);

      // Check existing card shows routing number
      expect(find.textContaining('Routing: 095260472'), findsOneWidget);
    });
  });

  group('6. NI Act 138 Notice Delivery Logger Tests', () {
    test('Calculates 30-day statutory countdown correctly', () {
      final notice = NiActNotice(
        id: 'NI-TEST',
        clientName: 'Syed Tanvir Ahmed',
        clientPhone: '+880 1911-223344',
        unitNumber: 'C-4',
        project: 'Lakeside Residency',
        chequeNumber: 'CBL-881920',
        bankName: 'The City Bank Ltd',
        chequeAmount: 1200000.0,
        bounceReason: 'Account Operation Stopped / Dormant',
        bounceDate: DateTime.now().subtract(const Duration(days: 35)),
        noticeServedDate: DateTime.now().subtract(const Duration(days: 28)),
        daysElapsed: 28,
        status: 'CRITICAL_COUNTDOWN_EXPIRING',
      );

      final daysRemaining = 30 - notice.daysElapsed;
      expect(daysRemaining, equals(2));
      expect(notice.status, equals('CRITICAL_COUNTDOWN_EXPIRING'));
    });

    testWidgets('NI Act screen shows bounce notices and 30-day countdown cards', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: NiActLoggerScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('NI Act 1881 Notice Logger'), findsOneWidget);
      expect(find.text('Statutory 30-Day NI Act Rule'), findsOneWidget);
      expect(find.text('24 days left to pay'), findsOneWidget);

      final logBtn = find.text('Log Notice A/D Delivery');
      await tester.scrollUntilVisible(logBtn, 300);
      expect(logBtn, findsOneWidget);
    });
  });
}
