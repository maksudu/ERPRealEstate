import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'screens/site_dashboard_screen.dart';
import 'screens/dpr_entry_screen.dart';
import 'screens/labor_muster_screen.dart';
import 'screens/cube_test_screen.dart';
import 'screens/store_grn_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BdRealestateSiteApp());
}

class BdRealestateSiteApp extends StatelessWidget {
  const BdRealestateSiteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RealEstate Site Ops',
      debugShowCheckedModeBanner: false,
      theme: SiteAppTheme.theme,
      home: const MainSiteNavigation(),
    );
  }
}

class MainSiteNavigation extends StatefulWidget {
  const MainSiteNavigation({super.key});

  @override
  State<MainSiteNavigation> createState() => _MainSiteNavigationState();
}

class _MainSiteNavigationState extends State<MainSiteNavigation> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      SiteDashboardScreen(
        onNavigateToDpr: () => setState(() => _currentIndex = 1),
        onNavigateToLabor: () => setState(() => _currentIndex = 2),
        onNavigateToCubes: () => setState(() => _currentIndex = 3),
        onNavigateToStores: () => setState(() => _currentIndex = 4),
      ),
      const DprEntryScreen(),
      const LaborMusterScreen(),
      const CubeTestScreen(),
      const StoreGrnScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        backgroundColor: Colors.white,
        indicatorColor: SiteAppTheme.primarySafetyOrange.withOpacity(0.15),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: SiteAppTheme.primarySafetyOrange),
            label: 'Hub',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment, color: SiteAppTheme.primarySafetyOrange),
            label: 'DPR',
          ),
          NavigationDestination(
            icon: Icon(Icons.groups_outlined),
            selectedIcon: Icon(Icons.groups, color: SiteAppTheme.primarySafetyOrange),
            label: 'Labor',
          ),
          NavigationDestination(
            icon: Icon(Icons.science_outlined),
            selectedIcon: Icon(Icons.science, color: SiteAppTheme.primarySafetyOrange),
            label: 'Cubes',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2, color: SiteAppTheme.primarySafetyOrange),
            label: 'Stores',
          ),
        ],
      ),
    );
  }
}
