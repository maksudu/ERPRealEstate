import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../core/network/api_client.dart';
import 'gps_attendance_screen.dart';
import 'leave_overtime_screen.dart';
import 'payroll_payslips_screen.dart';
import 'loans_advances_screen.dart';
import 'my_profile_screen.dart';

class EssDashboardScreen extends StatefulWidget {
  final VoidCallback? onLogout;
  final VoidCallback? onSwitchToManager;
  final VoidCallback? onOpenDrawer;

  const EssDashboardScreen({
    super.key,
    this.onLogout,
    this.onSwitchToManager,
    this.onOpenDrawer,
  });

  @override
  State<EssDashboardScreen> createState() => _EssDashboardScreenState();
}

class _EssDashboardScreenState extends State<EssDashboardScreen> {
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
      final res = await _api.getEssDashboard();
      if (mounted) setState(() => _data = res);
    } catch (_) {
      if (mounted) {
        setState(() {
          _data = {
            'today_attendance': {
              'date': '2026-10-20',
              'clock_in': '09:08 AM',
              'clock_out': null,
              'status': 'PRESENT',
              'working_hours': 4.5,
              'is_late': false,
              'location': 'Green Horizon Tower Site (Gulshan-2)',
            },
            'leave_summary': {
              'casual_balance': 8,
              'sick_balance': 12,
              'earned_balance': 15,
            },
            'upcoming_holidays': [
              {'date': '2026-11-07', 'title': 'National Revolution Day', 'days': 1},
              {'date': '2026-12-16', 'title': 'Victory Day (Bijoy Dibosh)', 'days': 1},
            ],
            'notifications': [
              {'title': 'October Salary Slip Generated', 'date': '2026-10-18', 'type': 'PAYROLL'},
            ],
          };
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final att = _data?['today_attendance'] ?? {};
    final leaves = _data?['leave_summary'] ?? {};
    final holidays = (_data?['upcoming_holidays'] as List<dynamic>?) ?? [];

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
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'EMPLOYEE SELF-SERVICE',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1.2, color: HrTheme.primaryIndigo),
            ),
            Text(
              _api.currentUser?['full_name'] ?? 'Workforce Portal',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: HrTheme.deepNavy),
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
                    // Switch to Manager Mode if authorized
                    if (_api.isManager && widget.onSwitchToManager != null) ...[
                      InkWell(
                        onTap: widget.onSwitchToManager,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEEF2FF),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: HrTheme.primaryIndigo.withOpacity(0.3)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.admin_panel_settings, color: HrTheme.primaryIndigo, size: 20),
                              SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Switch to HR & Manager Mode',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.primaryIndigo),
                                ),
                              ),
                              Icon(Icons.arrow_forward, color: HrTheme.primaryIndigo, size: 16),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Live Attendance Status Card
                    Card(
                      color: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                        side: const BorderSide(color: HrTheme.slateBorder),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('TODAY’S ATTENDANCE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFECFDF5),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    att['status'] ?? 'PRESENT',
                                    style: const TextStyle(color: HrTheme.successTeal, fontWeight: FontWeight.bold, fontSize: 11),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Clock In', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                                      const SizedBox(height: 2),
                                      Text(att['clock_in'] ?? '--:--', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: HrTheme.deepNavy)),
                                    ],
                                  ),
                                ),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Clock Out', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                                      const SizedBox(height: 2),
                                      Text(att['clock_out'] ?? '--:--', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                                    ],
                                  ),
                                ),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Logged Hours', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                                      const SizedBox(height: 2),
                                      Text('${att['working_hours'] ?? 0} hrs', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: HrTheme.primaryIndigo)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Divider(color: Color(0xFFF1F5F9)),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.location_on_outlined, size: 16, color: Color(0xFF64748B)),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    att['location'] ?? 'Corporate Location',
                                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Leave Balances Pill Row
                    Row(
                      children: [
                        _leaveTile('Casual Leave', '${leaves['casual_balance'] ?? 8} Left', HrTheme.primaryIndigo),
                        const SizedBox(width: 8),
                        _leaveTile('Sick Leave', '${leaves['sick_balance'] ?? 12} Left', HrTheme.successTeal),
                        const SizedBox(width: 8),
                        _leaveTile('Earned Leave', '${leaves['earned_balance'] ?? 15} Left', HrTheme.amberWarning),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Self-Service Modules Grid
                    const Text('SELF-SERVICE MODULES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Color(0xFF64748B))),
                    const SizedBox(height: 12),
                    _buildModuleGrid(context),
                    const SizedBox(height: 24),

                    // Upcoming Holidays
                    const Text('UPCOMING PUBLIC & GOVT HOLIDAYS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Color(0xFF64748B))),
                    const SizedBox(height: 10),
                    ...holidays.map((h) => Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          color: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: const BorderSide(color: HrTheme.slateBorder),
                          ),
                          child: ListTile(
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(10)),
                              child: const Icon(Icons.event_available, color: HrTheme.primaryIndigo, size: 20),
                            ),
                            title: Text(h['title'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.deepNavy)),
                            subtitle: Text('Date: ${h['date']}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
                              child: Text('${h['days']} Day Off', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: HrTheme.deepNavy)),
                            ),
                          ),
                        )),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _leaveTile(String title, String balance, Color color) {
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
              Text(title, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(balance, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildModuleGrid(BuildContext context) {
    final modules = [
      {'title': 'Attendance & GPS', 'subtitle': 'Check-In, Out & History', 'icon': Icons.fingerprint, 'page': const GpsAttendanceScreen()},
      {'title': 'Leave & Overtime', 'subtitle': 'Apply & Track Status', 'icon': Icons.date_range_outlined, 'page': const LeaveOvertimeScreen()},
      {'title': 'Payroll & Payslips', 'subtitle': 'Monthly Salary Statements', 'icon': Icons.receipt_long_outlined, 'page': const PayrollPayslipsScreen()},
      {'title': 'Loans & Advances', 'subtitle': 'Apply & Repayment Schedule', 'icon': Icons.account_balance_wallet_outlined, 'page': const LoansAdvancesScreen()},
      {'title': 'My Profile & Docs', 'subtitle': 'Personal, Bank & NID', 'icon': Icons.person_outline, 'page': const MyProfileScreen()},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: modules.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.5,
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
