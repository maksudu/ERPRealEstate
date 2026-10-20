import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../core/network/api_client.dart';

class CollectionReportsScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const CollectionReportsScreen({super.key, this.onOpenDrawer});

  @override
  State<CollectionReportsScreen> createState() => _CollectionReportsScreenState();
}

class _CollectionReportsScreenState extends State<CollectionReportsScreen> {
  final _api = CollectionApiClient();
  bool _isLoading = false;

  Map<String, dynamic> _summary = {
    'today_total_bdt': 485000.0,
    'mtd_total_bdt': 7650000.0,
    'quarterly_recovery_pct': 82.6,
  };
  List<dynamic> _collectors = [];
  List<dynamic> _projects = [];

  @override
  void initState() {
    super.initState();
    _loadReports();
  }

  Future<void> _loadReports() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getReportsSummary();
      setState(() {
        _summary = res['summary'] ?? _summary;
        _collectors = res['collector_performance'] ?? [];
        _projects = res['project_summaries'] ?? [];
      });
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: CollectionTheme.darkSlate),
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
        title: const Text('Collection Reports & Analytics', style: TextStyle(color: CollectionTheme.darkSlate, fontSize: 18, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: CollectionTheme.primaryEmerald))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // KPI Row
                  Row(
                    children: [
                      _kpiCard("Today's Collection", '৳ ${(_summary['today_total_bdt'] as num).toInt()}', CollectionTheme.primaryEmerald),
                      const SizedBox(width: 12),
                      _kpiCard('MTD Realized', '৳ ${(_summary['mtd_total_bdt'] as num).toInt()}', const Color(0xFF2563EB)),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Collector Leaderboard
                  const Text('COLLECTOR PERFORMANCE TARGETS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Color(0xFF64748B))),
                  const SizedBox(height: 10),
                  ..._collectors.map((c) {
                    final pct = ((c['pct'] ?? 80) as num).toDouble() / 100.0;
                    return Card(
                      color: Colors.white,
                      elevation: 0,
                      margin: const EdgeInsets.only(bottom: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: Color(0xFFE2E8F0))),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(c['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: CollectionTheme.darkSlate)),
                                Text('${(pct * 100).toInt()}% Achieved', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: CollectionTheme.primaryEmerald)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text('Target: ৳ ${(c['target'] as num).toInt()} · Realized: ৳ ${(c['achieved'] as num).toInt()}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: pct,
                                backgroundColor: const Color(0xFFF1F5F9),
                                color: CollectionTheme.primaryEmerald,
                                minHeight: 6,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),

                  const SizedBox(height: 16),
                  const Text('PROJECT-WISE OVERDUE & REALIZATION', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Color(0xFF64748B))),
                  const SizedBox(height: 10),
                  ..._projects.map((p) {
                    return Card(
                      color: Colors.white,
                      elevation: 0,
                      margin: const EdgeInsets.only(bottom: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: Color(0xFFE2E8F0))),
                      child: ListTile(
                        title: Text(p['project'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: CollectionTheme.darkSlate)),
                        subtitle: Text('Collected MTD: ৳ ${(p['collected_mtd'] as num).toInt()}', style: const TextStyle(color: CollectionTheme.primaryEmerald, fontSize: 12, fontWeight: FontWeight.w600)),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text('Overdue', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                            Text('৳ ${(p['overdue'] as num).toInt()}', style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12)),
                          ],
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
    );
  }

  Widget _kpiCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: color)),
          ],
        ),
      ),
    );
  }
}
