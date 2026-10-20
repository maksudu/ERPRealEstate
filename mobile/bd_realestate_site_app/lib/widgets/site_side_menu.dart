import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../screens/anti_tamper_camera_screen.dart';
import '../screens/labor_muster_screen.dart';
import '../screens/contractor_management_screen.dart';
import '../screens/safety_management_screen.dart';

class SiteSideMenu extends StatelessWidget {
  final int currentTabIndex;
  final Function(int)? onSelectTab;
  final VoidCallback? onLogout;

  const SiteSideMenu({
    super.key,
    required this.currentTabIndex,
    this.onSelectTab,
    this.onLogout,
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
                colors: [SiteAppTheme.primarySafetyOrange, Color(0xFFC2410C)],
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
                      child: const Icon(
                        Icons.engineering_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Engr. Kamrul Hasan',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'SE-204 • Project Lead Engineer',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            'Grand Vista, Bashundhara R/A',
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
                      Icon(Icons.shield_rounded, color: Colors.amberAccent, size: 15),
                      SizedBox(width: 6),
                      Text(
                        'Site Safety Protocol: Level 1 PPE Mandatory',
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
                _buildSectionHeader('SITE OPERATIONS HUB'),
                _buildMenuItem(
                  context,
                  icon: Icons.dashboard_rounded,
                  title: 'Site Dashboard',
                  subtitle: 'Project Progress, Weather & DPR',
                  isSelected: currentTabIndex == 0,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(0);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.assignment_rounded,
                  title: 'Daily Progress Report (DPR)',
                  subtitle: 'Work Done, Labour & Weather',
                  isSelected: currentTabIndex == 1,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(1);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.task_alt_rounded,
                  title: 'Task & Milestones',
                  subtitle: 'Deadlines, Assignees & WBS',
                  isSelected: currentTabIndex == 2,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(2);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.add_shopping_cart_rounded,
                  title: 'Material Requisition',
                  subtitle: 'Steel, Cement, Sand & Indent',
                  isSelected: currentTabIndex == 3,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(3);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.science_rounded,
                  title: 'Cube Test & QC Lab',
                  subtitle: '7/28-Day Concrete Crushing',
                  isSelected: currentTabIndex == 4,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(4);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.inventory_2_rounded,
                  title: 'Store GRN & Issue',
                  subtitle: 'Challan Entry & Daily Consumption',
                  isSelected: currentTabIndex == 5,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(5);
                  },
                ),

                const Divider(height: 24, thickness: 1, color: Color(0xFFE2E8F0)),
                _buildSectionHeader('FIELD QUALITY & WORKFORCE'),
                _buildMenuItem(
                  context,
                  icon: Icons.camera_alt_rounded,
                  title: 'Anti-Tamper Site Photo',
                  subtitle: 'Watermarked GPS & Timestamp',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const AntiTamperCameraScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.groups_rounded,
                  title: 'Labour Muster Roll',
                  subtitle: 'Mason, Rod-binder & Helpers',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LaborMusterScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.handshake_rounded,
                  title: 'Contractor Management',
                  subtitle: 'Measurement Book & Bills',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ContractorManagementScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.health_and_safety_rounded,
                  title: 'Safety & Incident Logs',
                  subtitle: 'Near-miss, PPE & Hazards',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SafetyManagementScreen()),
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
                      foregroundColor: SiteAppTheme.alertRed,
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
                      onLogout?.call();
                    },
                  ),
                ),
                const Text(
                  'SiteERP v2.4',
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
              ? SiteAppTheme.primarySafetyOrange.withOpacity(0.12)
              : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 20,
          color: isSelected ? SiteAppTheme.primarySafetyOrange : const Color(0xFF475569),
        ),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
          color: isSelected ? SiteAppTheme.primarySafetyOrange : SiteAppTheme.steelSlate,
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
                color: SiteAppTheme.primarySafetyOrange,
                borderRadius: BorderRadius.circular(3),
              ),
            )
          : const Icon(Icons.chevron_right, size: 16, color: Color(0xFFCBD5E1)),
      onTap: onTap,
    );
  }
}
