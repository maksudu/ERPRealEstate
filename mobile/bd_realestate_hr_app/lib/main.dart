import 'package:flutter/material.dart';
import 'core/theme/hr_theme.dart';
import 'screens/hr_dashboard_screen.dart';
import 'screens/geofenced_attendance_screen.dart';
import 'screens/leave_management_screen.dart';
import 'screens/payslip_vault_screen.dart';
import 'screens/project_timesheet_screen.dart';

void main() {
  runApp(const BdRealestateHrApp());
}

class BdRealestateHrApp extends StatelessWidget {
  const BdRealestateHrApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RealEstate HR & Workforce',
      debugShowCheckedModeBanner: false,
      theme: HrTheme.theme,
      home: const MainHrNavigation(),
    );
  }
}

class MainHrNavigation extends StatefulWidget {
  const MainHrNavigation({super.key});

  @override
  State<MainHrNavigation> createState() => _MainHrNavigationState();
}

class _MainHrNavigationState extends State<MainHrNavigation> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    HrDashboardScreen(),
    GeofencedAttendanceScreen(),
    LeaveManagementScreen(),
    PayslipVaultScreen(),
    ProjectTimesheetScreen(),
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
        indicatorColor: HrTheme.primaryIndigo.withOpacity(0.15),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: HrTheme.primaryIndigo),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.fingerprint_outlined),
            selectedIcon: Icon(Icons.fingerprint, color: HrTheme.primaryIndigo),
            label: 'Attendance',
          ),
          NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month, color: HrTheme.primaryIndigo),
            label: 'Leaves',
          ),
          NavigationDestination(
            icon: Icon(Icons.lock_person_outlined),
            selectedIcon: Icon(Icons.lock_person, color: HrTheme.primaryIndigo),
            label: 'Payslip',
          ),
          NavigationDestination(
            icon: Icon(Icons.access_time_outlined),
            selectedIcon: Icon(Icons.access_time_filled, color: HrTheme.primaryIndigo),
            label: 'Timesheet',
          ),
        ],
      ),
    );
  }
}
