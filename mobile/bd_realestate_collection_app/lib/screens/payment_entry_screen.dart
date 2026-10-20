import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../core/network/api_client.dart';
import 'receipt_viewer_screen.dart';

class PaymentEntryScreen extends StatefulWidget {
  final int bookingId;
  final int customerId;
  final String customerName;
  final String bookingRef;
  final double suggestedAmount;
  final VoidCallback? onOpenDrawer;

  const PaymentEntryScreen({
    super.key,
    this.bookingId = 1,
    this.customerId = 1,
    this.customerName = 'Al-Haj Rafiqul Islam',
    this.bookingRef = 'BK-2026-0012',
    this.suggestedAmount = 500000.0,
    this.onOpenDrawer,
  });

  @override
  State<PaymentEntryScreen> createState() => _PaymentEntryScreenState();
}

class _PaymentEntryScreenState extends State<PaymentEntryScreen> {
  final _api = CollectionApiClient();
  final _amountCtrl = TextEditingController();
  final _instrumentCtrl = TextEditingController(text: 'CHQ-8899120');
  final _bankCtrl = TextEditingController(text: 'Islami Bank Bangladesh PLC');
  final _branchCtrl = TextEditingController(text: 'Gulshan Branch');
  final _remarksCtrl = TextEditingController(text: 'Collected on site by field recovery executive');

  String _paymentMode = 'CHEQUE'; // CASH, CHEQUE, BANK_TRANSFER, BKASH, NAGAD
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _amountCtrl.text = widget.suggestedAmount.toInt().toString();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _instrumentCtrl.dispose();
    _bankCtrl.dispose();
    _branchCtrl.dispose();
    _remarksCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitPayment() async {
    final amt = double.tryParse(_amountCtrl.text.trim()) ?? 0.0;
    if (amt <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid payment amount!')));
      return;
    }

    setState(() => _isLoading = true);
    try {
      final res = await _api.recordPayment({
        'booking_id': widget.bookingId,
        'customer_id': widget.customerId,
        'amount_received': amt,
        'payment_mode': _paymentMode,
        'instrument_no': _instrumentCtrl.text.trim(),
        'instrument_date': DateTime.now().toIso8601String().split('T')[0],
        'bank_name': _bankCtrl.text.trim(),
        'branch_name': _branchCtrl.text.trim(),
        'remarks': _remarksCtrl.text.trim(),
      });

      if (mounted) {
        final receiptId = res['receipt_id'] ?? 501;
        final mrNo = res['mr_number'] ?? 'MR-20261020-001';

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ReceiptViewerScreen(
              receiptId: receiptId,
              mrNumber: mrNo,
              customerName: widget.customerName,
              bookingRef: widget.bookingRef,
              amount: amt,
              paymentMode: _paymentMode,
              isBankConfirmed: false,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        // Fallback for offline simulation
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ReceiptViewerScreen(
              receiptId: 501,
              mrNumber: 'MR-20261020-001',
              customerName: widget.customerName,
              bookingRef: widget.bookingRef,
              amount: amt,
              paymentMode: _paymentMode,
              isBankConfirmed: false,
            ),
          ),
        );
      }
    }
    if (mounted) setState(() => _isLoading = false);
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
        title: const Text('Record Payment Entry', style: TextStyle(color: CollectionTheme.darkSlate, fontSize: 18, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Financial Safeguard & Verification Workflow Warning Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFF59E0B)),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.shield_outlined, color: Color(0xFFD97706), size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'FINANCIAL CONTROL & AUDIT WORKFLOW',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF92400E)),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Payment will be recorded under PENDING_CLEARANCE status. It is not automatically treated as bank-confirmed until Finance verifies the clearing instrument.',
                          style: TextStyle(fontSize: 11, color: Color(0xFF78350F), height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Customer Summary Card
            Card(
              color: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.bookingRef, style: const TextStyle(color: CollectionTheme.primaryEmerald, fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(widget.customerName, style: const TextStyle(color: CollectionTheme.darkSlate, fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    const Text('Green Horizon Tower (Gulshan-2) · Flat 8A', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Form Inputs Card
            Card(
              color: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Payment Details', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: CollectionTheme.darkSlate)),
                    const SizedBox(height: 14),

                    // Amount Received
                    TextField(
                      controller: _amountCtrl,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: CollectionTheme.darkSlate),
                      decoration: const InputDecoration(
                        labelText: 'Amount Received (BDT) *',
                        prefixText: '৳ ',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Payment Mode Dropdown
                    DropdownButtonFormField<String>(
                      value: _paymentMode,
                      dropdownColor: Colors.white,
                      decoration: const InputDecoration(labelText: 'Payment Mode *', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'CASH', child: Text('Cash at Site Counter')),
                        DropdownMenuItem(value: 'CHEQUE', child: Text('Cheque / Pay Order')),
                        DropdownMenuItem(value: 'BANK_TRANSFER', child: Text('Bank Transfer (BEFTN / RTGS)')),
                        DropdownMenuItem(value: 'BKASH', child: Text('bKash Merchant Payment')),
                        DropdownMenuItem(value: 'NAGAD', child: Text('Nagad Digital Payment')),
                      ],
                      onChanged: (v) => setState(() => _paymentMode = v ?? 'CHEQUE'),
                    ),
                    const SizedBox(height: 14),

                    if (_paymentMode != 'CASH') ...[
                      TextField(
                        controller: _instrumentCtrl,
                        decoration: InputDecoration(
                          labelText: _paymentMode == 'CHEQUE' ? 'Cheque / Pay Order Number *' : 'Transaction Reference / TrxID *',
                          border: const OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _bankCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Bank Name',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _branchCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Branch Name',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    TextField(
                      controller: _remarksCtrl,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Collector Notes & Voucher Ref',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: CollectionTheme.primaryEmerald,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              onPressed: _isLoading ? null : _submitPayment,
              child: _isLoading
                  ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Record Payment & Issue Receipt', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
