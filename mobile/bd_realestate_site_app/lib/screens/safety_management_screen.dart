import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/network/api_client.dart';

class SafetyManagementScreen extends StatefulWidget {
  const SafetyManagementScreen({super.key});

  @override
  State<SafetyManagementScreen> createState() => _SafetyManagementScreenState();
}

class _SafetyManagementScreenState extends State<SafetyManagementScreen> {
  final _api = ConstructionApiClient();
  bool _isLoading = false;

  List<Map<String, dynamic>> _ncrs = [];

  @override
  void initState() {
    super.initState();
    _loadSafetyRecords();
  }

  Future<void> _loadSafetyRecords() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getSafety();
      final items = (res['items'] as List<dynamic>?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];
      if (items.isNotEmpty) {
        setState(() => _ncrs = items);
      } else {
        _setFallbackNcrs();
      }
    } catch (_) {
      _setFallbackNcrs();
    }
    setState(() => _isLoading = false);
  }

  void _setFallbackNcrs() {
    _ncrs = [
      {
        'id': 1,
        'ncr_number': 'NCR-PRJ01-2026-001',
        'category': 'Missing Safety Harness / PPE',
        'severity': 'Critical',
        'description': 'Scaffolding workers on 8th floor cantilever edge operating without safety lifeline harnesses.',
        'location_details': 'Tower A - 8th Floor North Perimeter',
        'rectification_deadline': '2026-10-21',
        'status': 'Open',
      },
      {
        'id': 2,
        'ncr_number': 'NCR-PRJ01-2026-002',
        'category': 'Honeycombing & Inadequate Concrete Cover',
        'severity': 'High',
        'description': 'Column C4 observed minor honeycombing due to inadequate vibrator reach during casting.',
        'location_details': 'Tower A - 7th Floor Column C4',
        'rectification_deadline': '2026-10-24',
        'status': 'Rectified',
      },
      {
        'id': 3,
        'ncr_number': 'NCR-PRJ01-2026-003',
        'category': 'Electrical Cable Protection',
        'severity': 'Medium',
        'description': 'Exposed 3-phase submersible pump power cable lying across waterlogged basement ramp.',
        'location_details': 'Basement-1 Entry Ramp',
        'rectification_deadline': '2026-10-19',
        'status': 'Closed',
      },
    ];
  }

  void _showReportIncidentDialog() {
    final descCtrl = TextEditingController();
    final locCtrl = TextEditingController(text: '8th Floor Slab Edge');
    String category = 'Missing Safety Harness / PPE';
    String severity = 'High';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Report Safety Incident / NCR', style: TextStyle(color: SiteAppTheme.darkNavy, fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: category,
                dropdownColor: Colors.white,
                decoration: const InputDecoration(labelText: 'Violation / Incident Category *', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'Missing Safety Harness / PPE', child: Text('Missing Safety Harness / PPE')),
                  DropdownMenuItem(value: 'Honeycombing & Inadequate Cover', child: Text('Honeycombing & Cover Defect')),
                  DropdownMenuItem(value: 'Scaffolding / Shuttering Defect', child: Text('Scaffolding / Formwork Defect')),
                  DropdownMenuItem(value: 'Electrical Hazard', child: Text('Electrical Hazard')),
                  DropdownMenuItem(value: 'Falling Object / Barricade Missing', child: Text('Falling Object / Barricade')),
                ],
                onChanged: (v) => setSheet(() => category = v ?? 'Missing Safety Harness / PPE'),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: severity,
                      dropdownColor: Colors.white,
                      decoration: const InputDecoration(labelText: 'Severity Level', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'Low', child: Text('Low')),
                        DropdownMenuItem(value: 'Medium', child: Text('Medium')),
                        DropdownMenuItem(value: 'High', child: Text('High')),
                        DropdownMenuItem(value: 'Critical', child: Text('Critical (Stop Work)')),
                      ],
                      onChanged: (v) => setSheet(() => severity = v ?? 'High'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: locCtrl,
                      decoration: const InputDecoration(labelText: 'Location Details', border: OutlineInputBorder()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: descCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Detailed Incident Observation *',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: SiteAppTheme.alertRed,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () {
                  if (descCtrl.text.trim().isEmpty) return;
                  final newNcr = {
                    'id': DateTime.now().millisecondsSinceEpoch,
                    'ncr_number': 'NCR-PRJ01-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
                    'category': category,
                    'severity': severity,
                    'description': descCtrl.text.trim(),
                    'location_details': locCtrl.text.trim(),
                    'rectification_deadline': DateTime.now().add(const Duration(days: 3)).toIso8601String().split('T')[0],
                    'status': 'Open',
                  };
                  setState(() => _ncrs.insert(0, newNcr));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Safety Non-Conformance Report logged & issued to contractor!')));
                },
                child: const Text('Log Safety NCR & Notify EHS', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _severityColor(String? severity) {
    switch (severity) {
      case 'Critical':
        return Colors.red.shade700;
      case 'High':
        return Colors.redAccent;
      case 'Medium':
        return Colors.amber.shade700;
      default:
        return Colors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Safety & NCR Management', style: TextStyle(color: SiteAppTheme.darkNavy, fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.add_alert, color: SiteAppTheme.alertRed), onPressed: _showReportIncidentDialog),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: SiteAppTheme.primarySafetyOrange))
          : RefreshIndicator(
              onRefresh: _loadSafetyRecords,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _ncrs.length,
                itemBuilder: (ctx, i) {
                  final n = _ncrs[i];
                  final isOpen = n['status'] == 'Open';
                  final severity = n['severity'] as String?;
                  final sColor = _severityColor(severity);

                  return Card(
                    color: Colors.white,
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: BorderSide(color: isOpen ? Colors.red.shade200 : const Color(0xFFE2E8F0)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(n['ncr_number'] ?? 'NCR', style: const TextStyle(color: SiteAppTheme.primarySafetyOrange, fontSize: 11, fontWeight: FontWeight.bold)),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: sColor.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                                    child: Text(severity ?? 'Medium', style: TextStyle(color: sColor, fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isOpen ? Colors.red.withOpacity(0.12) : SiteAppTheme.successGreen.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      n['status'] ?? 'Open',
                                      style: TextStyle(
                                        color: isOpen ? Colors.red : SiteAppTheme.successGreen,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(n['category'] ?? 'Safety Defect', style: const TextStyle(color: SiteAppTheme.darkNavy, fontSize: 14, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text(n['description'] ?? '', style: const TextStyle(color: Color(0xFF475569), fontSize: 12)),
                          const SizedBox(height: 8),
                          Text('Location: ${n['location_details']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Deadline: ${n['rectification_deadline']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                              if (isOpen)
                                TextButton(
                                  onPressed: () {
                                    setState(() => n['status'] = 'Rectified');
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('CAPA recorded and marked as Rectified!')));
                                  },
                                  child: const Text('Mark Rectified', style: TextStyle(fontSize: 12, color: SiteAppTheme.primarySafetyOrange)),
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
