import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/customer_theme.dart';
import '../models/financial_statement.dart';

class FinancialCenterScreen extends StatefulWidget {
  const FinancialCenterScreen({super.key});

  @override
  State<FinancialCenterScreen> createState() => _FinancialCenterScreenState();
}

class _FinancialCenterScreenState extends State<FinancialCenterScreen> {
  final CustomerFinancials _financials = CustomerFinancials(
    totalUnitValue: 18500000.0,
    totalPaidBdt: 11000000.0,
    upcomingDueBdt: 2000000.0,
    upcomingDueDate: DateTime(2026, 11, 15),
    overdueBalanceBdt: 0.0,
    schedule: [
      InstallmentItem(
        installmentName: '1. Booking Money (Token)',
        amountBdt: 2500000.0,
        dueDate: DateTime(2026, 1, 10),
        isPaid: true,
        paidDate: DateTime(2026, 1, 10),
        moneyReceiptNumber: 'MR-2026-0104',
      ),
      InstallmentItem(
        installmentName: '2. Down Payment (Deed Signing)',
        amountBdt: 3500000.0,
        dueDate: DateTime(2026, 2, 1),
        isPaid: true,
        paidDate: DateTime(2026, 1, 28),
        moneyReceiptNumber: 'MR-2026-0219',
      ),
      InstallmentItem(
        installmentName: '3. Ground Floor Slab Casting',
        amountBdt: 2500000.0,
        dueDate: DateTime(2026, 5, 15),
        isPaid: true,
        paidDate: DateTime(2026, 5, 14),
        moneyReceiptNumber: 'MR-2026-0582',
      ),
      InstallmentItem(
        installmentName: '4. 4th Floor Roof Slab Casting',
        amountBdt: 2500000.0,
        dueDate: DateTime(2026, 8, 15),
        isPaid: true,
        paidDate: DateTime(2026, 8, 12),
        moneyReceiptNumber: 'MR-2026-0891',
      ),
      InstallmentItem(
        installmentName: '5. 8th Floor Roof Slab Casting',
        amountBdt: 2000000.0,
        dueDate: DateTime(2026, 11, 15),
        isPaid: false,
      ),
      InstallmentItem(
        installmentName: '6. Final Possession & Handover',
        amountBdt: 5500000.0,
        dueDate: DateTime(2026, 12, 31),
        isPaid: false,
      ),
    ],
  );

  void _openPaymentModal(InstallmentItem item) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Online Installment Payment',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const SizedBox(height: 6),
            Text(item.installmentName, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            Text(
              '৳ ${(item.amountBdt).toStringAsFixed(0)}',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: CustomerTheme.midnightNavy),
            ),
            const SizedBox(height: 16),
            const Text('Choose Payment Gateway', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
            const SizedBox(height: 10),

            _buildPaymentMethodTile('bKash Payment', 'Instant 0% convenience charge', CustomerTheme.bkashPink, () {
              Navigator.pop(ctx);
              _simulatePaymentSuccess(item, 'bKash');
            }),
            const SizedBox(height: 8),
            _buildPaymentMethodTile('Nagad Payment', 'Official merchant gateway', CustomerTheme.nagadOrange, () {
              Navigator.pop(ctx);
              _simulatePaymentSuccess(item, 'Nagad');
            }),
            const SizedBox(height: 8),
            _buildPaymentMethodTile('Visa / Mastercard', 'Internet Banking & Debit/Credit Cards', const Color(0xFF2563EB), () {
              Navigator.pop(ctx);
              _simulatePaymentSuccess(item, 'Card');
            }),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _simulatePaymentSuccess(InstallmentItem item, String method) {
    final mr = 'MR-2026-${DateTime.now().millisecondsSinceEpoch % 90000 + 10000}';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: CustomerTheme.successGreen, size: 28),
            SizedBox(width: 10),
            Text('Payment Successful!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Gateway: $method'),
            const SizedBox(height: 4),
            Text('Amount Paid: ৳ ${item.amountBdt.toStringAsFixed(0)}'),
            const SizedBox(height: 4),
            Text('Official Money Receipt: $mr', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('An official signed and sealed PDF Money Receipt has been issued and sent to your registered email and mobile.'),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Downloading official Money Receipt $mr.pdf...'),
                  backgroundColor: CustomerTheme.successGreen,
                ),
              );
            },
            icon: const Icon(Icons.download, size: 16),
            label: const Text('Download Receipt'),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodTile(String name, String desc, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Text(desc, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Financial Center & Payments'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Financial Status Banner
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0A1128), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('TOTAL UNIT VALUE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8), letterSpacing: 1.1)),
                  const SizedBox(height: 4),
                  Text(
                    '৳ ${(_financials.totalUnitValue / 100000).toStringAsFixed(0)} Lac',
                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Paid: ৳ ${(_financials.totalPaidBdt / 100000).toStringAsFixed(0)} Lac', style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.bold)),
                      Text('Remaining: ৳ ${(_financials.balanceRemaining / 100000).toStringAsFixed(0)} Lac', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: _financials.paymentProgressPercent,
                    backgroundColor: Colors.white12,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF34D399)),
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Upcoming Due Alert Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD97706).withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.notification_important, color: Color(0xFFD97706), size: 26),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Upcoming Due Installment', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          Text(
                            '৳ ${(_financials.upcomingDueBdt).toStringAsFixed(0)} • Due ${DateFormat('dd MMM yyyy').format(_financials.upcomingDueDate)}',
                            style: const TextStyle(fontSize: 12, color: Color(0xFFD97706), fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: CustomerTheme.midnightNavy,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        minimumSize: Size.zero,
                      ),
                      onPressed: () => _openPaymentModal(_financials.schedule[4]),
                      child: const Text('Pay Now', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Installment Schedule History
            const Text(
              'INSTALLMENT PAYMENT SCHEDULE',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 10),

            ..._financials.schedule.map((item) {
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: (item.isPaid ? CustomerTheme.successGreen : const Color(0xFFD97706)).withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          item.isPaid ? Icons.check_circle : Icons.schedule,
                          color: item.isPaid ? CustomerTheme.successGreen : const Color(0xFFD97706),
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item.installmentName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text(
                              item.isPaid
                                  ? 'Paid on ${DateFormat('dd MMM yyyy').format(item.paidDate!)} (${item.moneyReceiptNumber})'
                                  : 'Due: ${DateFormat('dd MMM yyyy').format(item.dueDate)}',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '৳ ${(item.amountBdt).toStringAsFixed(0)}',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: item.isPaid ? CustomerTheme.midnightNavy : const Color(0xFFD97706),
                            ),
                          ),
                          if (item.isPaid)
                            InkWell(
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Downloading official receipt ${item.moneyReceiptNumber}.pdf...'),
                                    backgroundColor: CustomerTheme.successGreen,
                                  ),
                                );
                              },
                              child: const Text('Receipt PDF', style: TextStyle(fontSize: 11, color: Color(0xFF2563EB), fontWeight: FontWeight.bold)),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
