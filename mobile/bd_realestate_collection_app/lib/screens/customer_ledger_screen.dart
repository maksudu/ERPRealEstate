import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../core/network/api_client.dart';

class CustomerLedgerScreen extends StatefulWidget {
  final String? bookingNumber;

  const CustomerLedgerScreen({super.key, this.bookingNumber});

  @override
  State<CustomerLedgerScreen> createState() => _CustomerLedgerScreenState();
}

class _CustomerLedgerScreenState extends State<CustomerLedgerScreen> {
  final _api = CollectionApiClient();
  bool _isLoading = false;

  String _customerName = 'Al-Haj Rafiqul Islam';
  String _bookingRef = 'BK-2026-0012';
  double _totalDebit = 19500000.0;
  double _totalCredit = 14800000.0;
  double _netOutstanding = 4700000.0;
  List<Map<String, dynamic>> _entries = [];

  @override
  void initState() {
    super.initState();
    _loadLedger();
  }

  Future<void> _loadLedger() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getLedger(bookingNumber: widget.bookingNumber);
      setState(() {
        _customerName = res['customer_name'] ?? _customerName;
        _bookingRef = res['booking_reference_no'] ?? _bookingRef;
        _totalDebit = (res['total_debit'] as num?)?.toDouble() ?? _totalDebit;
        _totalCredit = (res['total_credit'] as num?)?.toDouble() ?? _totalCredit;
        _netOutstanding = (res['net_outstanding'] as num?)?.toDouble() ?? _netOutstanding;
        _entries = (res['entries'] as List<dynamic>?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];
      });
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text('Customer Statement of Account', style: const TextStyle(color: CollectionTheme.darkSlate, fontSize: 17, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: CollectionTheme.primaryEmerald))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Portfolio Header Card
                  Card(
                    color: Colors.white,
                    elevation: 0,
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
                              Text(_bookingRef, style: const TextStyle(color: CollectionTheme.primaryEmerald, fontWeight: FontWeight.bold, fontSize: 12)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(6)),
                                child: const Text('Flat 8A · Tower 1', style: TextStyle(color: Color(0xFF2563EB), fontSize: 10, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(_customerName, style: const TextStyle(color: CollectionTheme.darkSlate, fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          const Divider(color: Color(0xFFE2E8F0)),
                          const SizedBox(height: 8),

                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _statCol('Total Invoiced / Debits', '৳ ${_totalDebit.toInt()}', CollectionTheme.darkSlate),
                              _statCol('Total Paid / Credits', '৳ ${_totalCredit.toInt()}', CollectionTheme.primaryEmerald),
                              _statCol('Net Outstanding', '৳ ${_netOutstanding.toInt()}', Colors.red),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  const Text(
                    'CHRONOLOGICAL LEDGER ENTRIES',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 10),

                  // Ledger Table Cards
                  ..._entries.map((e) {
                    final isDebit = (e['debit'] as num? ?? 0) > 0;
                    return Card(
                      color: Colors.white,
                      elevation: 0,
                      margin: const EdgeInsets.only(bottom: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
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
                                Text(e['date'] ?? '', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                Text(e['voucher_ref'] ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(e['particulars'] ?? '', style: const TextStyle(color: CollectionTheme.darkSlate, fontWeight: FontWeight.w600, fontSize: 13)),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  isDebit ? 'Debit: ৳ ${(e['debit'] as num).toInt()}' : 'Credit: ৳ ${(e['credit'] as num).toInt()}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: isDebit ? Colors.red.shade700 : CollectionTheme.primaryEmerald,
                                  ),
                                ),
                                Text('Balance: ৳ ${(e['balance'] as num).toInt()}', style: const TextStyle(color: CollectionTheme.darkSlate, fontWeight: FontWeight.w500, fontSize: 12)),
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
    );
  }

  Widget _statCol(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }
}
