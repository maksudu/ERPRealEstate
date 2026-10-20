import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../screens/unit_matrix_screen.dart';
import '../screens/booking_manager_screen.dart';
import '../screens/quotation_screen.dart';
import '../screens/site_visit_screen.dart';
import '../screens/emi_calculator_screen.dart';
import '../screens/approval_screen.dart';
import '../screens/notifications_screen.dart';

class SalesSideMenu extends StatelessWidget {
  final int currentTabIndex;
  final Function(int)? onSelectTab;
  final VoidCallback onLogout;

  const SalesSideMenu({
    super.key,
    required this.currentTabIndex,
    this.onSelectTab,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    final user = ApiClient().currentUser;

    return Drawer(
      backgroundColor: Colors.white,
      child: Column(
        children: [
          // Header
          Container(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 20,
              bottom: 20,
              left: 20,
              right: 20,
            ),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppTheme.primaryTeal, Color(0xFF0F766E)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor: Colors.white.withOpacity(0.2),
                      child: Text(
                        (user?['full_name_en'] ?? user?['username'] ?? 'SE')
                            .toString()
                            .substring(0, 2)
                            .toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user != null ? '${user['full_name_en'] ?? user['username']}' : 'Sales Executive',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            user != null && user['is_group_admin'] == true ? 'Senior Sales Director' : 'Relationship Manager',
                            style: const TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                          const Text(
                            'BlueOceans Real Estate · Dhaka',
                            style: TextStyle(
                              color: Colors.white60,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.workspace_premium_rounded, color: Colors.amberAccent, size: 16),
                      SizedBox(width: 6),
                      Text(
                        'Monthly Target: 82% Achieved (৳ 4.1 Cr)',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Menu List
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                _buildSectionHeader('SALES & PIPELINE'),
                _buildMenuItem(
                  context,
                  icon: Icons.dashboard_rounded,
                  title: 'Sales Cockpit',
                  subtitle: 'Daily KPIs, Pipeline & Actions',
                  isSelected: currentTabIndex == 0,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(0);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.people_alt_rounded,
                  title: 'Lead Management (CRM)',
                  subtitle: 'Inquiries, Pipeline Stages & Calls',
                  isSelected: currentTabIndex == 1,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(1);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.contact_mail_rounded,
                  title: 'Customer Directory',
                  subtitle: 'Clients, KYC & Booking Records',
                  isSelected: currentTabIndex == 2,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(2);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.apartment_rounded,
                  title: 'Projects & Inventory',
                  subtitle: 'Brochures, Floor Plans & Units',
                  isSelected: currentTabIndex == 3,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(3);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.grid_view_rounded,
                  title: 'Unit Matrix (Live Lock)',
                  subtitle: 'Interactive Visual Availability',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const UnitMatrixScreen()),
                    );
                  },
                ),

                const Divider(height: 24, thickness: 1, color: Color(0xFFE2E8F0)),
                _buildSectionHeader('DEALS & OPERATIONS'),
                _buildMenuItem(
                  context,
                  icon: Icons.book_online_rounded,
                  title: 'Booking Management',
                  subtitle: 'Allotment, Customer KYC & Sign',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const BookingManagerScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.request_quote_rounded,
                  title: 'Quotation Generator',
                  subtitle: 'Payment Plans & PDF Estimates',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const QuotationScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.location_city_rounded,
                  title: 'Site Visit Schedule',
                  subtitle: 'Calendar, Cab & Client Visits',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SiteVisitScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.calculate_rounded,
                  title: 'EMI & Loan Calculator',
                  subtitle: 'BD Bank Rates & Amortization',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const EmiCalculatorScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.approval_rounded,
                  title: 'Discounts & Approvals',
                  subtitle: 'Special Price & Parking Waivers',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ApprovalScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.notifications_rounded,
                  title: 'Notifications & Alerts',
                  subtitle: 'Broadcasts & Activity Feed',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                    );
                  },
                ),
              ],
            ),
          ),

          // Bottom Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              border: Border(
                top: BorderSide(color: Color(0xFFE2E8F0)),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFFDC2626),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      alignment: Alignment.centerLeft,
                    ),
                    icon: const Icon(Icons.logout_rounded, size: 20),
                    label: const Text(
                      'Logout Session',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    onPressed: () {
                      Navigator.pop(context);
                      onLogout();
                    },
                  ),
                ),
                const Text(
                  'Sales v3.2',
                  style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 20, top: 12, bottom: 6),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: Color(0xFF64748B),
          letterSpacing: 1.1,
        ),
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    bool isSelected = false,
    required VoidCallback onTap,
  }) {
    return ListTile(
      dense: true,
      leading: Container(
        padding: const EdgeInsets.all(7),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primaryTeal.withOpacity(0.12)
              : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 20,
          color: isSelected ? AppTheme.primaryTeal : const Color(0xFF475569),
        ),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
          color: isSelected ? AppTheme.primaryTeal : const Color(0xFF1E293B),
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
      ),
      trailing: isSelected
          ? Container(
              width: 5,
              height: 22,
              decoration: BoxDecoration(
                color: AppTheme.primaryTeal,
                borderRadius: BorderRadius.circular(3),
              ),
            )
          : const Icon(Icons.chevron_right, size: 16, color: Color(0xFFCBD5E1)),
      onTap: onTap,
    );
  }
}
