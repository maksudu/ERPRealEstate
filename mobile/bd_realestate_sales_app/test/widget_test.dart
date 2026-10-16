import 'package:flutter_test/flutter_test.dart';
import 'package:bd_realestate_sales_app/main.dart';

void main() {
  testWidgets('Sales App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const BdRealEstateSalesApp());
    expect(find.byType(BdRealEstateSalesApp), findsOneWidget);
  });
}
