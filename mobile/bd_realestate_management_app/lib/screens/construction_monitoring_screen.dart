import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../core/network/api_client.dart';

class ConstructionMonitoringScreen extends StatefulWidget {
  const ConstructionMonitoringScreen({super.key});

  @override
  State<ConstructionMonitoringScreen> createState() => _ConstructionMonitoringScreenState();
}

class _ConstructionMonitoringScreenState extends State<ConstructionMonitoringScreen> {
  final _api = ManagementApiClient();
  bool _isLoading = true;
  Map<String, dynamic>? _data;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getConstructionMonitoring();
      if (mounted) setState(() => _data = res);
    } catch (_) {
      if (mounted) {
        setState(() {
          _data = {
            'active_sites': 6,
            'total_active_labor_today': 348,
            'delayed_milestones_count': 2,
            'critical_milestones': [
              {'project': 'BlueOceans Sky Heights', 'milestone': '12th Floor RCC Slab Casting', 'target_date': '2026-10-28', 'status': 'ON_SCHEDULE', 'completion_pct': 85},
              {'project': 'BlueOceans River Crest', 'milestone': 'Basement Retaining Wall & Raft', 'target_date': '2026-10-18', 'status': 'DELAYED_7_DAYS', 'completion_pct': 70},
              {'project': 'BlueOceans Grand Vista', 'milestone': 'Brickwork & Internal Plaster Level 6', 'target_date': '2026-11-04', 'status': 'ON_SCHEDULE', 'completion_pct': 60},
            ],
            'top_contractors': [
              {'contractor': 'Al-Madina Construction & Civil', 'work_type': 'Civil & Structural', 'rating': 4.8, 'workers_deployed': 120},
              {'contractor': 'Apex MEP & Electrical Solutions', 'work_type': 'Electrical & Conduit', 'rating': 4.6, 'workers_deployed': 65},
              {'contractor': 'Bengal Sanitary & Plumbing', 'work_type': 'Sanitary & Gas Lines', 'rating': 4.7, 'workers_deployed': 45},
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
    final milestones = (_data?['critical_milestones'] as List<dynamic>?) ?? [];
    final contractors = (_data?['top_contractors'] as List<dynamic>?) ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Construction & Contractor Radar', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: ManagementTheme.royalNavy))
          : RefreshIndicator(
              onRefresh: _fetchData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Overview Row
                    Row(
                      children: [
                        _summaryCard('ACTIVE SITES', '${_data?['active_sites'] ?? 6}', Icons.apartment, const Color(0xFF2563EB)),
                        const SizedBox(width: 10),
                        _summaryCard('WORKFORCE TODAY', '${_data?['total_active_labor_today'] ?? 348}', Icons.groups, ManagementTheme.successEmerald),
                        const SizedBox(width: 10),
                        _summaryCard('DELAY ALERTS', '${_data?['delayed_milestones_count'] ?? 2}', Icons.warning_amber, ManagementTheme.alertCrimson),
                      ],
                    ),
                    const SizedBox(height: 20),

                    const Text(
                      'CRITICAL PATH MILESTONES',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: ManagementTheme.textMuted),
                    ),
                    const SizedBox(height: 12),

                    ...milestones.map((m) {
                      final isDelayed = (m['status'] as String).contains('DELAYED');
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        color: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: ManagementTheme.borderSubtle),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(m['project'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: ManagementTheme.royalNavy)),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: isDelayed ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      m['status'],
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isDelayed ? ManagementTheme.alertCrimson : ManagementTheme.successEmerald,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(m['milestone'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                              Text('Target Deadline: ${m['target_date']}', style: const TextStyle(fontSize: 11, color: ManagementTheme.textMuted)),
                              const SizedBox(height: 10),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: (m['completion_pct'] as int) / 100.0,
                                  minHeight: 6,
                                  backgroundColor: const Color(0xFFF1F5F9),
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    isDelayed ? ManagementTheme.alertCrimson : ManagementTheme.successEmerald,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 20),

                    const Text(
                      'CONTRACTOR PERFORMANCE & WORKERS DEPLOYED',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: ManagementTheme.textMuted),
                    ),
                    const SizedBox(height: 12),

                    ...contractors.map((c) => Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          color: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: const BorderSide(color: ManagementTheme.borderSubtle),
                          ),
                          child: ListTile(
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(10)),
                              child: const Icon(Icons.handyman, color: ManagementTheme.royalNavy, size: 20),
                            ),
                            title: Text(c['contractor'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: ManagementTheme.royalNavy)),
                            subtitle: Text('${c['work_type']} • ${c['workers_deployed']} Workers On-Site', style: const TextStyle(fontSize: 11, color: ManagementTheme.textMuted)),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.star, color: Color(0xFFF59E0B), size: 16),
                                const SizedBox(width: 4),
                                Text('${c['rating']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: ManagementTheme.royalNavy)),
                              ],
                            ),
                          ),
                        )),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _summaryCard(String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Card(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: ManagementTheme.borderSubtle),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(height: 8),
              Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy)),
              const SizedBox(height: 2),
              Text(title, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: ManagementTheme.textMuted)),
            ],
          ),
        ),
      ),
    );
  }
}
