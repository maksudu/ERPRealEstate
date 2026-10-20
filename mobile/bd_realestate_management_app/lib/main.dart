import 'package:flutter/material.dart';
import 'core/theme/management_theme.dart';
import 'screens/management_login_screen.dart';
import 'screens/executive_dashboard_screen.dart';
import 'screens/project_performance_screen.dart';
import 'screens/sales_analytics_screen.dart';
import 'screens/cashflow_monitoring_screen.dart';
import 'screens/approval_center_screen.dart';
import 'widgets/management_side_menu.dart';

void main() {
  runApp(const BdRealestateManagementApp());
}

class BdRealestateManagementApp extends StatefulWidget {
  const BdRealestateManagementApp({super.key});

  @override
  State<BdRealestateManagementApp> createState() => _BdRealestateManagementAppState();
}

class _BdRealestateManagementAppState extends State<BdRealestateManagementApp> {
  bool _isLoggedIn = false; // Starts on login page!

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RealEstate Executive Management BI',
      debugShowCheckedModeBanner: false,
      theme: ManagementTheme.theme,
      home: _isLoggedIn
          ? MainManagementNavigation(
              onLogout: () => setState(() => _isLoggedIn = false),
            )
          : ManagementLoginScreen(
              onLoginSuccess: () => setState(() => _isLoggedIn = true),
            ),
    );
  }
}

class MainManagementNavigation extends StatefulWidget {
  final VoidCallback onLogout;

  const MainManagementNavigation({super.key, required this.onLogout});

  @override
  State<MainManagementNavigation> createState() => _MainManagementNavigationState();
}

class _MainManagementNavigationState extends State<MainManagementNavigation> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentIndex = 0;
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      ExecutiveDashboardScreen(
        onLogout: widget.onLogout,
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      ProjectPerformanceScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      SalesAnalyticsScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      CashflowMonitoringScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      ApprovalCenterScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: ManagementSideMenu(
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
        indicatorColor: ManagementTheme.royalNavy.withOpacity(0.12),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: ManagementTheme.royalNavy),
            label: 'Executive',
          ),
          NavigationDestination(
            icon: Icon(Icons.show_chart_outlined),
            selectedIcon: Icon(Icons.show_chart, color: ManagementTheme.royalNavy),
            label: 'Projects',
          ),
          NavigationDestination(
            icon: Icon(Icons.pie_chart_outline),
            selectedIcon: Icon(Icons.pie_chart, color: ManagementTheme.royalNavy),
            label: 'Sales',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_outlined),
            selectedIcon: Icon(Icons.account_balance, color: ManagementTheme.royalNavy),
            label: 'Cash Flow',
          ),
          NavigationDestination(
            icon: Icon(Icons.rule_folder_outlined),
            selectedIcon: Icon(Icons.rule_folder, color: ManagementTheme.royalNavy),
            label: 'Approvals',
          ),
        ],
      ),
    );
  }
}
