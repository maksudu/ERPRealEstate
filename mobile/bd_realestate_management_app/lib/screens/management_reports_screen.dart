import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../core/network/api_client.dart';

class ManagementReportsScreen extends StatefulWidget {
  const ManagementReportsScreen({super.key});

  @override
  State<ManagementReportsScreen> createState() => _ManagementReportsScreenState();
}

class _ManagementReportsScreenState extends State<ManagementReportsScreen> {
  final _api = ManagementApiClient();
  bool _isLoading = true;
  List<dynamic> _reports = [];

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getReportsSummaries();
      if (mounted) setState(() => _reports = res['available_reports'] ?? []);
    } catch (_) {
      if (mounted) {
        setState(() {
          _reports = [
            {
              'title': 'Q3 2026 Executive Financial Performance & Margin Analysis',
              'category': 'FINANCE',
              'date': '2026-10-15',
              'size_mb': 3.4,
              'format': 'PDF',
            },
            {
              'title': 'Comprehensive Project Cost Variance & S-Curve Audit',
              'category': 'CONSTRUCTION',
              'date': '2026-10-18',
              'size_mb': 5.8,
              'format': 'PDF',
            },
            {
              'title': 'Sales Inventory Absorption & Cash Collection Velocity',
              'category': 'SALES',
              'date': '2026-10-20',
              'size_mb': 2.1,
              'format': 'PDF',
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
        title: const Text('Reports & Executive Summaries', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: ManagementTheme.royalNavy))
          : RefreshIndicator(
              onRefresh: _fetchReports,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _reports.length,
                itemBuilder: (context, idx) {
                  final r = _reports[idx];
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
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF2F2),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.picture_as_pdf, color: ManagementTheme.alertCrimson, size: 22),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      r['title'] ?? '',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: ManagementTheme.royalNavy),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${r['category']} • ${r['date']} • ${r['size_mb']} MB',
                                      style: const TextStyle(fontSize: 11, color: ManagementTheme.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF1F5F9),
                              foregroundColor: ManagementTheme.royalNavy,
                              elevation: 0,
                              minimumSize: const Size.fromHeight(40),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            icon: const Icon(Icons.download, size: 16),
                            label: const Text('Download Boardroom Report', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                            onPressed: () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  backgroundColor: ManagementTheme.royalNavy,
                                  content: Text('Downloading "${r['title']}"...'),
                                  duration: const Duration(seconds: 2),
                                ),
                              );
                            },
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
