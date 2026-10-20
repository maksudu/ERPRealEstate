import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import 'home_dashboard_screen.dart';
import 'lead_manager_screen.dart';
import 'customer_manager_screen.dart';
import 'project_property_screen.dart';
import 'quotation_screen.dart';
import 'site_visit_screen.dart';
import 'booking_manager_screen.dart';
import 'approval_screen.dart';
import 'notifications_screen.dart';
import 'emi_calculator_screen.dart';
import 'unit_matrix_screen.dart';
import 'login_screen.dart';
import '../widgets/sales_side_menu.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentIndex = 0;
  final _api = ApiClient();
  int _unreadNotifications = 0;

  @override
  void initState() {
    super.initState();
    _checkNotifications();
  }

  Future<void> _checkNotifications() async {
    try {
      final res = await _api.getNotifications(unreadOnly: true);
      if (mounted) {
        setState(() => _unreadNotifications = res['unread'] ?? 0);
      }
    } catch (_) {}
  }

  void _navigateToTab(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeDashboardScreen(
        onNavigateToMatrix: () => _navigateToTab(3),
        onNavigateToLeads: () => _navigateToTab(1),
        onNavigateToCustomers: () => _navigateToTab(2),
        onNavigateToVisits: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SiteVisitScreen())),
        onNavigateToBookings: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BookingManagerScreen())),
        onNavigateToQuotations: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const QuotationScreen())),
        onNavigateToApprovals: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ApprovalScreen())),
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      LeadManagerScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      CustomerManagerScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      ProjectPropertyScreen(
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
      ),
      _buildMoreOperationsScreen(),
    ];

    return Scaffold(
      key: _scaffoldKey,
      drawer: SalesSideMenu(
        currentTabIndex: _currentIndex,
        onSelectTab: (idx) => _navigateToTab(idx),
        onLogout: () {
          _api.logout();
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(
              builder: (_) => LoginScreen(
                onLoginSuccess: () {
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
                  );
                },
              ),
            ),
            (route) => false,
          );
        },
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() => _currentIndex = index);
          _checkNotifications();
        },
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: AppTheme.primaryTeal,
        unselectedItemColor: const Color(0xFF64748B),
        selectedFontSize: 11,
        unselectedFontSize: 10,
        elevation: 10,
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Cockpit',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.people_outline),
            activeIcon: Icon(Icons.people),
            label: 'Leads',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.contact_mail_outlined),
            activeIcon: Icon(Icons.contact_mail),
            label: 'Customers',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.apartment_outlined),
            activeIcon: Icon(Icons.apartment),
            label: 'Properties',
          ),
          BottomNavigationBarItem(
            icon: Badge(
              isLabelVisible: _unreadNotifications > 0,
              label: Text('$_unreadNotifications', style: const TextStyle(fontSize: 10)),
              child: const Icon(Icons.menu),
            ),
            label: 'More',
          ),
        ],
      ),
    );
  }

  Widget _buildMoreOperationsScreen() {
    final user = _api.currentUser;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Sales Operations & Tools', style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(color: const Color(0xFF0F172A).withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 3)),
              ],
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: AppTheme.primaryTeal.withOpacity(0.12),
                  child: const Icon(Icons.person, color: AppTheme.primaryTeal, size: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user != null ? '${user['full_name_en'] ?? user['username']}' : 'Sales Executive',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user != null ? (user['is_group_admin'] == true ? 'Group Administrator' : 'Senior Sales Executive') : 'Field Sales Staff',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                      if (user?['phone_number'] != null)
                        Text(user!['phone_number'], style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 11)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          const Text('Commercial & Operations', style: TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),

          _menuItem(
            icon: Icons.request_quote_outlined,
            color: const Color(0xFF059669),
            title: 'Quotation Management',
            subtitle: 'Generate pricing quotations with PDF reports',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const QuotationScreen())),
          ),
          _menuItem(
            icon: Icons.location_city_outlined,
            color: const Color(0xFF8B5CF6),
            title: 'Site Visit Management',
            subtitle: 'Client appointment scheduling & visit outcomes',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SiteVisitScreen())),
          ),
          _menuItem(
            icon: Icons.book_online_outlined,
            color: const Color(0xFF0284C7),
            title: 'Booking Management',
            subtitle: 'Reservations, earnest money & installment plans',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BookingManagerScreen())),
          ),
          _menuItem(
            icon: Icons.verified_user_outlined,
            color: const Color(0xFFD97706),
            title: 'Approval Workflow',
            subtitle: 'Maker-checker discounts, bookings & cancellations',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ApprovalScreen())),
          ),
          _menuItem(
            icon: Icons.notifications_active_outlined,
            color: const Color(0xFFEC4899),
            title: 'Notifications & Alerts',
            subtitle: 'Lead assignments, overdue follow-ups, approvals',
            badgeCount: _unreadNotifications,
            onTap: () async {
              await Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
              _checkNotifications();
            },
          ),
          _menuItem(
            icon: Icons.grid_on,
            color: AppTheme.primaryTeal,
            title: 'Interactive Flat Matrix',
            subtitle: '15-Minute mutex locks & unit availability',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const UnitMatrixScreen()),
            ),
          ),
          _menuItem(
            icon: Icons.calculate_outlined,
            color: const Color(0xFF14B8A6),
            title: 'EMI & Payment Schedule Calculator',
            subtitle: 'Amortization schedule in Bangladeshi Taka (BDT)',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const EmiCalculatorScreen())),
          ),

          const SizedBox(height: 24),
          // Logout button
          OutlinedButton.icon(
            icon: const Icon(Icons.logout, size: 16),
            label: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.redAccent,
              side: const BorderSide(color: Colors.redAccent),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
            onPressed: () {
              _api.logout();
              Navigator.pushAndRemoveUntil(
                context,
                MaterialPageRoute(builder: (_) => LoginScreen(onLoginSuccess: () {
                  Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const MainNavigationScreen()));
                })),
                (route) => false,
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _menuItem({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    int? badgeCount,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: const Color(0xFF0F172A).withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: color, size: 20),
        ),
        title: Text(title, style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w600, fontSize: 13)),
        subtitle: Text(subtitle, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (badgeCount != null && badgeCount > 0)
              Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(color: Colors.redAccent, borderRadius: BorderRadius.circular(10)),
                child: Text('$badgeCount', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            const Icon(Icons.chevron_right, color: Color(0xFF94A3B8), size: 18),
          ],
        ),
      ),
    );
  }
}
