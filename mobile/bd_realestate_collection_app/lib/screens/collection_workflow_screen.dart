import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../core/network/api_client.dart';

class CollectionWorkflowScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const CollectionWorkflowScreen({super.key, this.onOpenDrawer});

  @override
  State<CollectionWorkflowScreen> createState() => _CollectionWorkflowScreenState();
}

class _CollectionWorkflowScreenState extends State<CollectionWorkflowScreen> {
  final _api = CollectionApiClient();
  bool _isLoading = false;
  List<Map<String, dynamic>> _workflows = [];

  @override
  void initState() {
    super.initState();
    _loadWorkflows();
  }

  Future<void> _loadWorkflows() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getWorkflows();
      final items = (res['items'] as List<dynamic>?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];
      setState(() => _workflows = items);
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  void _showNewRequestDialog() {
    String docType = 'LATE_FEE_WAIVER';
    final refCtrl = TextEditingController(text: 'BK-2026-0012');
    final amtCtrl = TextEditingController(text: '25000');
    final reasonCtrl = TextEditingController();

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
                  const Text('Initiate Collection Governance Request', style: TextStyle(color: CollectionTheme.darkSlate, fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: docType,
                dropdownColor: Colors.white,
                decoration: const InputDecoration(labelText: 'Request Category *', border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'LATE_FEE_WAIVER', child: Text('Late Fee Penalty Waiver')),
                  DropdownMenuItem(value: 'REFUND_REQUEST', child: Text('Customer Advance Refund')),
                  DropdownMenuItem(value: 'RECEIPT_CANCELLATION', child: Text('Money Receipt Cancellation')),
                  DropdownMenuItem(value: 'PAYMENT_VERIFICATION', child: Text('Special Payment Verification')),
                ],
                onChanged: (v) => setSheet(() => docType = v ?? 'LATE_FEE_WAIVER'),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: refCtrl,
                      decoration: const InputDecoration(labelText: 'Booking / Receipt Ref *', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: amtCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Amount (BDT) *', border: OutlineInputBorder()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: reasonCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Justification & Customer Grounds *',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: CollectionTheme.primaryEmerald,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () async {
                  if (reasonCtrl.text.trim().isEmpty) return;
                  await _api.submitWorkflow({
                    'document_type': docType,
                    'document_id': DateTime.now().millisecondsSinceEpoch,
                    'document_reference_no': refCtrl.text.trim(),
                    'amount': double.tryParse(amtCtrl.text) ?? 0.0,
                    'justification': reasonCtrl.text.trim(),
                  });
                  if (ctx.mounted) Navigator.pop(ctx);
                  _loadWorkflows();
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Governance workflow initiated for Head of Recovery approval!')));
                  }
                },
                child: const Text('Submit Approval Request', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
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
        title: const Text('Collection Approval Workflows', style: TextStyle(color: CollectionTheme.darkSlate, fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.add, color: CollectionTheme.primaryEmerald), onPressed: _showNewRequestDialog),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: CollectionTheme.primaryEmerald))
          : RefreshIndicator(
              onRefresh: _loadWorkflows,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _workflows.length,
                itemBuilder: (ctx, i) {
                  final w = _workflows[i];
                  final isPending = w['status'] == 'PENDING';

                  return Card(
                    color: Colors.white,
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(w['document_type']?.replaceAll('_', ' ') ?? 'WORKFLOW', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: CollectionTheme.primaryEmerald)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: isPending ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  w['status'] ?? 'PENDING',
                                  style: TextStyle(
                                    color: isPending ? const Color(0xFFD97706) : const Color(0xFF15803D),
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text('Ref: ${w['document_reference_no']}', style: const TextStyle(color: CollectionTheme.darkSlate, fontWeight: FontWeight.w600, fontSize: 14)),
                          const SizedBox(height: 4),
                          Text(w['maker_notes'] ?? '', style: const TextStyle(color: Color(0xFF475569), fontSize: 12)),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Tier ${w['current_tier']} of ${w['total_tiers']}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                              Text(w['created_at']?.substring(0, 16) ?? '', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
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
