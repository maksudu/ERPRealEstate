import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'screens/site_dashboard_screen.dart';
import 'screens/dpr_entry_screen.dart';
import 'screens/cube_test_screen.dart';
import 'screens/store_grn_screen.dart';
import 'screens/task_milestone_screen.dart';
import 'screens/material_requisition_screen.dart';
import 'screens/login_screen.dart';
import 'widgets/site_side_menu.dart';

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
      home: const SiteAuthGate(),
    );
  }
}

class SiteAuthGate extends StatefulWidget {
  const SiteAuthGate({super.key});

  @override
  State<SiteAuthGate> createState() => _SiteAuthGateState();
}

class _SiteAuthGateState extends State<SiteAuthGate> {
  bool _isLoggedIn = false;

  @override
  Widget build(BuildContext context) {
    if (_isLoggedIn) {
      return MainSiteNavigation(
        onLogout: () => setState(() => _isLoggedIn = false),
      );
    }
    return SiteLoginScreen(
      onLoginSuccess: () {
        setState(() => _isLoggedIn = true);
      },
    );
  }
}

class MainSiteNavigation extends StatefulWidget {
  final VoidCallback? onLogout;
  const MainSiteNavigation({super.key, this.onLogout});

  @override
  State<MainSiteNavigation> createState() => _MainSiteNavigationState();
}

class _MainSiteNavigationState extends State<MainSiteNavigation> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final List<Widget> pages = [
      SiteDashboardScreen(
        onNavigateToDpr: () => setState(() => _currentIndex = 1),
        onNavigateToLabor: () => setState(() => _currentIndex = 2),
        onNavigateToCubes: () => setState(() => _currentIndex = 3),
        onNavigateToStores: () => setState(() => _currentIndex = 4),
        onLogout: widget.onLogout,
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),

      DprEntryScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      TaskMilestoneScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      MaterialRequisitionScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      CubeTestScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      StoreGrnScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
    ];

    return Scaffold(
      key: _scaffoldKey,
      drawer: SiteSideMenu(
        currentTabIndex: _currentIndex,
        onSelectTab: (idx) => setState(() => _currentIndex = idx),
        onLogout: widget.onLogout,
      ),
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
        elevation: 6,
        surfaceTintColor: Colors.transparent,
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
            icon: Icon(Icons.alt_route),
            selectedIcon: Icon(Icons.alt_route, color: SiteAppTheme.primarySafetyOrange),
            label: 'Tasks',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_cart_checkout),
            selectedIcon: Icon(Icons.shopping_cart_checkout, color: SiteAppTheme.primarySafetyOrange),
            label: 'Materials',
          ),
          NavigationDestination(
            icon: Icon(Icons.science_outlined),
            selectedIcon: Icon(Icons.science, color: SiteAppTheme.primarySafetyOrange),
            label: 'Quality',
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
