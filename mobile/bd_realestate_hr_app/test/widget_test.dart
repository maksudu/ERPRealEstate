import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:bd_realestate_hr_app/main.dart';
import 'package:bd_realestate_hr_app/models/attendance_record.dart';
import 'package:bd_realestate_hr_app/models/leave_application.dart';
import 'package:bd_realestate_hr_app/models/payslip.dart';
import 'package:bd_realestate_hr_app/screens/geofenced_attendance_screen.dart';
import 'package:bd_realestate_hr_app/screens/leave_management_screen.dart';
import 'package:bd_realestate_hr_app/screens/payslip_vault_screen.dart';
import 'package:bd_realestate_hr_app/screens/project_timesheet_screen.dart';

void main() {
  group('1. HR App Navigation & Shell Tests', () {
    testWidgets('App boots and renders top header and navigation items', (WidgetTester tester) async {
      await tester.pumpWidget(const BdRealestateHrApp());
      await tester.pump();

      expect(find.text('HR & FIELD WORKFORCE'), findsOneWidget);
      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Attendance'), findsOneWidget);
      expect(find.text('Leaves'), findsAtLeastNWidgets(1));
      expect(find.text('Payslip'), findsOneWidget);
      expect(find.text('Timesheet'), findsOneWidget);
    });

    testWidgets('Tapping bottom navigation tabs switches screens', (WidgetTester tester) async {
      await tester.pumpWidget(const BdRealestateHrApp());
      await tester.pump();

      // Tap Attendance
      await tester.tap(find.byIcon(Icons.fingerprint_outlined));
      await tester.pumpAndSettle();
      expect(find.text('Geofenced Smart Attendance'), findsOneWidget);

      // Tap Leaves
      await tester.tap(find.byIcon(Icons.calendar_month_outlined));
      await tester.pumpAndSettle();
      expect(find.text('Leave Management'), findsOneWidget);

      // Tap Payslip
      await tester.tap(find.byIcon(Icons.lock_person_outlined));
      await tester.pumpAndSettle();
      expect(find.text('Encrypted Payslip Vault'), findsOneWidget);

      // Tap Timesheet
      await tester.tap(find.byIcon(Icons.access_time_outlined));
      await tester.pumpAndSettle();
      expect(find.text('Project Daily Timesheet'), findsOneWidget);
    });
  });

  group('2. Geofenced Attendance & Anti-Spoofing Tests', () {
    test('AttendanceRecord model captures geofence, mock detection, and liveness status', () {
      final record = AttendanceRecord(
        id: 'ATT-TEST',
        employeeName: 'Md. Tanvir Hossain',
        checkInTime: DateTime.now(),
        siteName: 'Head Office (Gulshan-1)',
        latitude: 23.7781,
        longitude: 90.4174,
        distanceMetres: 28.0,
        isWithinGeofence: true,
        isMocked: false,
        isLivenessVerified: true,
        status: 'PRESENT_ON_TIME',
      );

      expect(record.distanceMetres, lessThanOrEqualTo(50.0));
      expect(record.isWithinGeofence, isTrue);
      expect(record.isMocked, isFalse);
      expect(record.isLivenessVerified, isTrue);
    });

    testWidgets('Validates 50m geofence, verifies facial blink liveness, and blocks mock GPS', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: GeofencedAttendanceScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Geofenced Smart Attendance'), findsOneWidget);
      expect(find.text('50-Metre Boundary Polygon Check'), findsOneWidget);
      expect(find.text('Inside Geofence (28m from site centre)'), findsOneWidget);
      expect(find.text('Anti-Spoofing: Real Hardware GNSS Verified'), findsOneWidget);

      // 1. Test Mock Location / GPS Emulator Blocking
      final mockSwitch = find.byType(Switch);
      expect(mockSwitch, findsOneWidget);
      await tester.tap(mockSwitch);
      await tester.pump();
      expect(find.text('Mock GPS Detected (position.isMocked == true)'), findsOneWidget);

      final clockInBtn = find.text('CONFIRM CLOCK-IN');
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -350));
      await tester.pumpAndSettle();
      await tester.tap(clockInBtn);
      await tester.pump();
      expect(find.text('ATTENDANCE BLOCKED: Fake GPS / Mock Location detected!'), findsOneWidget);

      // 2. Turn off mock GPS
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, 350));
      await tester.pumpAndSettle();
      await tester.tap(mockSwitch);
      await tester.pump();
      expect(find.text('Anti-Spoofing: Real Hardware GNSS Verified'), findsOneWidget);

      // 3. Test facial blink liveness check
      final startBlinkBtn = find.text('Start Blink Verification');
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -150));
      await tester.pumpAndSettle();
      await tester.tap(startBlinkBtn);
      await tester.pump();
      expect(find.text('Look directly at camera...'), findsOneWidget);

      await tester.pump(const Duration(milliseconds: 1300));
      expect(find.text('Please BLINK now...'), findsOneWidget);

      await tester.pump(const Duration(milliseconds: 1300));
      expect(find.text('Blink Verified • Liveness Score: 99.4%'), findsOneWidget);

      // 4. Clock in successfully
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -350));
      await tester.pumpAndSettle();
      await tester.tap(clockInBtn);
      await tester.pumpAndSettle();

      expect(find.text('Clock-In Verified!'), findsOneWidget);
      expect(find.text('GPS Anti-Spoof: Passed (Real Hardware GNSS)'), findsOneWidget);
      expect(find.text('Facial Liveness: Blink Verified (ML Kit)'), findsOneWidget);
    });
  });

  group('3. Leave Management & Claims Tests', () {
    test('LeaveBalance and LeaveApplication models validate allowances', () {
      const balance = LeaveBalance(
        casualTotal: 14,
        casualUsed: 4,
        sickTotal: 14,
        sickUsed: 2,
        earnedTotal: 18,
        earnedUsed: 3,
      );

      expect(balance.casualRemaining, equals(10));
      expect(balance.sickRemaining, equals(12));
      expect(balance.earnedRemaining, equals(15));
    });

    testWidgets('Renders balances and submits leave application with medical proof upload', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: LeaveManagementScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Leave Management'), findsOneWidget);
      expect(find.text('Casual (CL)'), findsOneWidget);
      expect(find.text('Sick (SL)'), findsOneWidget);
      expect(find.text('Earned (EL)'), findsOneWidget);
      expect(find.text('Apply for Leave'), findsOneWidget);

      // Select Sick Leave from dropdown to show medical certificate upload
      await tester.tap(find.text('Casual Leave (CL)').first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sick Leave (SL) - Medical Proof').last);
      await tester.pumpAndSettle();

      expect(find.text('Attach Medical Certificate / Prescription'), findsOneWidget);
      await tester.tap(find.text('Attach Medical Certificate / Prescription'));
      await tester.pump(const Duration(seconds: 4)); // Allow attachment snackbar to dismiss

      // Submit application
      final submitBtn = find.text('Submit Leave Application');
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -250));
      await tester.pumpAndSettle();
      await tester.tap(submitBtn);
      await tester.pumpAndSettle();

      expect(find.text('PENDING_HOD'), findsAtLeastNWidgets(1));
    });
  });

  group('4. Encrypted Digital Payslip Vault Tests', () {
    test('Payslip model calculates gross and net earnings accurately', () {
      const slip = Payslip(
        id: 'PAY-TEST',
        monthYear: 'September 2026',
        designation: 'Senior Project Engineer',
        department: 'Engineering',
        tinNumber: 'TIN: 8819-2049-1120',
        bankAccount: 'Prime Bank A/C: 1102948-0019',
        basicSalary: 70000.0,
        houseRent: 35000.0,
        medicalAllowance: 5000.0,
        conveyance: 5000.0,
        providentFund: 7000.0,
        tdsTax: 4500.0,
        advanceDeduction: 3000.0,
      );

      expect(slip.grossEarnings, equals(115000.0));
      expect(slip.totalDeductions, equals(14500.0));
      expect(slip.netPayable, equals(100500.0));
    });

    testWidgets('Unlocks with PIN and details Basic, House Rent, PF, and TDS', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: PayslipVaultScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Encrypted Payslip Vault'), findsOneWidget);
      expect(find.text('Encrypted Salary Vault'), findsOneWidget);
      expect(find.text('Decrypt & View Payslip'), findsOneWidget);

      // Tap unlock button (PIN defaults to 1234)
      await tester.tap(find.text('Decrypt & View Payslip'));
      await tester.pumpAndSettle();

      // Verify unencrypted breakdown
      expect(find.text('September 2026'), findsOneWidget);
      expect(find.text('NET DISBURSED SALARY'), findsOneWidget);
      expect(find.text('৳ 100500'), findsOneWidget);

      expect(find.text('Basic Salary'), findsOneWidget);
      expect(find.text('House Rent Allowance (50%)'), findsOneWidget);
      expect(find.text('Medical Allowance'), findsOneWidget);
      expect(find.text('Provident Fund (PF 10%)'), findsOneWidget);
      expect(find.text('Tax Withheld at Source (TDS Sec 50)'), findsOneWidget);

      // Download password-protected PDF button
      final downloadBtn = find.text('Download Password-Protected PDF Slip');
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -300));
      await tester.pumpAndSettle();
      await tester.tap(downloadBtn);
      await tester.pump();
      expect(find.textContaining('Downloading encrypted PDF'), findsOneWidget);
    });
  });

  group('5. Project Daily Timesheet Tests', () {
    testWidgets('Site engineers log daily hours worked per project for job costing', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: ProjectTimesheetScreen()),
      );
      await tester.pumpAndSettle();

      expect(find.text('Project Daily Timesheet'), findsOneWidget);
      expect(find.text('Log Work Hours for Job-Costing'), findsOneWidget);
      expect(find.text('Green Horizon Tower (Gulshan-2)'), findsAtLeastNWidgets(1));
      expect(find.text('RCC Slab Rebar Inspection'), findsAtLeastNWidgets(1));

      final saveBtn = find.text('Save Timesheet Entry');
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -300));
      await tester.pumpAndSettle();
      await tester.tap(saveBtn);
      await tester.pump();
      expect(find.textContaining('booked to Green Horizon Tower (Gulshan-2)!'), findsOneWidget);
    });
  });
}
