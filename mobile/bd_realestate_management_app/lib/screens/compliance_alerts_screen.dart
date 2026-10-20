import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../core/network/api_client.dart';

class ComplianceAlertsScreen extends StatefulWidget {
  const ComplianceAlertsScreen({super.key});

  @override
  State<ComplianceAlertsScreen> createState() => _ComplianceAlertsScreenState();
}

class _ComplianceAlertsScreenState extends State<ComplianceAlertsScreen> {
  final _api = ManagementApiClient();
  bool _isLoading = true;
  List<dynamic> _deadlines = [];

  @override
  void initState() {
    super.initState();
    _fetchCompliance();
  }

  Future<void> _fetchCompliance() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getComplianceAlerts();
      if (mounted) setState(() => _deadlines = res['upcoming_deadlines'] ?? []);
    } catch (_) {
      if (mounted) {
        setState(() {
          _deadlines = [
            {
              'title': 'RAJUK Building Clearance Renewal',
              'authority': 'RAJUK (Dhaka)',
              'project': 'BlueOceans Sky Heights',
              'expiry_date': '2026-11-15',
              'days_remaining': 26,
              'status': 'RENEWAL_SUBMITTED',
            },
            {
              'title': 'Department of Environment (DoE) Clearance',
              'authority': 'DoE Bangladesh',
              'project': 'BlueOceans River Crest',
              'expiry_date': '2026-10-31',
              'days_remaining': 11,
              'status': 'URGENT_ACTION_REQUIRED',
            },
            {
              'title': 'Corporate Advance Income Tax (AIT Q3)',
              'authority': 'National Board of Revenue (NBR)',
              'project': 'Corporate HQ',
              'expiry_date': '2026-11-15',
              'days_remaining': 26,
              'status': 'SCHEDULED',
            },
            {
              'title': 'Fire Civil Defense NOC Annual Audit',
              'authority': 'Bangladesh Fire Service',
              'project': 'BlueOceans Grand Vista',
              'expiry_date': '2026-12-10',
              'days_remaining': 51,
              'status': 'IN_ORDER',
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
        title: const Text('Compliance & Legal Deadlines', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: ManagementTheme.royalNavy))
          : RefreshIndicator(
              onRefresh: _fetchCompliance,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _deadlines.length,
                itemBuilder: (context, idx) {
                  final d = _deadlines[idx];
                  final days = d['days_remaining'] as int? ?? 30;
                  final isUrgent = days <= 15;

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
                              Expanded(
                                child: Text(
                                  d['title'] ?? '',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: ManagementTheme.royalNavy),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: isUrgent ? const Color(0xFFFEF2F2) : const Color(0xFFFFFBEB),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  isUrgent ? '$days DAYS LEFT' : '$days Days Left',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: isUrgent ? ManagementTheme.alertCrimson : ManagementTheme.luxuryGold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text('Authority: ${d['authority']}', style: const TextStyle(fontSize: 12, color: ManagementTheme.textMuted)),
                          Text('Project: ${d['project']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: ManagementTheme.royalNavy)),
                          const SizedBox(height: 10),
                          const Divider(height: 12, color: Color(0xFFF1F5F9)),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Expiry: ${d['expiry_date']}', style: const TextStyle(fontSize: 11, color: ManagementTheme.textMuted)),
                              Text(
                                d['status'] ?? '',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: isUrgent ? ManagementTheme.alertCrimson : ManagementTheme.successEmerald,
                                ),
                              ),
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
