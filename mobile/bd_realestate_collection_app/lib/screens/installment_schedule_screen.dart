import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../core/network/api_client.dart';

class InstallmentScheduleScreen extends StatefulWidget {
  final String? bookingNumber;

  const InstallmentScheduleScreen({super.key, this.bookingNumber});

  @override
  State<InstallmentScheduleScreen> createState() => _InstallmentScheduleScreenState();
}

class _InstallmentScheduleScreenState extends State<InstallmentScheduleScreen> {
  final _api = CollectionApiClient();
  bool _isLoading = false;
  int _activeTab = 0; // 0 = All Schedules, 1 = Overdue Aging

  List<Map<String, dynamic>> _schedules = [];
  List<Map<String, dynamic>> _overdueList = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final sRes = await _api.getSchedules(bookingNumber: widget.bookingNumber);
      final oRes = await _api.getDueOverdue();

      setState(() {
        _schedules = (sRes['items'] as List<dynamic>?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];
        _overdueList = (oRes['items'] as List<dynamic>?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];
      });
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  Future<void> _sendReminder(int scheduleId) async {
    try {
      await _api.sendReminder(scheduleId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment reminder SMS / WhatsApp dispatched successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          widget.bookingNumber != null ? 'Schedule: ${widget.bookingNumber}' : 'Installment Schedules',
          style: const TextStyle(color: CollectionTheme.darkSlate, fontSize: 18, fontWeight: FontWeight.bold),
        ),
      ),
      body: Column(
        children: [
          // Segmented Tabs
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                _tabItem(0, 'Installment Milestones (${_schedules.length})'),
                _tabItem(1, 'Overdue Aging & Legal (${_overdueList.length})'),
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: CollectionTheme.primaryEmerald))
                : _activeTab == 0
                    ? _buildMilestonesList()
                    : _buildOverdueAgingList(),
          ),
        ],
      ),
    );
  }

  Widget _tabItem(int index, String label) {
    final isSelected = _activeTab == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _activeTab = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? CollectionTheme.primaryEmerald : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF64748B),
                fontWeight: FontWeight.bold,
                fontSize: 11,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMilestonesList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _schedules.length,
      itemBuilder: (ctx, i) {
        final s = _schedules[i];
        final isPaid = s['status'] == 'PAID';
        final isOverdue = s['status'] == 'OVERDUE';

        return Card(
          color: Colors.white,
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: isOverdue ? Colors.red.shade200 : const Color(0xFFE2E8F0)),
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
                      '#${s['installment_no']} · ${s['installment_type']?.replaceAll('_', ' ')}',
                      style: const TextStyle(color: CollectionTheme.primaryEmerald, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isPaid
                            ? CollectionTheme.primaryEmerald.withOpacity(0.12)
                            : (isOverdue ? Colors.red.withOpacity(0.12) : const Color(0xFFFEF3C7)),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        s['status'] ?? 'UPCOMING',
                        style: TextStyle(
                          color: isPaid
                              ? CollectionTheme.primaryEmerald
                              : (isOverdue ? Colors.red : const Color(0xFFD97706)),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  s['title'] ?? 'Milestone',
                  style: const TextStyle(color: CollectionTheme.darkSlate, fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text('Due Date: ${s['due_date']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Payable Amount', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                        Text('৳ ${(s['payable_amount'] as num).toInt()}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: CollectionTheme.darkSlate)),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Balance Due', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                        Text(
                          '৳ ${(s['balance_due'] as num).toInt()}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: isPaid ? CollectionTheme.primaryEmerald : (isOverdue ? Colors.red : CollectionTheme.darkSlate),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                if ((s['late_fee_accrued'] as num? ?? 0) > 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      'Late Fee Accrued: ৳${(s['late_fee_accrued'] as num).toInt()} (2% per month rule)',
                      style: const TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildOverdueAgingList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _overdueList.length,
      itemBuilder: (ctx, i) {
        final o = _overdueList[i];
        final days = o['days_overdue'] as int? ?? 0;

        return Card(
          color: Colors.white,
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: Color(0xFFFECACA), width: 1.2),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(o['booking_reference_no'] ?? '', style: const TextStyle(color: CollectionTheme.primaryEmerald, fontSize: 11, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: days > 90 ? Colors.red.shade100 : Colors.amber.shade100,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        o['aging_bracket'] ?? 'Overdue',
                        style: TextStyle(
                          color: days > 90 ? Colors.red.shade900 : Colors.amber.shade900,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(o['customer_name'] ?? 'Buyer', style: const TextStyle(color: CollectionTheme.darkSlate, fontSize: 15, fontWeight: FontWeight.bold)),
                Text('Phone: ${o['customer_phone']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                const SizedBox(height: 6),
                Text('Milestone: ${o['title']}', style: const TextStyle(color: Color(0xFF475569), fontSize: 13, fontWeight: FontWeight.w500)),
                Text('Due Date: ${o['due_date']} (${o['days_overdue']} days overdue)', style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Default Balance: ৳${(o['balance_due'] as num).toInt()}',
                      style: const TextStyle(color: CollectionTheme.darkSlate, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.send, size: 13),
                      label: const Text('Send Reminder', style: TextStyle(fontSize: 11)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: CollectionTheme.primaryEmerald,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      ),
                      onPressed: () => _sendReminder(o['schedule_id'] ?? 101),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
