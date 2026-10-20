import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../core/network/api_client.dart';
import 'customer_ledger_screen.dart';
import 'installment_schedule_screen.dart';
import 'payment_entry_screen.dart';

class CustomerSearchScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const CustomerSearchScreen({super.key, this.onOpenDrawer});

  @override
  State<CustomerSearchScreen> createState() => _CustomerSearchScreenState();
}

class _CustomerSearchScreenState extends State<CustomerSearchScreen> {
  final _api = CollectionApiClient();
  final _searchCtrl = TextEditingController();
  bool _isLoading = false;
  List<Map<String, dynamic>> _customers = [];

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers([String? query]) async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getCustomers(search: query);
      final items = (res['items'] as List<dynamic>?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];
      setState(() => _customers = items);
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
        title: const Text('Customer & Booking Portfolio', style: TextStyle(color: CollectionTheme.darkSlate, fontSize: 18, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchCtrl,
              onChanged: (v) => _loadCustomers(v.trim()),
              decoration: InputDecoration(
                hintText: 'Search by Customer Name, Phone, Unit or Booking #...',
                prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B)),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Colors.grey),
                        onPressed: () {
                          _searchCtrl.clear();
                          _loadCustomers();
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
              ),
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: CollectionTheme.primaryEmerald))
                : _customers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.person_search_outlined, size: 48, color: Color(0xFF94A3B8)),
                            const SizedBox(height: 12),
                            const Text('No matching customer records found', style: TextStyle(color: Color(0xFF64748B))),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _customers.length,
                        itemBuilder: (ctx, i) {
                          final c = _customers[i];
                          final isOverdue = c['payment_status'] == 'OVERDUE';

                          return Card(
                            color: Colors.white,
                            elevation: 0,
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                              side: BorderSide(
                                color: isOverdue ? Colors.red.shade200 : const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        c['booking_reference_no'] ?? 'BK-2026',
                                        style: const TextStyle(color: CollectionTheme.primaryEmerald, fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: isOverdue ? Colors.red.withOpacity(0.12) : const Color(0xFFEFF6FF),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          c['payment_status'] ?? 'CURRENT',
                                          style: TextStyle(
                                            color: isOverdue ? Colors.red : const Color(0xFF2563EB),
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    c['full_name'] ?? 'Buyer',
                                    style: const TextStyle(color: CollectionTheme.darkSlate, fontSize: 16, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '${c['unit_number']} · ${c['project_name']}',
                                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
                                  ),
                                  Text(
                                    'Phone: ${c['phone']} · Email: ${c['email']}',
                                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                  ),
                                  const SizedBox(height: 12),
                                  Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF8FAFC),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(color: const Color(0xFFE2E8F0)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Contract Value', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                            Text(
                                              '৳ ${(c['contract_value'] as num).toInt()}',
                                              style: const TextStyle(color: CollectionTheme.darkSlate, fontWeight: FontWeight.bold, fontSize: 13),
                                            ),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            const Text('Outstanding Balance', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                            Text(
                                              '৳ ${(c['outstanding_balance'] as num).toInt()}',
                                              style: TextStyle(
                                                color: isOverdue ? Colors.red : CollectionTheme.primaryEmerald,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 13,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  // Action Buttons
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          icon: const Icon(Icons.receipt_long, size: 14),
                                          label: const Text('Ledger', style: TextStyle(fontSize: 12)),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: CollectionTheme.darkSlate,
                                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                                          ),
                                          onPressed: () {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) => CustomerLedgerScreen(bookingNumber: c['booking_reference_no']),
                                              ),
                                            );
                                          },
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          icon: const Icon(Icons.calendar_month, size: 14),
                                          label: const Text('Schedule', style: TextStyle(fontSize: 12)),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: CollectionTheme.darkSlate,
                                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                                          ),
                                          onPressed: () {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) => InstallmentScheduleScreen(bookingNumber: c['booking_reference_no']),
                                              ),
                                            );
                                          },
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          icon: const Icon(Icons.payments, size: 14),
                                          label: const Text('Collect', style: TextStyle(fontSize: 12)),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: CollectionTheme.primaryEmerald,
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(vertical: 10),
                                          ),
                                          onPressed: () {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) => PaymentEntryScreen(
                                                  bookingId: c['booking_id'] ?? 1,
                                                  customerId: c['customer_id'] ?? 1,
                                                  customerName: c['full_name'] ?? 'Buyer',
                                                  bookingRef: c['booking_reference_no'] ?? 'BK-2026',
                                                  suggestedAmount: (c['outstanding_balance'] as num?)?.toDouble() ?? 500000.0,
                                                ),
                                              ),
                                            );
                                          },
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
        ],
      ),
    );
  }
}
