import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/collection_theme.dart';
import '../models/ni_act_notice.dart';

class NiActLoggerScreen extends StatefulWidget {
  const NiActLoggerScreen({super.key});

  @override
  State<NiActLoggerScreen> createState() => _NiActLoggerScreenState();
}

class _NiActLoggerScreenState extends State<NiActLoggerScreen> {
  final List<NiActNotice> _notices = [
    NiActNotice(
      id: 'NI-138-001',
      clientName: 'Engr. Mahbubur Rahman',
      clientPhone: '+880 1712-334455',
      unitNumber: 'A-7',
      project: 'Green Horizon Tower',
      chequeNumber: 'EBL-492810',
      bankName: 'Eastern Bank PLC',
      chequeAmount: 750000.0,
      bounceReason: 'Funds Insufficient',
      bounceDate: DateTime.now().subtract(const Duration(days: 12)),
      noticeServedDate: DateTime.now().subtract(const Duration(days: 6)),
      daysElapsed: 6,
      status: 'NOTICE_SERVED_30D_COUNTDOWN',
    ),
    NiActNotice(
      id: 'NI-138-002',
      clientName: 'Syed Tanvir Ahmed',
      clientPhone: '+880 1911-223344',
      unitNumber: 'C-4',
      project: 'Lakeside Residency',
      chequeNumber: 'CBL-881920',
      bankName: 'The City Bank Ltd',
      chequeAmount: 1200000.0,
      bounceReason: 'Account Operation Stopped / Dormant',
      bounceDate: DateTime.now().subtract(const Duration(days: 35)),
      noticeServedDate: DateTime.now().subtract(const Duration(days: 28)),
      daysElapsed: 28,
      status: 'CRITICAL_COUNTDOWN_EXPIRING',
    ),
    NiActNotice(
      id: 'NI-138-003',
      clientName: 'Zahirul Islam Mollah',
      clientPhone: '+880 1819-556677',
      unitNumber: 'D-2',
      project: 'Navana Heights',
      chequeNumber: 'IBBL-771892',
      bankName: 'Islami Bank Bangladesh Ltd',
      chequeAmount: 850000.0,
      bounceReason: 'Refer to Drawer (Signature Mismatch)',
      bounceDate: DateTime.now().subtract(const Duration(days: 4)),
      daysElapsed: 0,
      status: 'AWAITING_NOTICE_DISPATCH',
    ),
  ];

  void _serveNotice(NiActNotice notice) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          top: 20,
          left: 20,
          right: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.gavel, color: CollectionTheme.alertCrimson),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Serve Legal Demand Notice (Sec 138)\n${notice.clientName}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Text(
              'Under Section 138 of the Negotiable Instruments Act 1881, the statutory legal notice must be served via Registered Post with A/D or personal delivery.',
              style: TextStyle(fontSize: 12, color: Colors.grey[700]),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.camera_alt, color: CollectionTheme.darkSlate),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Photograph Signed A/D Receipt', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        Text('Photo of Client / Representative Signature on A/D Card', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                  Icon(Icons.check_circle, color: CollectionTheme.primaryEmerald, size: 20),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: CollectionTheme.alertCrimson,
                  foregroundColor: Colors.white,
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Notice registered! 30-day statutory countdown started for ${notice.clientName}.'),
                      backgroundColor: CollectionTheme.alertCrimson,
                    ),
                  );
                },
                icon: const Icon(Icons.timer),
                label: const Text('Start 30-Day Statutory Countdown'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('NI Act 1881 Notice Logger'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Legal Notice Compliance Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF7F1D1D), Color(0xFF991B1B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Row(
              children: [
                Icon(Icons.policy_rounded, color: Colors.white, size: 32),
                SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Statutory 30-Day NI Act Rule',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      SizedBox(height: 3),
                      Text(
                        'After cheque dishonor, notice must be served with signed A/D. Client has exactly 30 days to pay before criminal prosecution.',
                        style: TextStyle(color: Color(0xFFFECACA), fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          const Text(
            'ACTIVE DISHONORED CHEQUE CASES',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.1,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 12),

          ..._notices.map((n) => _buildNoticeCard(n)),
        ],
      ),
    );
  }

  Widget _buildNoticeCard(NiActNotice notice) {
    final bool isCountdown = notice.status == 'NOTICE_SERVED_30D_COUNTDOWN' || notice.status == 'CRITICAL_COUNTDOWN_EXPIRING';
    final int remaining = notice.daysRemaining;
    final bool isCritical = remaining <= 5 && isCountdown;

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    notice.clientName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: CollectionTheme.darkSlate),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isCritical
                        ? CollectionTheme.alertCrimson
                        : (isCountdown ? const Color(0xFFD97706) : const Color(0xFF475569)),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isCritical
                        ? 'EXPIRING IN $remaining DAYS'
                        : (isCountdown ? 'DAY ${notice.daysElapsed} OF 30' : 'AWAITING NOTICE'),
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${notice.project} • Unit: ${notice.unitNumber} • Phone: ${notice.clientPhone}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 8),

            // Cheque details banner
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Cheque: #${notice.chequeNumber} (${notice.bankName})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      Text('৳ ${notice.chequeAmount.toStringAsFixed(0)}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: CollectionTheme.alertCrimson)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.error_outline, size: 14, color: CollectionTheme.alertCrimson),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          'Reason: ${notice.bounceReason}',
                          style: const TextStyle(fontSize: 11, color: CollectionTheme.alertCrimson, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Notice Serving Progress
            if (isCountdown) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Served: ${DateFormat('dd MMM yyyy').format(notice.noticeServedDate!)}',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                  Text(
                    '$remaining days left to pay',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isCritical ? CollectionTheme.alertCrimson : const Color(0xFFD97706),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              LinearProgressIndicator(
                value: (notice.daysElapsed / 30.0).clamp(0.0, 1.0),
                backgroundColor: const Color(0xFFE2E8F0),
                valueColor: AlwaysStoppedAnimation<Color>(
                  isCritical ? CollectionTheme.alertCrimson : const Color(0xFFD97706),
                ),
                minHeight: 6,
                borderRadius: BorderRadius.circular(4),
              ),
            ],

            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (!isCountdown)
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: CollectionTheme.alertCrimson,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    ),
                    onPressed: () => _serveNotice(notice),
                    icon: const Icon(Icons.assignment_turned_in, size: 16),
                    label: const Text('Log Notice A/D Delivery', style: TextStyle(fontSize: 12)),
                  )
                else
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: isCritical ? CollectionTheme.alertCrimson : CollectionTheme.darkSlate,
                      side: BorderSide(color: isCritical ? CollectionTheme.alertCrimson : const Color(0xFFCBD5E1)),
                    ),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            isCritical
                                ? 'Preparing formal criminal complaint dossier for Magistrate Court...'
                                : 'Notice period still active (${notice.daysRemaining} days left).',
                          ),
                        ),
                      );
                    },
                    icon: Icon(isCritical ? Icons.gavel : Icons.remove_red_eye, size: 16),
                    label: Text(
                      isCritical ? 'File Criminal Case in Court' : 'View A/D Card Proof',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
