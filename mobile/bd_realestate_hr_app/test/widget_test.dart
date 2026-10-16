import 'package:flutter_test/flutter_test.dart';
import 'package:bd_realestate_hr_app/main.dart';

void main() {
  testWidgets('HR app boots and displays navigation tabs', (WidgetTester tester) async {
    await tester.pumpWidget(const BdRealestateHrApp());
    await tester.pump();

    expect(find.text('HR & FIELD WORKFORCE'), findsOneWidget);
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Attendance'), findsOneWidget);
    expect(find.text('Leaves'), findsAtLeastNWidgets(1));
    expect(find.text('Payslip'), findsOneWidget);
    expect(find.text('Timesheet'), findsOneWidget);
  });
}
