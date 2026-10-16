import 'package:flutter/material.dart';
import 'core/theme/customer_theme.dart';
import 'screens/customer_home_screen.dart';
import 'screens/property_portfolio_screen.dart';
import 'screens/construction_tracker_screen.dart';
import 'screens/financial_center_screen.dart';
import 'screens/snagging_tool_screen.dart';
import 'screens/dlp_helpdesk_screen.dart';

void main() {
  runApp(const BdRealestateCustomerApp());
}

class BdRealestateCustomerApp extends StatelessWidget {
  const BdRealestateCustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Customer Property App',
      debugShowCheckedModeBanner: false,
      theme: CustomerTheme.theme,
      home: const MainCustomerNavigation(),
    );
  }
}

class MainCustomerNavigation extends StatefulWidget {
  const MainCustomerNavigation({super.key});

  @override
  State<MainCustomerNavigation> createState() => _MainCustomerNavigationState();
}

class _MainCustomerNavigationState extends State<MainCustomerNavigation> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    CustomerHomeScreen(),
    PropertyPortfolioScreen(),
    ConstructionTrackerScreen(),
    FinancialCenterScreen(),
    SnaggingToolScreen(),
    DlpHelpdeskScreen(),
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
        indicatorColor: CustomerTheme.midnightNavy.withOpacity(0.12),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home, color: CustomerTheme.midnightNavy),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.apartment_outlined),
            selectedIcon: Icon(Icons.apartment, color: CustomerTheme.midnightNavy),
            label: 'My Unit',
          ),
          NavigationDestination(
            icon: Icon(Icons.visibility_outlined),
            selectedIcon: Icon(Icons.visibility, color: CustomerTheme.midnightNavy),
            label: 'Progress',
          ),
          NavigationDestination(
            icon: Icon(Icons.payments_outlined),
            selectedIcon: Icon(Icons.payments, color: CustomerTheme.midnightNavy),
            label: 'Financials',
          ),
          NavigationDestination(
            icon: Icon(Icons.checklist_rtl_outlined),
            selectedIcon: Icon(Icons.checklist_rtl, color: CustomerTheme.midnightNavy),
            label: 'Snags',
          ),
          NavigationDestination(
            icon: Icon(Icons.support_agent_outlined),
            selectedIcon: Icon(Icons.support_agent, color: CustomerTheme.midnightNavy),
            label: 'Support',
          ),
        ],
      ),
    );
  }
}
