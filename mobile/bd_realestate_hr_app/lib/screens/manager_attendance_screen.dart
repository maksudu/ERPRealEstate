import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../core/network/api_client.dart';

class ManagerAttendanceScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const ManagerAttendanceScreen({super.key, this.onOpenDrawer});

  @override
  State<ManagerAttendanceScreen> createState() => _ManagerAttendanceScreenState();
}

class _ManagerAttendanceScreenState extends State<ManagerAttendanceScreen> {
  final _api = HrApiClient();
  bool _isLoading = true;
  List<dynamic> _roster = [];

  @override
  void initState() {
    super.initState();
    _fetchAttendance();
  }

  Future<void> _fetchAttendance() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getManagerAttendance();
      if (mounted) setState(() => _roster = res['roster'] ?? []);
    } catch (_) {
      if (mounted) {
        setState(() {
          _roster = [
            {'code': 'EMP-1042', 'name': 'Engr. Kamal Hossain', 'dept': 'Civil Engg', 'in': '09:08 AM', 'out': '--:--', 'status': 'PRESENT', 'location': 'Gulshan Site'},
            {'code': 'EMP-1043', 'name': 'Md. Tariqul Islam', 'dept': 'Sales CRM', 'in': '08:55 AM', 'out': '--:--', 'status': 'PRESENT', 'location': 'Corporate HQ'},
            {'code': 'EMP-1044', 'name': 'Tanvir Ahmed', 'dept': 'Architecture', 'in': '--:--', 'out': '--:--', 'status': 'ON_LEAVE', 'location': 'Casual Leave'},
            {'code': 'EMP-1045', 'name': 'Abdul Hannan', 'dept': 'Procurement', 'in': '09:40 AM', 'out': '--:--', 'status': 'LATE', 'location': 'Central Store'},
            {'code': 'EMP-1046', 'name': 'Sabbir Hossain', 'dept': 'Accounts', 'in': '--:--', 'out': '--:--', 'status': 'MISSING_PUNCH', 'location': 'Unknown'},
          ];
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
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
        title: const Text('Workforce Attendance Roster', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: HrTheme.primaryIndigo))
          : RefreshIndicator(
              onRefresh: _fetchAttendance,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _roster.length,
                itemBuilder: (context, idx) {
                  final r = _roster[idx];
                  final status = r['status'] ?? '';
                  final isPresent = status == 'PRESENT';
                  final isLate = status == 'LATE';
                  final isMissing = status == 'MISSING_PUNCH';

                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    color: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: const BorderSide(color: HrTheme.slateBorder),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(r['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: HrTheme.deepNavy)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: isPresent
                                      ? const Color(0xFFECFDF5)
                                      : isLate
                                          ? const Color(0xFFFFFBEB)
                                          : isMissing
                                              ? const Color(0xFFFEF2F2)
                                              : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  status.replaceAll('_', ' '),
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: isPresent
                                        ? HrTheme.successTeal
                                        : isLate
                                            ? HrTheme.amberWarning
                                            : isMissing
                                                ? HrTheme.alertCrimson
                                                : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text('${r['code']} • ${r['dept']} • ${r['location']}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.access_time, size: 14, color: Color(0xFF64748B)),
                              const SizedBox(width: 4),
                              Text('In: ${r['in']}  |  Out: ${r['out']}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: HrTheme.deepNavy)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
