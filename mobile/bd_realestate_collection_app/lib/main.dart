import 'package:flutter/material.dart';
import 'core/theme/collection_theme.dart';
import 'screens/collection_dashboard_screen.dart';
import 'screens/recovery_agenda_screen.dart';
import 'screens/on_the_spot_collection_screen.dart';
import 'screens/pdc_vault_intake_screen.dart';
import 'screens/ni_act_logger_screen.dart';

void main() {
  runApp(const BdRealestateCollectionApp());
}

class BdRealestateCollectionApp extends StatelessWidget {
  const BdRealestateCollectionApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RealEstate Field Recovery',
      debugShowCheckedModeBanner: false,
      theme: CollectionTheme.theme,
      home: const MainCollectionNavigation(),
    );
  }
}

class MainCollectionNavigation extends StatefulWidget {
  const MainCollectionNavigation({super.key});

  @override
  State<MainCollectionNavigation> createState() => _MainCollectionNavigationState();
}

class _MainCollectionNavigationState extends State<MainCollectionNavigation> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    CollectionDashboardScreen(),
    RecoveryAgendaScreen(),
    OnTheSpotCollectionScreen(),
    PdcVaultIntakeScreen(),
    NiActLoggerScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        backgroundColor: Colors.white,
        indicatorColor: CollectionTheme.primaryEmerald.withOpacity(0.15),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: CollectionTheme.primaryEmerald),
            label: 'Cockpit',
          ),
          NavigationDestination(
            icon: Icon(Icons.alt_route_outlined),
            selectedIcon: Icon(Icons.alt_route, color: CollectionTheme.primaryEmerald),
            label: 'Agenda',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline),
            selectedIcon: Icon(Icons.add_circle, color: CollectionTheme.primaryEmerald),
            label: 'Collect',
          ),
          NavigationDestination(
            icon: Icon(Icons.lock_clock_outlined),
            selectedIcon: Icon(Icons.lock_clock, color: CollectionTheme.primaryEmerald),
            label: 'PDC Vault',
          ),
          NavigationDestination(
            icon: Icon(Icons.gavel_outlined),
            selectedIcon: Icon(Icons.gavel, color: CollectionTheme.primaryEmerald),
            label: 'NI Act 138',
          ),
        ],
      ),
    );
  }
}
