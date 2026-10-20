import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';

class BookingManagerScreen extends StatefulWidget {
  const BookingManagerScreen({super.key});

  @override
  State<BookingManagerScreen> createState() => _BookingManagerScreenState();
}

class _BookingManagerScreenState extends State<BookingManagerScreen> {
  final _api = ApiClient();
  bool _isLoading = false;
  List<dynamic> _bookings = [];

  @override
  void initState() {
    super.initState();
    _loadBookings();
  }

  Future<void> _loadBookings() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getBookings();
      setState(() => _bookings = res);
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  void _showBookingDetail(Map<String, dynamic> brief) async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => FutureBuilder<Map<String, dynamic>>(
        future: _api.getBooking(brief['id']),
        builder: (ctx, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const SizedBox(height: 300, child: Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal)));
          }
          final b = snapshot.data ?? brief;
          final installments = (b['installments'] as List?) ?? [];
          final approvals = (b['approvals'] as List?) ?? [];

          return DraggableScrollableSheet(
            initialChildSize: 0.85,
            maxChildSize: 0.95,
            minChildSize: 0.5,
            expand: false,
            builder: (_, scrollCtrl) => SingleChildScrollView(
              controller: scrollCtrl,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(b['booking_reference_no'] ?? 'BK-2026', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold)),
                          Text('${b['project_name'] ?? 'Project'} · Unit ${b['unit_number'] ?? '-'}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: b['status'] == 'CANCELLED' ? Colors.red.withOpacity(0.12) : const Color(0xFF10B981).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          b['status'] ?? 'PROVISIONAL',
                          style: TextStyle(color: b['status'] == 'CANCELLED' ? Colors.redAccent : const Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: Color(0xFFE2E8F0), height: 24),

                  // Financial summary card
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: [
                        _summaryRow('Customer', b['customer_name'] ?? '-'),
                        const SizedBox(height: 6),
                        _summaryRow('Base Unit Price', CurrencyFormatter.formatBDT((b['base_unit_price'] ?? 0).toDouble())),
                        const SizedBox(height: 6),
                        _summaryRow('Discount (${b['discount_percentage'] ?? 0}%)', '- ${CurrencyFormatter.formatBDT((b['discount_amount'] ?? 0).toDouble())}'),
                        const SizedBox(height: 6),
                        _summaryRow('Parking Charge', CurrencyFormatter.formatBDT((b['parking_charge'] ?? 0).toDouble())),
                        const Divider(color: Color(0xFFE2E8F0), height: 16),
                        _summaryRow('Final Contract Value', CurrencyFormatter.formatBDT((b['final_contract_value'] ?? 0).toDouble()), isBold: true),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Action Buttons: PDF & Cancel
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.picture_as_pdf, size: 16),
                          label: const Text('Download Deed / PDF', style: TextStyle(fontSize: 12)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.primaryTeal,
                            side: const BorderSide(color: AppTheme.primaryTeal),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                          onPressed: () {
                            final url = _api.getBookingPdfUrl(b['id']);
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Deed document PDF link: $url')));
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      if (b['status'] != 'CANCELLED')
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.cancel_outlined, size: 16),
                            label: const Text('Request Cancel', style: TextStyle(fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.redAccent,
                              side: const BorderSide(color: Colors.redAccent),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                            onPressed: () => _showCancellationDialog(b['id']),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Installment Plan
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Installment Amortization Plan', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                      Text('${installments.length} Milestones', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (installments.isEmpty)
                    const Text('No installment plan recorded.', style: TextStyle(color: Colors.grey, fontSize: 12))
                  else
                    ...installments.map((i) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(i['title'] ?? 'Installment', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.bold)),
                                  Text('Due: ${i['due_date'] ?? '-'}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    CurrencyFormatter.formatBDT((i['payable_amount'] ?? 0).toDouble()),
                                    style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 13, fontWeight: FontWeight.bold),
                                  ),
                                  Text(i['status'] ?? 'SCHEDULED', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                ],
                              ),
                            ],
                          ),
                        )),
                  const SizedBox(height: 16),

                  // Approvals for this booking
                  if (approvals.isNotEmpty) ...[
                    const Text('Governance Approvals', style: TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ...approvals.map((a) => Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(a['document_type'] ?? 'Approval', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12)),
                              Text(a['status'] ?? 'PENDING', style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        )),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _summaryRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
        Text(value, style: TextStyle(color: isBold ? AppTheme.primaryTeal : const Color(0xFF0F172A), fontSize: 12, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
      ],
    );
  }

  void _showCancellationDialog(int bookingId) {
    String category = 'BUYER_RELOCATION';
    final reason = TextEditingController(text: 'Personal financial relocation to overseas');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Request Booking Cancellation', style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Submitting cancellation will initiate 3-tier Governance Approval (Legal -> Sales -> Finance) and compute statutory forfeiture under REHAB rules.',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: category,
                dropdownColor: Colors.white,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Cancellation Category', labelStyle: TextStyle(color: Color(0xFF64748B))),
                items: const [
                  DropdownMenuItem(value: 'BUYER_RELOCATION', child: Text('Buyer Relocation')),
                  DropdownMenuItem(value: 'FINANCIAL_HARDSHIP', child: Text('Financial Hardship')),
                  DropdownMenuItem(value: 'DEVELOPER_DELAY', child: Text('Developer Delay (0% penalty)')),
                  DropdownMenuItem(value: 'BUYER_DEFAULT', child: Text('Buyer Default (10% forfeit)')),
                ],
                onChanged: (v) => setDlg(() => category = v ?? 'BUYER_RELOCATION'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: reason,
                maxLines: 2,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Detailed Reason *', labelStyle: TextStyle(color: Color(0xFF64748B))),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent, foregroundColor: Colors.white),
              onPressed: () async {
                try {
                  await _api.cancelBooking(bookingId, category, reason.text.trim());
                  Navigator.pop(ctx);
                  Navigator.pop(context); // Close detail sheet
                  _loadBookings();
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cancellation request forwarded for Governance Approval.')));
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                }
              },
              child: const Text('Submit Request'),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateReservationDialog() {
    final discountCtrl = TextEditingController(text: '0');
    final earnestCtrl = TextEditingController(text: '200000');
    final countCtrl = TextEditingController(text: '24');
    String planType = 'MONTHLY';

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
                  const Text('New Reservation Request', style: TextStyle(color: Color(0xFF0F172A), fontSize: 17, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close, color: Color(0xFF64748B)), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 12),
              const Text('Unit: Default Available Unit #3A (PRJ-01)', style: TextStyle(color: AppTheme.primaryTeal, fontSize: 13, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              TextField(
                controller: earnestCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Earnest Money Received (BDT) *', labelStyle: TextStyle(color: Color(0xFF64748B))),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: discountCtrl,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Discount Amount (BDT, requires approval)', labelStyle: TextStyle(color: Color(0xFF64748B))),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: planType,
                      dropdownColor: Colors.white,
                      style: const TextStyle(color: Color(0xFF0F172A)),
                      decoration: const InputDecoration(labelText: 'Plan Type', labelStyle: TextStyle(color: Color(0xFF64748B))),
                      items: const [
                        DropdownMenuItem(value: 'MONTHLY', child: Text('Monthly')),
                        DropdownMenuItem(value: 'QUARTERLY', child: Text('Quarterly')),
                      ],
                      onChanged: (v) => setSheet(() => planType = v ?? 'MONTHLY'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: countCtrl,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(color: Color(0xFF0F172A)),
                      decoration: const InputDecoration(labelText: 'Installments (Count)', labelStyle: TextStyle(color: Color(0xFF64748B))),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryTeal,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () async {
                  try {
                    await _api.createBooking({
                      'unit_id': 1,
                      'customer_id': 1,
                      'earnest_money_received': double.tryParse(earnestCtrl.text.trim()) ?? 0,
                      'discount_amount': double.tryParse(discountCtrl.text.trim()) ?? 0,
                      'plan_type': planType,
                      'installment_count': int.tryParse(countCtrl.text.trim()) ?? 24,
                    });
                    Navigator.pop(ctx);
                    _loadBookings();
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Provisional reservation registered! Installment schedule generated.')));
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                  }
                },
                child: const Text('Submit Reservation Request', style: TextStyle(fontWeight: FontWeight.bold)),
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
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        title: const Text('Booking Management', style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.add, color: AppTheme.primaryTeal), onPressed: _showCreateReservationDialog),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
          : _bookings.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.book_online_outlined, color: Color(0xFF94A3B8), size: 48),
                      const SizedBox(height: 12),
                      const Text('No bookings recorded yet', style: TextStyle(color: Color(0xFF64748B))),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.add),
                        label: const Text('New Reservation'),
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal, foregroundColor: Colors.white),
                        onPressed: _showCreateReservationDialog,
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadBookings,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _bookings.length,
                    itemBuilder: (ctx, i) {
                      final b = _bookings[i];
                      return Card(
                        color: Colors.white,
                        elevation: 0,
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        child: ListTile(
                          onTap: () => _showBookingDetail(b),
                          title: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(b['booking_reference_no'] ?? 'BK-2026', style: const TextStyle(color: AppTheme.primaryTeal, fontWeight: FontWeight.bold, fontSize: 14)),
                              Text(b['status'] ?? 'PROVISIONAL', style: const TextStyle(color: Color(0xFF10B981), fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text('${b['customer_name'] ?? 'Buyer'} · Unit ${b['unit_number'] ?? '-'}', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.w500)),
                              Text(
                                'Contract: ${CurrencyFormatter.formatBDT((b['final_contract_value'] ?? 0).toDouble())}',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                              ),
                            ],
                          ),
                          trailing: const Icon(Icons.arrow_forward_ios, color: Color(0xFF94A3B8), size: 14),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
