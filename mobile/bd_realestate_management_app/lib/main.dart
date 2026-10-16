import 'package:flutter/material.dart';
import 'core/theme/management_theme.dart';
import 'core/security/biometric_service.dart';
import 'screens/biometric_gate_screen.dart';
import 'screens/bi_cockpit_screen.dart';
import 'screens/approval_center_screen.dart';
import 'screens/scurve_radar_screen.dart';
import 'screens/cashflow_forecast_screen.dart';

void main() {
  runApp(const BdRealestateManagementApp());
}

class BdRealestateManagementApp extends StatefulWidget {
  const BdRealestateManagementApp({super.key});

  @override
  State<BdRealestateManagementApp> createState() => _BdRealestateManagementAppState();
}

class _BdRealestateManagementAppState extends State<BdRealestateManagementApp> {
  final _biometricService = BiometricService();

  @override
  void initState() {
    super.initState();
    _biometricService.addListener(_onSecurityChanged);
  }

  @override
  void dispose() {
    _biometricService.removeListener(_onSecurityChanged);
    super.dispose();
  }

  void _onSecurityChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Executive BI Cockpit',
      debugShowCheckedModeBanner: false,
      theme: ManagementTheme.theme,
      home: _biometricService.isAuthenticated
          ? const MainManagementNavigation()
          : BiometricGateScreen(
              onAuthenticated: () {
                setState(() {});
              },
            ),
    );
  }
}

class MainManagementNavigation extends StatefulWidget {
  const MainManagementNavigation({super.key});

  @override
  State<MainManagementNavigation> createState() => _MainManagementNavigationState();
}

class _MainManagementNavigationState extends State<MainManagementNavigation> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    BiCockpitScreen(),
    ApprovalCenterScreen(),
    SCurveRadarScreen(),
    CashFlowForecastScreen(),
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
        backgroundColor: ManagementTheme.obsidianBlack,
        indicatorColor: ManagementTheme.luxuryGold.withOpacity(0.2),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined, color: Colors.white70),
            selectedIcon: Icon(Icons.dashboard, color: ManagementTheme.luxuryGold),
            label: 'Cockpit',
          ),
          NavigationDestination(
            icon: Icon(Icons.verified_outlined, color: Colors.white70),
            selectedIcon: Icon(Icons.verified, color: ManagementTheme.luxuryGold),
            label: 'Approvals',
          ),
          NavigationDestination(
            icon: Icon(Icons.ssid_chart_outlined, color: Colors.white70),
            selectedIcon: Icon(Icons.ssid_chart, color: ManagementTheme.luxuryGold),
            label: 'S-Curve',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_outlined, color: Colors.white70),
            selectedIcon: Icon(Icons.account_balance, color: ManagementTheme.luxuryGold),
            label: 'Cash Flow',
          ),
        ],
      ),
    );
  }
}
