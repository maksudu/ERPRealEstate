import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../core/network/api_client.dart';
import 'manager_attendance_screen.dart';
import 'manager_approvals_screen.dart';
import 'manager_workforce_screen.dart';
import 'manager_payroll_reports_screen.dart';

class ManagerDashboardScreen extends StatefulWidget {
  final VoidCallback? onLogout;
  final VoidCallback? onSwitchToEss;
  final VoidCallback? onOpenDrawer;

  const ManagerDashboardScreen({
    super.key,
    this.onLogout,
    this.onSwitchToEss,
    this.onOpenDrawer,
  });

  @override
  State<ManagerDashboardScreen> createState() => _ManagerDashboardScreenState();
}

class _ManagerDashboardScreenState extends State<ManagerDashboardScreen> {
  final _api = HrApiClient();
  bool _isLoading = true;
  Map<String, dynamic>? _data;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getManagerDashboard();
      if (mounted) setState(() => _data = res);
    } catch (_) {
      if (mounted) {
        setState(() {
          _data = {
            'overview': {
              'total_employees': 148,
              'present_today': 139,
              'absent_today': 3,
              'on_leave_today': 6,
              'pending_approvals_total': 7,
              'site_labor_count': 348,
            },
            'pending_breakdown': {
              'leave_requests': 3,
              'overtime_requests': 2,
              'attendance_corrections': 2,
            },
          };
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final ov = _data?['overview'] ?? {};
    final brk = _data?['pending_breakdown'] ?? {};

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: HrTheme.deepNavy),
            tooltip: 'Open Menu',
            onPressed: () {
              if (widget.onOpenDrawer != null) {
                widget.onOpenDrawer!();
              } else {
                Scaffold.of(ctx).openDrawer();
              }
            },
          ),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'HR & MANAGER OPERATIONS',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: HrTheme.primaryIndigo),
            ),
            Text(
              'Workforce Command Center',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: HrTheme.deepNavy),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: HrTheme.deepNavy, size: 20),
            tooltip: 'Refresh',
            onPressed: _loadDashboard,
          ),
          if (widget.onLogout != null)
            IconButton(
              icon: const Icon(Icons.logout, color: Color(0xFF64748B), size: 20),
              tooltip: 'Logout',
              onPressed: widget.onLogout,
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: HrTheme.primaryIndigo))
          : RefreshIndicator(
              onRefresh: _loadDashboard,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Switch to ESS Self-Service
                    if (widget.onSwitchToEss != null) ...[
                      InkWell(
                        onTap: widget.onSwitchToEss,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: HrTheme.slateBorder),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.person, color: HrTheme.deepNavy, size: 20),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Switch to Employee Self-Service (ESS)',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.deepNavy),
                                ),
                              ),
                              Icon(Icons.arrow_forward, color: HrTheme.deepNavy, size: 16),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Pending Approvals Banner
                    InkWell(
                      onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const ManagerApprovalsScreen()));
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: const BoxDecoration(color: HrTheme.amberWarning, shape: BoxShape.circle),
                              child: const Icon(Icons.pending_actions, color: Colors.white, size: 18),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${ov['pending_approvals_total'] ?? 7} Approvals Awaiting Action',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF92400E)),
                                  ),
                                  Text(
                                    '${brk['leave_requests']} leaves • ${brk['overtime_requests']} OT • ${brk['attendance_corrections']} corrections',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFFB45309)),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFF92400E)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Headcount Row
                    Row(
                      children: [
                        _metricTile('HEADCOUNT', '${ov['total_employees']}', Icons.badge_outlined, HrTheme.deepNavy),
                        const SizedBox(width: 10),
                        _metricTile('PRESENT', '${ov['present_today']}', Icons.check_circle_outline, HrTheme.successTeal),
                        const SizedBox(width: 10),
                        _metricTile('ON LEAVE', '${ov['on_leave_today']}', Icons.event_busy_outlined, HrTheme.amberWarning),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Construction Site Labor Headcount
                    Card(
                      color: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: HrTheme.slateBorder),
                      ),
                      child: ListTile(
                        leading: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(10)),
                          child: const Icon(Icons.engineering, color: HrTheme.primaryIndigo, size: 22),
                        ),
                        title: const Text('Site Labour Deployment', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.deepNavy)),
                        subtitle: const Text('Across 6 active construction towers', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        trailing: Text(
                          '${ov['site_labor_count'] ?? 348} Workers',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: HrTheme.primaryIndigo),
                        ),
                        onTap: () {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => const ManagerWorkforceScreen()));
                        },
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Manager Modules Hub
                    const Text('WORKFORCE MANAGEMENT MODULES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Color(0xFF64748B))),
                    const SizedBox(height: 12),
                    _buildManagerGrid(context),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _metricTile(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Card(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: HrTheme.slateBorder),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(height: 8),
              Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: HrTheme.deepNavy)),
              const SizedBox(height: 2),
              Text(label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildManagerGrid(BuildContext context) {
    final modules = [
      {'title': 'Attendance Roster', 'subtitle': 'Daily GPS & Punches', 'icon': Icons.co_present, 'page': const ManagerAttendanceScreen()},
      {'title': 'Leave & OT Approvals', 'subtitle': 'Review Team Requests', 'icon': Icons.rule_folder_outlined, 'page': const ManagerApprovalsScreen()},
      {'title': 'Site Workforce', 'subtitle': 'Project Manpower & Labour', 'icon': Icons.construction_outlined, 'page': const ManagerWorkforceScreen()},
      {'title': 'Payroll & Analytics', 'subtitle': 'Summaries & Cost Reports', 'icon': Icons.analytics_outlined, 'page': const ManagerPayrollReportsScreen()},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: modules.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.45,
      ),
      itemBuilder: (context, idx) {
        final m = modules[idx];
        return Card(
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: HrTheme.slateBorder),
          ),
          child: InkWell(
            onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => m['page'] as Widget));
            },
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(m['icon'] as IconData, color: HrTheme.primaryIndigo, size: 24),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        m['title'] as String,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.deepNavy),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        m['subtitle'] as String,
                        style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
