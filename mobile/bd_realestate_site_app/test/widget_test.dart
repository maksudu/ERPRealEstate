import 'package:flutter_test/flutter_test.dart';
import 'package:bd_realestate_site_app/main.dart';

void main() {
  testWidgets('Site app boots and displays navigation tabs', (WidgetTester tester) async {
    await tester.pumpWidget(const BdRealestateSiteApp());
    await tester.pump();

    expect(find.text('SITE OPERATIONS HUB'), findsOneWidget);
    expect(find.text('DPR'), findsOneWidget);
    expect(find.text('Labor'), findsOneWidget);
    expect(find.text('Cubes'), findsOneWidget);
    expect(find.text('Stores'), findsOneWidget);
  });
}
