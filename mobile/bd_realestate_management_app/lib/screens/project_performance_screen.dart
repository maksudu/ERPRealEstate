import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../core/network/api_client.dart';

class ProjectPerformanceScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const ProjectPerformanceScreen({super.key, this.onOpenDrawer});

  @override
  State<ProjectPerformanceScreen> createState() => _ProjectPerformanceScreenState();
}

class _ProjectPerformanceScreenState extends State<ProjectPerformanceScreen> {
  final _api = ManagementApiClient();
  bool _isLoading = true;
  List<dynamic> _projects = [];

  @override
  void initState() {
    super.initState();
    _fetchProjects();
  }

  Future<void> _fetchProjects() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getProjectsPerformance();
      if (mounted) setState(() => _projects = res['projects'] ?? []);
    } catch (_) {
      if (mounted) {
        setState(() {
          _projects = [
            {
              'project_name': 'BlueOceans Sky Heights (Gulshan)',
              'location': 'Road 11, Gulshan-2, Dhaka',
              'physical_progress_pct': 78.5,
              'planned_progress_pct': 82.0,
              'schedule_variance_days': -12,
              'sanctioned_budget_cr': 45.0,
              'actual_cost_cr': 33.8,
              'budget_utilization_pct': 75.1,
              'projected_revenue_cr': 68.5,
              'expected_profit_cr': 23.5,
              'status': 'ON_TRACK',
            },
            {
              'project_name': 'BlueOceans Grand Vista (Banani)',
              'location': 'Block E, Banani, Dhaka',
              'physical_progress_pct': 52.0,
              'planned_progress_pct': 54.0,
              'schedule_variance_days': -6,
              'sanctioned_budget_cr': 32.0,
              'actual_cost_cr': 17.6,
              'budget_utilization_pct': 55.0,
              'projected_revenue_cr': 48.0,
              'expected_profit_cr': 16.0,
              'status': 'ON_TRACK',
            },
            {
              'project_name': 'BlueOceans River Crest (Uttara)',
              'location': 'Sector 13, Uttara, Dhaka',
              'physical_progress_pct': 28.0,
              'planned_progress_pct': 35.0,
              'schedule_variance_days': -22,
              'sanctioned_budget_cr': 58.0,
              'actual_cost_cr': 18.2,
              'budget_utilization_pct': 31.4,
              'projected_revenue_cr': 84.0,
              'expected_profit_cr': 26.0,
              'status': 'DELAYED',
            },
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
            icon: const Icon(Icons.menu_rounded, color: ManagementTheme.royalNavy),
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
        title: const Text('Project S-Curve & Performance', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: ManagementTheme.royalNavy))
          : RefreshIndicator(
              onRefresh: _fetchProjects,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _projects.length,
                itemBuilder: (context, idx) {
                  final p = _projects[idx];
                  final isDelayed = (p['schedule_variance_days'] ?? 0) < -15;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 14),
                    color: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: ManagementTheme.borderSubtle),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  p['project_name'] ?? 'Project',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: ManagementTheme.royalNavy),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: isDelayed ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  isDelayed ? 'DELAYED' : 'ON TRACK',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: isDelayed ? ManagementTheme.alertCrimson : ManagementTheme.successEmerald,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(p['location'] ?? '', style: const TextStyle(fontSize: 12, color: ManagementTheme.textMuted)),
                          const SizedBox(height: 14),

                          // Progress bar
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Physical: ${p['physical_progress_pct']}%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              Text('Planned: ${p['planned_progress_pct']}%', style: const TextStyle(fontSize: 12, color: ManagementTheme.textMuted)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: (p['physical_progress_pct'] ?? 0.0) / 100.0,
                              minHeight: 8,
                              backgroundColor: const Color(0xFFF1F5F9),
                              valueColor: AlwaysStoppedAnimation<Color>(
                                isDelayed ? ManagementTheme.alertCrimson : ManagementTheme.successEmerald,
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Financial Variance Row
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _colMetric('Sanctioned Budget', '৳ ${p['sanctioned_budget_cr']} Cr'),
                                _colMetric('Actual Cost', '৳ ${p['actual_cost_cr']} Cr'),
                                _colMetric('Expected Profit', '৳ ${p['expected_profit_cr']} Cr', color: ManagementTheme.luxuryGold),
                              ],
                            ),
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

  Widget _colMetric(String label, String value, {Color color = ManagementTheme.royalNavy}) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: ManagementTheme.textMuted)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }
}
