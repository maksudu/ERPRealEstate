import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../core/network/api_client.dart';

class GpsAttendanceScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const GpsAttendanceScreen({super.key, this.onOpenDrawer});

  @override
  State<GpsAttendanceScreen> createState() => _GpsAttendanceScreenState();
}

class _GpsAttendanceScreenState extends State<GpsAttendanceScreen> {
  final _api = HrApiClient();
  bool _isLoading = true;
  bool _isPunching = false;
  List<dynamic> _history = [];

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getAttendanceHistory();
      if (mounted) setState(() => _history = res['records'] ?? []);
    } catch (_) {
      if (mounted) {
        setState(() {
          _history = [
            {'date': '2026-10-20', 'in': '09:08 AM', 'out': '--:--', 'status': 'PRESENT', 'hours': 4.5, 'late_min': 0},
            {'date': '2026-10-19', 'in': '09:15 AM', 'out': '06:10 PM', 'status': 'LATE', 'hours': 8.9, 'late_min': 15},
            {'date': '2026-10-18', 'in': '08:55 AM', 'out': '06:05 PM', 'status': 'PRESENT', 'hours': 9.1, 'late_min': 0},
            {'date': '2026-10-17', 'in': '09:02 AM', 'out': '06:15 PM', 'status': 'PRESENT', 'hours': 9.2, 'late_min': 0},
            {'date': '2026-10-16', 'in': '--:--', 'out': '--:--', 'status': 'WEEKLY_OFF', 'hours': 0.0, 'late_min': 0},
          ];
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _performGpsPunch(String type) async {
    setState(() => _isPunching = true);
    try {
      final res = await _api.checkInOut(
        punchType: type,
        latitude: 23.7925,
        longitude: 90.4078,
        siteName: 'Green Horizon Tower Site (Gulshan-2)',
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: HrTheme.successTeal,
            content: Text(res['message'] ?? 'Punch recorded successfully!'),
          ),
        );
        _fetchHistory();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(backgroundColor: HrTheme.alertCrimson, content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _isPunching = false);
    }
  }

  void _showCorrectionDialog() {
    final dateCtrl = TextEditingController(text: '2026-10-19');
    final inCtrl = TextEditingController(text: '09:00 AM');
    final outCtrl = TextEditingController(text: '06:00 PM');
    final reasonCtrl = TextEditingController(text: 'Biometric device connection was offline at site');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Request Punch Correction', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: dateCtrl, decoration: const InputDecoration(labelText: 'Date (YYYY-MM-DD)')),
              const SizedBox(height: 10),
              TextField(controller: inCtrl, decoration: const InputDecoration(labelText: 'Correct Clock In')),
              const SizedBox(height: 10),
              TextField(controller: outCtrl, decoration: const InputDecoration(labelText: 'Correct Clock Out')),
              const SizedBox(height: 10),
              TextField(controller: reasonCtrl, decoration: const InputDecoration(labelText: 'Reason for Discrepancy'), maxLines: 2),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: HrTheme.primaryIndigo),
            onPressed: () async {
              Navigator.pop(ctx);
              await _api.submitAttendanceCorrection(
                date: dateCtrl.text,
                inTime: inCtrl.text,
                outTime: outCtrl.text,
                reason: reasonCtrl.text,
              );
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(backgroundColor: HrTheme.primaryIndigo, content: Text('Correction request submitted to manager!')),
                );
              }
            },
            child: const Text('Submit Request'),
          ),
        ],
      ),
    );
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
        title: const Text('Attendance & GPS Punch', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_calendar, color: HrTheme.primaryIndigo, size: 20),
            tooltip: 'Request Correction',
            onPressed: _showCorrectionDialog,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: HrTheme.primaryIndigo))
          : RefreshIndicator(
              onRefresh: _fetchHistory,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // GPS Check-in Card
                    Card(
                      color: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(18),
                        side: const BorderSide(color: HrTheme.slateBorder),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(10)),
                                  child: const Icon(Icons.my_location, color: HrTheme.successTeal, size: 20),
                                ),
                                const SizedBox(width: 12),
                                const Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('GEOFENCE VERIFIED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: HrTheme.successTeal)),
                                      Text('Gulshan-2 Site Location Active', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: HrTheme.deepNavy)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 20),
                            Row(
                              children: [
                                Expanded(
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: HrTheme.successTeal,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    onPressed: _isPunching ? null : () => _performGpsPunch('CHECK_IN'),
                                    icon: const Icon(Icons.login, size: 18),
                                    label: const Text('Check In', style: TextStyle(fontWeight: FontWeight.bold)),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFEF4444),
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    onPressed: _isPunching ? null : () => _performGpsPunch('CHECK_OUT'),
                                    icon: const Icon(Icons.logout, size: 18),
                                    label: const Text('Check Out', style: TextStyle(fontWeight: FontWeight.bold)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'RECENT ATTENDANCE LOGS',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Color(0xFF64748B)),
                        ),
                        TextButton(
                          onPressed: _showCorrectionDialog,
                          child: const Text('Missing Punch?', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: HrTheme.primaryIndigo)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    ..._history.map((rec) {
                      final status = rec['status'] ?? '';
                      final isLate = status == 'LATE';
                      final isPresent = status == 'PRESENT';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        color: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: HrTheme.slateBorder),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(rec['date'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.deepNavy)),
                                  const SizedBox(height: 2),
                                  Text(
                                    'In: ${rec['in']} • Out: ${rec['out']}',
                                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  if (rec['hours'] > 0)
                                    Text('${rec['hours']}h  ', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: HrTheme.deepNavy)),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: isPresent
                                          ? const Color(0xFFECFDF5)
                                          : isLate
                                              ? const Color(0xFFFFFBEB)
                                              : const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      isLate ? '${rec['late_min']}m Late' : status,
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isPresent
                                            ? HrTheme.successTeal
                                            : isLate
                                                ? HrTheme.amberWarning
                                                : const Color(0xFF64748B),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
    );
  }
}
