import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../core/network/api_client.dart';

class CashflowMonitoringScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const CashflowMonitoringScreen({super.key, this.onOpenDrawer});

  @override
  State<CashflowMonitoringScreen> createState() => _CashflowMonitoringScreenState();
}

class _CashflowMonitoringScreenState extends State<CashflowMonitoringScreen> {
  final _api = ManagementApiClient();
  bool _isLoading = true;
  Map<String, dynamic>? _cashData;

  @override
  void initState() {
    super.initState();
    _fetchCashflow();
  }

  Future<void> _fetchCashflow() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getCashflowMonitoring();
      if (mounted) setState(() => _cashData = res);
    } catch (_) {
      if (mounted) {
        setState(() {
          _cashData = {
            'liquidity_position': {
              'bank_cash_balance_bdt': 38500000.0,
              'pdc_cheques_in_hand_bdt': 42000000.0,
              'liquid_funds_total_bdt': 80500000.0,
            },
            'projected_cashflow': {
              'receivables_30d_bdt': 52000000.0,
              'payables_30d_bdt': 31500000.0,
              'net_surplus_30d_bdt': 20500000.0,
              'receivables_60d_bdt': 98000000.0,
              'payables_60d_bdt': 64000000.0,
              'net_surplus_60d_bdt': 34000000.0,
              'receivables_90d_bdt': 142000000.0,
              'payables_90d_bdt': 92000000.0,
              'net_surplus_90d_bdt': 50000000.0,
            },
            'key_payables': [
              {'entity': 'BSRM Steels Ltd', 'category': 'Construction Steel', 'amount_bdt': 8500000.0, 'due_date': '2026-10-30'},
              {'entity': 'Shah Cement Ltd', 'category': 'Ready Mix & Bags', 'amount_bdt': 6200000.0, 'due_date': '2026-11-05'},
              {'entity': 'Site Sub-contractors', 'category': 'RCC Labor Bill', 'amount_bdt': 4800000.0, 'due_date': '2026-10-25'},
            ],
          };
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final liq = _cashData?['liquidity_position'] ?? {};
    final proj = _cashData?['projected_cashflow'] ?? {};
    final payables = (_cashData?['key_payables'] as List<dynamic>?) ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: ManagementTheme.royalNavy),
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
        title: const Text('Cash Flow & Liquidity', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: ManagementTheme.royalNavy))
          : RefreshIndicator(
              onRefresh: _fetchCashflow,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Liquid Funds Card
                    Card(
                      color: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: ManagementTheme.borderSubtle),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('TOTAL LIQUID RESERVES', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: ManagementTheme.textMuted)),
                            const SizedBox(height: 4),
                            Text(
                              '৳ ${((liq['liquid_funds_total_bdt'] ?? 0.0) / 10000000).toStringAsFixed(2)} Crore',
                              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                Expanded(
                                  child: Text('Bank Balance: ৳ ${(liq['bank_cash_balance_bdt'] ?? 0.0) / 10000000} Cr', style: const TextStyle(fontSize: 12, color: ManagementTheme.textMuted)),
                                ),
                                Expanded(
                                  child: Text('PDC In Hand: ৳ ${(liq['pdc_cheques_in_hand_bdt'] ?? 0.0) / 10000000} Cr', style: const TextStyle(fontSize: 12, color: ManagementTheme.luxuryGold, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Cashflow Projections Tabs
                    const Text('ROLLING CASH PROJECTIONS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: ManagementTheme.textMuted)),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        _buildHorizonCard('30 Days', proj['receivables_30d_bdt'], proj['payables_30d_bdt'], proj['net_surplus_30d_bdt']),
                        const SizedBox(width: 8),
                        _buildHorizonCard('60 Days', proj['receivables_60d_bdt'], proj['payables_60d_bdt'], proj['net_surplus_60d_bdt']),
                        const SizedBox(width: 8),
                        _buildHorizonCard('90 Days', proj['receivables_90d_bdt'], proj['payables_90d_bdt'], proj['net_surplus_90d_bdt']),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Key Payables
                    const Text('UPCOMING HIGH-VALUE PAYABLES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: ManagementTheme.textMuted)),
                    const SizedBox(height: 10),
                    ...payables.map((p) => Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          color: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: const BorderSide(color: ManagementTheme.borderSubtle),
                          ),
                          child: ListTile(
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(10)),
                              child: const Icon(Icons.outbound, color: ManagementTheme.alertCrimson, size: 20),
                            ),
                            title: Text(p['entity'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: ManagementTheme.royalNavy)),
                            subtitle: Text('${p['category']} • Due ${p['due_date']}', style: const TextStyle(fontSize: 11, color: ManagementTheme.textMuted)),
                            trailing: Text(
                              '৳ ${(p['amount_bdt'] / 100000).toStringAsFixed(1)} L',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: ManagementTheme.alertCrimson),
                            ),
                          ),
                        )),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildHorizonCard(String label, dynamic recv, dynamic pay, dynamic surplus) {
    final recvCr = (recv ?? 0.0) / 10000000;
    final payCr = (pay ?? 0.0) / 10000000;
    final surpCr = (surplus ?? 0.0) / 10000000;

    return Expanded(
      child: Card(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: ManagementTheme.borderSubtle),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy)),
              const SizedBox(height: 8),
              Text('In: +৳${recvCr.toStringAsFixed(1)}Cr', style: const TextStyle(fontSize: 11, color: ManagementTheme.successEmerald, fontWeight: FontWeight.w500)),
              Text('Out: -৳${payCr.toStringAsFixed(1)}Cr', style: const TextStyle(fontSize: 11, color: ManagementTheme.alertCrimson, fontWeight: FontWeight.w500)),
              const Divider(height: 14, color: Color(0xFFF1F5F9)),
              Text('Net: ৳${surpCr.toStringAsFixed(1)}Cr', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy)),
            ],
          ),
        ),
      ),
    );
  }
}
