import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';

class ApprovalScreen extends StatefulWidget {
  const ApprovalScreen({super.key});

  @override
  State<ApprovalScreen> createState() => _ApprovalScreenState();
}

class _ApprovalScreenState extends State<ApprovalScreen> {
  final _api = ApiClient();
  bool _isLoading = false;
  List<dynamic> _pendingApprovals = [];
  List<dynamic> _submittedApprovals = [];
  int _activeTab = 0; // 0 = Pending My Action, 1 = Submitted by Me

  @override
  void initState() {
    super.initState();
    _loadApprovals();
  }

  Future<void> _loadApprovals() async {
    setState(() => _isLoading = true);
    try {
      final pending = await _api.getApprovals(box: 'pending');
      final submitted = await _api.getApprovals(box: 'submitted');
      setState(() {
        _pendingApprovals = pending;
        _submittedApprovals = submitted;
      });
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  void _showActionDialog(Map<String, dynamic> item) {
    final comments = TextEditingController();
    String action = 'APPROVE';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            'Review: ${item['document_type']?.replaceAll('_', ' ')}',
            style: const TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Ref: ${item['document_reference_no'] ?? item['request_number']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
              if (item['financial_amount'] != null)
                Text(
                  'Amount: ${CurrencyFormatter.formatBDT((item['financial_amount'] as num).toDouble())}',
                  style: const TextStyle(color: AppTheme.primaryTeal, fontWeight: FontWeight.bold, fontSize: 13),
                ),
              const SizedBox(height: 14),
              Row(
                children: [
                  _actionOption(setDlg, 'APPROVE', 'Approve', action, const Color(0xFF10B981)),
                  const SizedBox(width: 8),
                  _actionOption(setDlg, 'REJECT', 'Reject', action, Colors.redAccent),
                  const SizedBox(width: 8),
                  _actionOption(setDlg, 'REQUEST_CORRECTION', 'Correction', action, const Color(0xFFF59E0B)),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: comments,
                maxLines: 2,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(
                  labelText: 'Approver Notes / Justification',
                  labelStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: action == 'APPROVE' ? const Color(0xFF10B981) : (action == 'REJECT' ? Colors.redAccent : const Color(0xFFF59E0B)),
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                try {
                  await _api.actOnApproval(item['id'], action, comments: comments.text.trim());
                  Navigator.pop(ctx);
                  _loadApprovals();
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Action $action executed with digital signature!')));
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                }
              },
              child: const Text('Execute Action'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _actionOption(StateSetter setDlg, String val, String label, String current, Color color) {
    final isSelected = current == val;
    return Expanded(
      child: InkWell(
        onTap: () => setDlg(() => current = val),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? color.withOpacity(0.15) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isSelected ? color : const Color(0xFFCBD5E1)),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(color: isSelected ? color : const Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = _activeTab == 0 ? _pendingApprovals : _submittedApprovals;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        title: const Text('Approval Workflow', style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Segmented Tabs
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _activeTab = 0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _activeTab == 0 ? AppTheme.primaryTeal : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          'Pending My Review (${_pendingApprovals.length})',
                          style: TextStyle(color: _activeTab == 0 ? Colors.white : const Color(0xFF64748B), fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _activeTab = 1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _activeTab == 1 ? AppTheme.primaryTeal : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          'Submitted Requests (${_submittedApprovals.length})',
                          style: TextStyle(color: _activeTab == 1 ? Colors.white : const Color(0xFF64748B), fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
                : items.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.verified_user_outlined, color: Color(0xFF94A3B8), size: 48),
                            const SizedBox(height: 12),
                            Text(_activeTab == 0 ? 'No pending approval requests' : 'No submitted requests', style: const TextStyle(color: Color(0xFF64748B))),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadApprovals,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: items.length,
                          itemBuilder: (ctx, i) {
                            final r = items[i];
                            final isPending = r['status'] == 'PENDING';
                            final type = (r['document_type'] as String? ?? '').replaceAll('_', ' ');

                            return Card(
                              color: Colors.white,
                              elevation: 0,
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                                side: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          type,
                                          style: const TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: (isPending ? const Color(0xFFF59E0B) : const Color(0xFF10B981)).withOpacity(0.15),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            r['status'] ?? 'PENDING',
                                            style: TextStyle(
                                              color: isPending ? const Color(0xFFD97706) : const Color(0xFF059669),
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text('Doc Ref: ${r['document_reference_no'] ?? '-'}', style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 12, fontWeight: FontWeight.bold)),
                                    Text('Maker: ${r['maker_user_name'] ?? 'Sales Staff'}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                    if (r['maker_notes'] != null)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 4),
                                        child: Text('Notes: ${r['maker_notes']}', style: const TextStyle(color: Color(0xFF475569), fontSize: 11)),
                                      ),
                                    const Divider(color: Color(0xFFE2E8F0), height: 16),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          'Tier ${r['current_tier']} of ${r['total_tiers']}',
                                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                        ),
                                        if (_activeTab == 0 && isPending)
                                          ElevatedButton.icon(
                                            icon: const Icon(Icons.rate_review, size: 14),
                                            label: const Text('Action', style: TextStyle(fontSize: 11)),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: AppTheme.primaryTeal,
                                              foregroundColor: Colors.white,
                                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                            ),
                                            onPressed: () => _showActionDialog(r),
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
          ),
        ],
      ),
    );
  }
}
