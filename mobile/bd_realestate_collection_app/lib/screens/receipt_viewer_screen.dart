import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../core/bluetooth/bluetooth_printer_service.dart';
import '../models/collection_receipt.dart';

class ReceiptViewerScreen extends StatelessWidget {
  final int receiptId;
  final String mrNumber;
  final String customerName;
  final String bookingRef;
  final double amount;
  final String paymentMode;
  final bool isBankConfirmed;

  const ReceiptViewerScreen({
    super.key,
    required this.receiptId,
    required this.mrNumber,
    required this.customerName,
    required this.bookingRef,
    required this.amount,
    required this.paymentMode,
    this.isBankConfirmed = false,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Money Receipt (MR)', style: TextStyle(color: CollectionTheme.darkSlate, fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, color: CollectionTheme.primaryEmerald),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Receipt PDF shared with customer via WhatsApp/Email!')));
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Thermal Styled Receipt Preview Container
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Icon(Icons.apartment_rounded, color: CollectionTheme.primaryEmerald, size: 36),
                  const SizedBox(height: 6),
                  const Text(
                    'BLUEOCEANS REAL ESTATE PLC',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 1),
                  ),
                  const Text('Gulshan-2, Dhaka-1212, Bangladesh', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                  const Text('Tel: +880-2-9882233 · VAT Reg: 001239845-0101', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                  const SizedBox(height: 12),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 8),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('RECEIPT NUMBER:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text(mrNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: CollectionTheme.primaryEmerald)),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('DATE:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text(DateTime.now().toIso8601String().split('T')[0], style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 8),

                  _rowDetail('Customer Name:', customerName),
                  _rowDetail('Booking Reference:', bookingRef),
                  _rowDetail('Payment Mode:', paymentMode),
                  _rowDetail('Issuing Terminal:', 'Mobile Field Terminal #01'),
                  const SizedBox(height: 12),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 8),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('AMOUNT RECEIVED:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: CollectionTheme.darkSlate)),
                      Text('৳ ${amount.toInt()}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: CollectionTheme.primaryEmerald)),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Status Badge
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: isBankConfirmed ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isBankConfirmed ? const Color(0xFF22C55E) : const Color(0xFFF59E0B),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        isBankConfirmed ? 'STATUS: BANK-CONFIRMED / CLEARED' : 'STATUS: PENDING FINANCE CLEARANCE',
                        style: TextStyle(
                          color: isBankConfirmed ? const Color(0xFF15803D) : const Color(0xFF92400E),
                          fontWeight: FontWeight.bold,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Simulated QR Verification Code
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.qr_code_2, size: 72, color: CollectionTheme.darkSlate),
                        const SizedBox(height: 4),
                        Text(
                          'Scan to verify statutory authenticity',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Computer generated money receipt. No manual signature required.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Print Thermal Receipt Button
            ElevatedButton.icon(
              icon: const Icon(Icons.print_rounded),
              label: const Text('Print 80mm Bluetooth ESC/POS Receipt'),
              style: ElevatedButton.styleFrom(
                backgroundColor: CollectionTheme.primaryEmerald,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(50),
              ),
              onPressed: () async {
                final printer = BluetoothPrinterService();
                final receiptObj = CollectionReceipt(
                  receiptNumber: mrNumber,
                  clientName: customerName,
                  clientPhone: '+880 1711-000000',
                  unitNumber: bookingRef,
                  project: 'BlueOceans Residencies',
                  amount: amount,
                  paymentMethod: paymentMode.toUpperCase().contains('CHEQUE')
                      ? PaymentMethod.cheque
                      : paymentMode.toUpperCase().contains('BKASH')
                          ? PaymentMethod.bkashQr
                          : PaymentMethod.cash,
                  transactionRef: mrNumber,
                  amountInWords: 'Taka ${amount.toInt()} Only',
                  date: DateTime.now(),
                  collectedBy: 'Field Officer',
                );
                await printer.printReceipt(receiptObj);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Receipt sent to Bluetooth thermal printer!')));
                }
              },

            ),
            const SizedBox(height: 10),

            OutlinedButton(
              style: OutlinedButton.styleFrom(
                foregroundColor: CollectionTheme.darkSlate,
                side: const BorderSide(color: Color(0xFFCBD5E1)),
                minimumSize: const Size.fromHeight(50),
              ),
              onPressed: () => Navigator.pop(context),
              child: const Text('Back to Cockpit'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _rowDetail(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
          Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: CollectionTheme.darkSlate)),
        ],
      ),
    );
  }
}
