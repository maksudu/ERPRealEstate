import 'package:flutter_test/flutter_test.dart';
import 'package:bd_realestate_customer_app/main.dart';

void main() {
  testWidgets('Customer app boots and displays navigation tabs', (WidgetTester tester) async {
    await tester.pumpWidget(const BdRealestateCustomerApp());
    await tester.pump();

    expect(find.text('CUSTOMER SELF-SERVICE'), findsOneWidget);
    expect(find.text('Home'), findsAtLeastNWidgets(1));
    expect(find.text('My Unit'), findsOneWidget);
    expect(find.text('Progress'), findsOneWidget);
    expect(find.text('Financials'), findsOneWidget);
    expect(find.text('Snags'), findsOneWidget);
    expect(find.text('Support'), findsOneWidget);
  });
}
