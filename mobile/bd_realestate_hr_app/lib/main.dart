import 'package:flutter/material.dart';
import 'core/theme/hr_theme.dart';
import 'core/network/api_client.dart';
import 'screens/hr_login_screen.dart';
import 'screens/ess_dashboard_screen.dart';
import 'screens/gps_attendance_screen.dart';
import 'screens/leave_overtime_screen.dart';
import 'screens/payroll_payslips_screen.dart';
import 'screens/my_profile_screen.dart';
import 'screens/manager_dashboard_screen.dart';
import 'screens/manager_attendance_screen.dart';
import 'screens/manager_approvals_screen.dart';
import 'screens/manager_workforce_screen.dart';
import 'screens/manager_payroll_reports_screen.dart';
import 'widgets/hr_side_menu.dart';

void main() {
  runApp(const BdRealestateHrApp());
}

class BdRealestateHrApp extends StatefulWidget {
  const BdRealestateHrApp({super.key});

  @override
  State<BdRealestateHrApp> createState() => _BdRealestateHrAppState();
}

class _BdRealestateHrAppState extends State<BdRealestateHrApp> {
  final _api = HrApiClient();
  bool _isLoggedIn = false; // Starts on login page!
  bool _isManagerMode = false;

  void _onLoginSuccess() {
    setState(() {
      _isLoggedIn = true;
      _isManagerMode = _api.isManager;
    });
  }

  void _onLogout() {
    _api.logout();
    setState(() {
      _isLoggedIn = false;
      _isManagerMode = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RealEstate HR & Workforce',
      debugShowCheckedModeBanner: false,
      theme: HrTheme.theme,
      home: _isLoggedIn
          ? _isManagerMode
              ? MainManagerNavigation(
                  onLogout: _onLogout,
                  onSwitchToEss: () => setState(() => _isManagerMode = false),
                )
              : MainEssNavigation(
                  onLogout: _onLogout,
                  onSwitchToManager: () => setState(() => _isManagerMode = true),
                )
          : HrLoginScreen(
              onLoginSuccess: _onLoginSuccess,
            ),
    );
  }
}

// -------------------------------------------------------------
// Employee Self-Service Navigation (ESS)
// -------------------------------------------------------------
class MainEssNavigation extends StatefulWidget {
  final VoidCallback onLogout;
  final VoidCallback onSwitchToManager;

  const MainEssNavigation({
    super.key,
    required this.onLogout,
    required this.onSwitchToManager,
  });

  @override
  State<MainEssNavigation> createState() => _MainEssNavigationState();
}

class _MainEssNavigationState extends State<MainEssNavigation> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentIndex = 0;
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      EssDashboardScreen(
        onLogout: widget.onLogout,
        onSwitchToManager: widget.onSwitchToManager,
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      GpsAttendanceScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      LeaveOvertimeScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      PayrollPayslipsScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      MyProfileScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: HrSideMenu(
        isManagerMode: false,
        currentTabIndex: _currentIndex,
        onSelectTab: (idx) => setState(() => _currentIndex = idx),
        onToggleMode: widget.onSwitchToManager,
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
        indicatorColor: HrTheme.primaryIndigo.withOpacity(0.12),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: HrTheme.primaryIndigo),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.location_on_outlined),
            selectedIcon: Icon(Icons.location_on, color: HrTheme.primaryIndigo),
            label: 'Attendance',
          ),
          NavigationDestination(
            icon: Icon(Icons.date_range_outlined),
            selectedIcon: Icon(Icons.date_range, color: HrTheme.primaryIndigo),
            label: 'Leave & OT',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long, color: HrTheme.primaryIndigo),
            label: 'Payslips',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: HrTheme.primaryIndigo),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

// -------------------------------------------------------------
// HR & Manager Mode Navigation (MSS)
// -------------------------------------------------------------
class MainManagerNavigation extends StatefulWidget {
  final VoidCallback onLogout;
  final VoidCallback onSwitchToEss;

  const MainManagerNavigation({
    super.key,
    required this.onLogout,
    required this.onSwitchToEss,
  });

  @override
  State<MainManagerNavigation> createState() => _MainManagerNavigationState();
}

class _MainManagerNavigationState extends State<MainManagerNavigation> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentIndex = 0;
  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      ManagerDashboardScreen(
        onLogout: widget.onLogout,
        onSwitchToEss: widget.onSwitchToEss,
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      ManagerAttendanceScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      ManagerApprovalsScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      ManagerWorkforceScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      ManagerPayrollReportsScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: HrSideMenu(
        isManagerMode: true,
        currentTabIndex: _currentIndex,
        onSelectTab: (idx) => setState(() => _currentIndex = idx),
        onToggleMode: widget.onSwitchToEss,
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
        indicatorColor: HrTheme.primaryIndigo.withOpacity(0.12),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.admin_panel_settings_outlined),
            selectedIcon: Icon(Icons.admin_panel_settings, color: HrTheme.primaryIndigo),
            label: 'Manager',
          ),
          NavigationDestination(
            icon: Icon(Icons.co_present_outlined),
            selectedIcon: Icon(Icons.co_present, color: HrTheme.primaryIndigo),
            label: 'Roster',
          ),
          NavigationDestination(
            icon: Icon(Icons.rule_folder_outlined),
            selectedIcon: Icon(Icons.rule_folder, color: HrTheme.primaryIndigo),
            label: 'Approvals',
          ),
          NavigationDestination(
            icon: Icon(Icons.engineering_outlined),
            selectedIcon: Icon(Icons.engineering, color: HrTheme.primaryIndigo),
            label: 'Labour',
          ),
          NavigationDestination(
            icon: Icon(Icons.analytics_outlined),
            selectedIcon: Icon(Icons.analytics, color: HrTheme.primaryIndigo),
            label: 'Reports',
          ),
        ],
      ),
    );
  }
}
