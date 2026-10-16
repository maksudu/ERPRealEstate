import 'package:flutter_test/flutter_test.dart';
import 'package:bd_realestate_management_app/main.dart';

void main() {
  testWidgets('Management app boots and shows biometric gate', (WidgetTester tester) async {
    await tester.pumpWidget(const BdRealestateManagementApp());
    await tester.pump();

    expect(find.text('EXECUTIVE BI COCKPIT'), findsOneWidget);
    expect(find.text('Managing Director & Board Portal'), findsOneWidget);
    expect(find.text('Unlock with Biometrics'), findsOneWidget);
  });
}
