import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../screens/procurement_monitoring_screen.dart';
import '../screens/construction_monitoring_screen.dart';
import '../screens/hr_overview_screen.dart';
import '../screens/compliance_alerts_screen.dart';
import '../screens/management_reports_screen.dart';

class ManagementSideMenu extends StatelessWidget {
  final int currentTabIndex;
  final Function(int)? onSelectTab;
  final VoidCallback onLogout;

  const ManagementSideMenu({
    super.key,
    required this.currentTabIndex,
    this.onSelectTab,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
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
              color: ManagementTheme.royalNavy,
              border: Border(
                bottom: BorderSide(color: ManagementTheme.luxuryGold, width: 2),
              ),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: ManagementTheme.luxuryGold.withOpacity(0.2),
                  child: const Text(
                    'MD',
                    style: TextStyle(
                      color: Colors.amber,
                      fontWeight: FontWeight.bold,
                      fontSize: 20,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Director Portal',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'BlueOceans Real Estate Ltd.',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        'C-Suite Executive Level',
                        style: TextStyle(
                          color: Colors.amber,
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
                _buildSectionHeader('EXECUTIVE SUITE'),
                _buildMenuItem(
                  context,
                  icon: Icons.dashboard_rounded,
                  title: 'Executive Dashboard',
                  subtitle: 'Financial KPI Cockpit',
                  isSelected: currentTabIndex == 0,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(0);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.analytics_rounded,
                  title: 'Project Performance',
                  subtitle: 'Cost Variance & Budgets',
                  isSelected: currentTabIndex == 1,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(1);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.pie_chart_rounded,
                  title: 'Sales Analytics',
                  subtitle: 'Units, Conversion & Leads',
                  isSelected: currentTabIndex == 2,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(2);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.account_balance_wallet_rounded,
                  title: 'Cash Flow Monitoring',
                  subtitle: 'Receivables & Liquidity',
                  isSelected: currentTabIndex == 3,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(3);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.approval_rounded,
                  title: 'Approval Center',
                  subtitle: 'POs, Budgets & Discounts',
                  isSelected: currentTabIndex == 4,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(4);
                  },
                ),

                const Divider(height: 24, thickness: 1, color: ManagementTheme.borderSubtle),

                _buildSectionHeader('OPERATIONS & GOVERNANCE'),
                _buildMenuItem(
                  context,
                  icon: Icons.shopping_cart_checkout_rounded,
                  title: 'Procurement Monitoring',
                  subtitle: 'Requisitions, RFQs & POs',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ProcurementMonitoringScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.construction_rounded,
                  title: 'Construction Monitoring',
                  subtitle: 'Milestones & Contractors',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ConstructionMonitoringScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.groups_rounded,
                  title: 'HR & Workforce Overview',
                  subtitle: 'Attendance, Leaves & Payroll',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const HrOverviewScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.gavel_rounded,
                  title: 'Compliance & Legal',
                  subtitle: 'RAJUK, Permits & Expiries',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ComplianceAlertsScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.picture_as_pdf_rounded,
                  title: 'Executive Reports',
                  subtitle: 'Board Packs & Financials',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ManagementReportsScreen()),
                    );
                  },
                ),
              ],
            ),
          ),

          // Bottom Bar (Logout & Version)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFFF1F5F9),
              border: Border(
                top: BorderSide(color: ManagementTheme.borderSubtle),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: ManagementTheme.alertCrimson,
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
                  'v2.4.0 ERP',
                  style: TextStyle(fontSize: 11, color: ManagementTheme.textMuted),
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
          color: ManagementTheme.textMuted,
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
              ? ManagementTheme.royalNavy.withOpacity(0.1)
              : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 20,
          color: isSelected ? ManagementTheme.royalNavy : const Color(0xFF475569),
        ),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
          color: isSelected ? ManagementTheme.royalNavy : ManagementTheme.slateText,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 11, color: ManagementTheme.textMuted),
      ),
      trailing: isSelected
          ? Container(
              width: 6,
              height: 24,
              decoration: BoxDecoration(
                color: ManagementTheme.luxuryGold,
                borderRadius: BorderRadius.circular(3),
              ),
            )
          : const Icon(Icons.chevron_right, size: 16, color: Color(0xFFCBD5E1)),
      onTap: onTap,
    );
  }
}
