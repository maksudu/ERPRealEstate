import 'package:flutter/material.dart';
import 'core/theme/collection_theme.dart';
import 'screens/collection_dashboard_screen.dart';
import 'screens/customer_search_screen.dart';
import 'screens/payment_entry_screen.dart';
import 'screens/collection_workflow_screen.dart';
import 'screens/collection_reports_screen.dart';
import 'screens/collection_login_screen.dart';
import 'widgets/collection_side_menu.dart';

void main() {
  runApp(const BdRealestateCollectionApp());
}

class BdRealestateCollectionApp extends StatefulWidget {
  const BdRealestateCollectionApp({super.key});

  @override
  State<BdRealestateCollectionApp> createState() => _BdRealestateCollectionAppState();
}

class _BdRealestateCollectionAppState extends State<BdRealestateCollectionApp> {
  bool _isLoggedIn = false;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RealEstate Field Recovery & Collection',
      debugShowCheckedModeBanner: false,
      theme: CollectionTheme.theme,
      home: _isLoggedIn
          ? MainCollectionNavigation(
              onLogout: () => setState(() => _isLoggedIn = false),
            )
          : CollectionLoginScreen(
              onLoginSuccess: () => setState(() => _isLoggedIn = true),
            ),
    );
  }
}

class MainCollectionNavigation extends StatefulWidget {
  final VoidCallback onLogout;

  const MainCollectionNavigation({super.key, required this.onLogout});

  @override
  State<MainCollectionNavigation> createState() => _MainCollectionNavigationState();
}

class _MainCollectionNavigationState extends State<MainCollectionNavigation> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentIndex = 0;

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      CollectionDashboardScreen(
        onLogout: widget.onLogout,
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      CustomerSearchScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      PaymentEntryScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      CollectionWorkflowScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      CollectionReportsScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
    ];
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: CollectionSideMenu(
        currentTabIndex: _currentIndex,
        onSelectTab: (idx) => setState(() => _currentIndex = idx),
        onLogout: widget.onLogout,
      ),
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
            icon: Icon(Icons.people_alt_outlined),
            selectedIcon: Icon(Icons.people_alt, color: CollectionTheme.primaryEmerald),
            label: 'Customers',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_circle_outline),
            selectedIcon: Icon(Icons.add_circle, color: CollectionTheme.primaryEmerald),
            label: 'Pay Entry',
          ),
          NavigationDestination(
            icon: Icon(Icons.rule_folder_outlined),
            selectedIcon: Icon(Icons.rule_folder, color: CollectionTheme.primaryEmerald),
            label: 'Approvals',
          ),
          NavigationDestination(
            icon: Icon(Icons.analytics_outlined),
            selectedIcon: Icon(Icons.analytics, color: CollectionTheme.primaryEmerald),
            label: 'Reports',
          ),
        ],
      ),
    );
  }
}

