import 'package:flutter_test/flutter_test.dart';
import 'package:bd_realestate_collection_app/main.dart';

void main() {
  testWidgets('Collection app boots and displays navigation tabs', (WidgetTester tester) async {
    await tester.pumpWidget(const BdRealestateCollectionApp());
    await tester.pump();

    expect(find.text('FIELD RECOVERY & FINTECH'), findsOneWidget);
    expect(find.text('Cockpit'), findsOneWidget);
    expect(find.text('Agenda'), findsOneWidget);
    expect(find.text('Collect'), findsOneWidget);
    expect(find.text('PDC Vault'), findsAtLeastNWidgets(1));
    expect(find.text('NI Act 138'), findsAtLeastNWidgets(1));
  });
}
