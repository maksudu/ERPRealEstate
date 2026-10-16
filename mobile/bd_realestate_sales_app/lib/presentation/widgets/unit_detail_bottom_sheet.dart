import 'package:flutter/material.dart';
import '../../domain/entities/unit_entity.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/theme/app_theme.dart';

class UnitDetailBottomSheet extends StatelessWidget {
  final UnitEntity unit;
  final VoidCallback onLockPressed;
  final VoidCallback onCalculateEmi;
  final VoidCallback onProceedBooking;

  const UnitDetailBottomSheet({
    super.key,
    required this.unit,
    required this.onLockPressed,
    required this.onCalculateEmi,
    required this.onProceedBooking,
  });

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Color _getStatusColor(UnitGridStatus status) {
    switch (status) {
      case UnitGridStatus.available:
        return AppTheme.successGreen;
      case UnitGridStatus.onHold:
        return AppTheme.accentAmber;
      case UnitGridStatus.sold:
        return AppTheme.dangerRed;
      case UnitGridStatus.landownerShare:
        return AppTheme.landownerPurple;
    }
  }

  String _getStatusText(UnitGridStatus status) {
    switch (status) {
      case UnitGridStatus.available:
        return 'Available for Sale';
      case UnitGridStatus.onHold:
        return 'Locked on Hold (15-min Mutex)';
      case UnitGridStatus.sold:
        return 'Booked & Sold';
      case UnitGridStatus.landownerShare:
        return 'Landowner Share Unit';
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor(unit.status);

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Unit ${unit.unitNumber} · ${unit.towerName}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
                  ),
                  Text(
                    'Level ${unit.floorNumber} · ${unit.facingDirection}',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: statusColor, width: 1),
                ),
                child: Text(
                  _getStatusText(unit.status),
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),

          // Countdown banner if on hold
          if (unit.status == UnitGridStatus.onHold) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.accentAmber.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppTheme.accentAmber),
              ),
              child: Row(
                children: [
                  const Icon(Icons.timer, color: AppTheme.accentAmber, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Lock Active: ${_formatDuration(unit.remainingLockSeconds)} remaining\nLocked by: ${unit.lockedBy ?? 'Sales Representative'}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF78350F),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 16),

          // Price & Area Matrix
          Row(
            children: [
              Expanded(
                child: _buildSpecCard(
                  'Carpet Area',
                  '${unit.carpetAreaSqft.toStringAsFixed(0)} sqft',
                  Icons.space_dashboard_outlined,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSpecCard(
                  'Gross Saleable',
                  '${unit.grossAreaSqft.toStringAsFixed(0)} sqft',
                  Icons.crop_square,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Pricing calculation breakdown
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'PRICING ENGINE & ESCALATION BREAKDOWN',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.8),
                ),
                const SizedBox(height: 8),
                _buildPriceRow('Base Rate per sqft', BdtCurrencyFormatter.format(unit.baseRatePerSqft)),
                _buildPriceRow(
                  'Floor Escalation (+৳৫০ × Level ${unit.floorNumber})',
                  '+ ${BdtCurrencyFormatter.format(unit.floorNumber * unit.floorEscalationPerSqft)} / sqft',
                ),
                _buildPriceRow('Facing Premium (${unit.facingDirection})', '+ ${BdtCurrencyFormatter.format(unit.facingPremiumAmount)}'),
                const Divider(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Gross BDT Price:',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    Text(
                      BdtCurrencyFormatter.format(unit.grossPriceBdt),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 17,
                        color: AppTheme.primaryTeal,
                      ),
                    ),
                  ],
                ),
                Text(
                  'In Words: ${BdtCurrencyFormatter.formatInWords(unit.grossPriceBdt)}',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 11, fontStyle: FontStyle.italic),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Action Buttons
          if (unit.status == UnitGridStatus.available) ...[
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.lock_clock),
                    label: const Text('15-Min Mutex Lock'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accentAmber,
                      foregroundColor: const Color(0xFF78350F),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                    ),
                    onPressed: onLockPressed,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.edit_document),
                    label: const Text('Book Flat'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryTeal,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                    ),
                    onPressed: onProceedBooking,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.calculate_outlined),
                label: const Text('Calculate Custom EMI / Installment Schedule'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onPressed: onCalculateEmi,
              ),
            ),
          ] else if (unit.status == UnitGridStatus.onHold) ...[
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.edit_document),
                    label: const Text('Proceed to Booking'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryTeal,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                    ),
                    onPressed: onProceedBooking,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.calculate_outlined),
                    label: const Text('EMI Calculator'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 13),
                    ),
                    onPressed: onCalculateEmi,
                  ),
                ),
              ],
            ),
          ] else ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                unit.status == UnitGridStatus.landownerShare
                    ? '🔒 Landowner Allocation Unit. Strictly locked from sales inventory.'
                    : '🔴 Flat Unit Sold & Allotted.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSpecCard(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppTheme.primaryTeal),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
              Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
