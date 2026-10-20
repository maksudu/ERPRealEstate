import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../screens/loans_advances_screen.dart';
import '../screens/project_timesheet_screen.dart';

class HrSideMenu extends StatelessWidget {
  final bool isManagerMode;
  final int currentTabIndex;
  final Function(int)? onSelectTab;
  final VoidCallback onToggleMode;
  final VoidCallback onLogout;

  const HrSideMenu({
    super.key,
    required this.isManagerMode,
    required this.currentTabIndex,
    this.onSelectTab,
    required this.onToggleMode,
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
              gradient: LinearGradient(
                colors: [HrTheme.primaryIndigo, Color(0xFF3730A3)],
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
                      child: const Text(
                        'TA',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Tanvir Ahmed',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'EMP-0419 • Sr. Project Eng.',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            'Engineering & Construction',
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
                const SizedBox(height: 14),
                // Mode Pill & Switcher
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            isManagerMode ? Icons.admin_panel_settings : Icons.person_rounded,
                            color: isManagerMode ? const Color(0xFFFDE047) : Colors.white,
                            size: 16,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            isManagerMode ? 'Manager Mode Active' : 'Self-Service Mode (ESS)',
                            style: TextStyle(
                              color: isManagerMode ? const Color(0xFFFDE047) : Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      GestureDetector(
                        onTap: () {
                          Navigator.pop(context);
                          onToggleMode();
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            isManagerMode ? 'Switch to ESS' : 'Switch Manager',
                            style: const TextStyle(
                              color: HrTheme.primaryIndigo,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
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
              children: isManagerMode ? _buildManagerMenuItems(context) : _buildEssMenuItems(context),
            ),
          ),

          // Bottom Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              border: Border(
                top: BorderSide(color: HrTheme.slateBorder),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: HrTheme.alertCrimson,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      alignment: Alignment.centerLeft,
                    ),
                    icon: const Icon(Icons.logout_rounded, size: 20),
                    label: const Text(
                      'Logout Account',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    onPressed: () {
                      Navigator.pop(context);
                      onLogout();
                    },
                  ),
                ),
                const Text(
                  'HR ERP v3.1',
                  style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildEssMenuItems(BuildContext context) {
    return [
      _buildSectionHeader('EMPLOYEE SELF-SERVICE'),
      _buildMenuItem(
        context,
        icon: Icons.dashboard_rounded,
        title: 'ESS Dashboard',
        subtitle: 'Hours, Leaves & Quick Actions',
        isSelected: currentTabIndex == 0,
        onTap: () {
          Navigator.pop(context);
          onSelectTab?.call(0);
        },
      ),
      _buildMenuItem(
        context,
        icon: Icons.location_on_rounded,
        title: 'Attendance & GPS Check-in',
        subtitle: 'Geofenced Mobile Punching',
        isSelected: currentTabIndex == 1,
        onTap: () {
          Navigator.pop(context);
          onSelectTab?.call(1);
        },
      ),
      _buildMenuItem(
        context,
        icon: Icons.date_range_rounded,
        title: 'Leave & Overtime',
        subtitle: 'Applications & Approvals',
        isSelected: currentTabIndex == 2,
        onTap: () {
          Navigator.pop(context);
          onSelectTab?.call(2);
        },
      ),
      _buildMenuItem(
        context,
        icon: Icons.receipt_long_rounded,
        title: 'Payroll & Payslips',
        subtitle: 'Salary Slips & Deductions',
        isSelected: currentTabIndex == 3,
        onTap: () {
          Navigator.pop(context);
          onSelectTab?.call(3);
        },
      ),
      _buildMenuItem(
        context,
        icon: Icons.person_rounded,
        title: 'My Profile & Documents',
        subtitle: 'Personal & Official Info',
        isSelected: currentTabIndex == 4,
        onTap: () {
          Navigator.pop(context);
          onSelectTab?.call(4);
        },
      ),

      const Divider(height: 24, thickness: 1, color: HrTheme.slateBorder),
      _buildSectionHeader('ADDITIONAL ESS SERVICES'),
      _buildMenuItem(
        context,
        icon: Icons.payments_rounded,
        title: 'Loans & Salary Advances',
        subtitle: 'Apply & Track Repayments',
        onTap: () {
          Navigator.pop(context);
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const LoansAdvancesScreen()),
          );
        },
      ),
      _buildMenuItem(
        context,
        icon: Icons.schedule_rounded,
        title: 'Project Timesheet',
        subtitle: 'Site Hours & Task Logging',
        onTap: () {
          Navigator.pop(context);
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ProjectTimesheetScreen()),
          );
        },
      ),
    ];
  }

  List<Widget> _buildManagerMenuItems(BuildContext context) {
    return [
      _buildSectionHeader('MANAGER OVERSIGHT (MSS)'),
      _buildMenuItem(
        context,
        icon: Icons.admin_panel_settings_rounded,
        title: 'Manager Dashboard',
        subtitle: 'Workforce Headcount & Alerts',
        isSelected: currentTabIndex == 0,
        onTap: () {
          Navigator.pop(context);
          onSelectTab?.call(0);
        },
      ),
      _buildMenuItem(
        context,
        icon: Icons.co_present_rounded,
        title: 'Team Attendance Roster',
        subtitle: 'Punches, Late & Absentees',
        isSelected: currentTabIndex == 1,
        onTap: () {
          Navigator.pop(context);
          onSelectTab?.call(1);
        },
      ),
      _buildMenuItem(
        context,
        icon: Icons.rule_folder_rounded,
        title: 'Approval Center',
        subtitle: 'Leave, OT & Correction Claims',
        isSelected: currentTabIndex == 2,
        onTap: () {
          Navigator.pop(context);
          onSelectTab?.call(2);
        },
      ),
      _buildMenuItem(
        context,
        icon: Icons.engineering_rounded,
        title: 'Site Labour Workforce',
        subtitle: 'Contractor Headcounts',
        isSelected: currentTabIndex == 3,
        onTap: () {
          Navigator.pop(context);
          onSelectTab?.call(3);
        },
      ),
      _buildMenuItem(
        context,
        icon: Icons.analytics_rounded,
        title: 'HR & Payroll Analytics',
        subtitle: 'Cost Trends & Wage Reports',
        isSelected: currentTabIndex == 4,
        onTap: () {
          Navigator.pop(context);
          onSelectTab?.call(4);
        },
      ),
    ];
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
              ? HrTheme.primaryIndigo.withOpacity(0.12)
              : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 20,
          color: isSelected ? HrTheme.primaryIndigo : const Color(0xFF475569),
        ),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
          color: isSelected ? HrTheme.primaryIndigo : const Color(0xFF1E293B),
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
                color: HrTheme.primaryIndigo,
                borderRadius: BorderRadius.circular(3),
              ),
            )
          : const Icon(Icons.chevron_right, size: 16, color: Color(0xFFCBD5E1)),
      onTap: onTap,
    );
  }
}
