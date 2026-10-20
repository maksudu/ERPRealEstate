import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../core/network/api_client.dart';

class BankLoanTrackingScreen extends StatefulWidget {
  const BankLoanTrackingScreen({super.key});

  @override
  State<BankLoanTrackingScreen> createState() => _BankLoanTrackingScreenState();
}

class _BankLoanTrackingScreenState extends State<BankLoanTrackingScreen> {
  final _api = CollectionApiClient();
  bool _isLoading = false;
  List<Map<String, dynamic>> _loans = [];

  @override
  void initState() {
    super.initState();
    _loadLoans();
  }

  Future<void> _loadLoans() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getBankLoans();
      final items = (res['items'] as List<dynamic>?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];
      setState(() => _loans = items);
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Tripartite Bank Loan Tracking', style: TextStyle(color: CollectionTheme.darkSlate, fontSize: 18, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: CollectionTheme.primaryEmerald))
          : RefreshIndicator(
              onRefresh: _loadLoans,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _loans.length,
                itemBuilder: (ctx, i) {
                  final l = _loans[i];
                  final isNocIssued = l['noc_status'] == 'ISSUED';
                  final sanctioned = (l['sanctioned_amount'] as num?)?.toDouble() ?? 0.0;
                  final disbursed = (l['disbursed_amount_total'] as num?)?.toDouble() ?? 0.0;
                  final pct = sanctioned > 0 ? (disbursed / sanctioned).clamp(0.0, 1.0) : 0.0;

                  return Card(
                    color: Colors.white,
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
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
                              Text(l['loan_reference_no'] ?? 'TRP', style: const TextStyle(color: CollectionTheme.primaryEmerald, fontSize: 11, fontWeight: FontWeight.bold)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: isNocIssued ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'NOC: ${l['noc_status']}',
                                  style: TextStyle(
                                    color: isNocIssued ? const Color(0xFF15803D) : const Color(0xFF92400E),
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(l['bank_name'] ?? 'Bank', style: const TextStyle(color: CollectionTheme.darkSlate, fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 2),
                          Text('Customer: ${l['customer_name']} · Ref: ${l['booking_reference_no']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                          const SizedBox(height: 12),

                          // Disbursement Progress
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Disbursed: ৳ ${disbursed.toInt()} / ৳ ${sanctioned.toInt()}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: CollectionTheme.darkSlate)),
                              Text('${(pct * 100).toInt()}% Released', style: const TextStyle(color: CollectionTheme.primaryEmerald, fontWeight: FontWeight.bold, fontSize: 12)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: pct,
                              backgroundColor: const Color(0xFFF1F5F9),
                              color: CollectionTheme.primaryEmerald,
                              minHeight: 6,
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Divider(color: Color(0xFFE2E8F0)),
                          const SizedBox(height: 8),

                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Bank Officer: ${l['bank_officer_name']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                              Text(l['bank_officer_phone'] ?? '', style: const TextStyle(color: CollectionTheme.primaryEmerald, fontSize: 11, fontWeight: FontWeight.bold)),
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
