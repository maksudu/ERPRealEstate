import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../core/network/api_client.dart';

class PayrollPayslipsScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const PayrollPayslipsScreen({super.key, this.onOpenDrawer});

  @override
  State<PayrollPayslipsScreen> createState() => _PayrollPayslipsScreenState();
}

class _PayrollPayslipsScreenState extends State<PayrollPayslipsScreen> {
  final _api = HrApiClient();
  bool _isLoading = true;
  List<dynamic> _payslips = [];

  @override
  void initState() {
    super.initState();
    _fetchPayslips();
  }

  Future<void> _fetchPayslips() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getPayslips();
      if (mounted) setState(() => _payslips = res['payslips'] ?? []);
    } catch (_) {
      if (mounted) {
        setState(() {
          _payslips = [
            {
              'id': 101,
              'month_year': 'September 2026',
              'gross_salary': 85000.0,
              'basic': 48000.0,
              'house_rent': 24000.0,
              'medical': 5000.0,
              'conveyance': 4000.0,
              'overtime_pay': 4000.0,
              'deductions': 4500.0,
              'tax_tds': 2500.0,
              'provident_fund': 2000.0,
              'net_salary': 84500.0,
              'disbursed_date': '2026-10-05',
              'status': 'DISBURSED',
            },
          ];
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showPayslipDetails(Map<String, dynamic> p) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(p['month_year'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: HrTheme.deepNavy)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(8)),
                  child: Text(p['status'], style: const TextStyle(color: HrTheme.successTeal, fontWeight: FontWeight.bold, fontSize: 11)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(color: Color(0xFFF1F5F9)),

            // Earnings
            const Text('EARNING PARTICULARS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            _breakdownRow('Basic Pay', '৳ ${p['basic']}'),
            _breakdownRow('House Rent Allowance (50%)', '৳ ${p['house_rent']}'),
            _breakdownRow('Medical Allowance', '৳ ${p['medical']}'),
            _breakdownRow('Conveyance Allowance', '৳ ${p['conveyance']}'),
            if ((p['overtime_pay'] ?? 0.0) > 0)
              _breakdownRow('Overtime & Site Allowance', '৳ ${p['overtime_pay']}'),
            const SizedBox(height: 14),

            // Deductions
            const Text('STATUTORY DEDUCTIONS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            _breakdownRow('Bangladesh E-TIN Tax (TDS)', '-৳ ${p['tax_tds']}', isNegative: true),
            _breakdownRow('Provident Fund Contribution', '-৳ ${p['provident_fund']}', isNegative: true),
            const Divider(color: Color(0xFFF1F5F9), height: 24),

            // Net Take Home
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('NET SALARY IN BDT', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: HrTheme.deepNavy)),
                Text('৳ ${p['net_salary']}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: HrTheme.primaryIndigo)),
              ],
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: HrTheme.deepNavy, foregroundColor: Colors.white),
              icon: const Icon(Icons.download, size: 18),
              label: const Text('Download Official Salary Slip PDF'),
              onPressed: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(backgroundColor: HrTheme.deepNavy, content: Text('Downloading Payslip for ${p['month_year']}...')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _breakdownRow(String label, String value, {bool isNegative = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isNegative ? HrTheme.alertCrimson : HrTheme.deepNavy,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: HrTheme.deepNavy),
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
        title: const Text('Payroll & Payslips', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: HrTheme.primaryIndigo))
          : RefreshIndicator(
              onRefresh: _fetchPayslips,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _payslips.length,
                itemBuilder: (context, idx) {
                  final p = _payslips[idx];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    color: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: HrTheme.slateBorder),
                    ),
                    child: InkWell(
                      onTap: () => _showPayslipDetails(p),
                      borderRadius: BorderRadius.circular(16),
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(p['month_year'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: HrTheme.deepNavy)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(6)),
                                  child: Text(p['status'], style: const TextStyle(color: HrTheme.successTeal, fontWeight: FontWeight.bold, fontSize: 11)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text('Disbursed on ${p['disbursed_date']} via Bank Transfer', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                            const SizedBox(height: 14),
                            const Divider(color: Color(0xFFF1F5F9)),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Net Take-Home Pay', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: HrTheme.deepNavy)),
                                Text('৳ ${p['net_salary']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: HrTheme.primaryIndigo)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }
}
