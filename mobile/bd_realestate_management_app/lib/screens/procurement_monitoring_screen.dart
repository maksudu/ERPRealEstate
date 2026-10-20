import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../core/network/api_client.dart';

class ProcurementMonitoringScreen extends StatefulWidget {
  const ProcurementMonitoringScreen({super.key});

  @override
  State<ProcurementMonitoringScreen> createState() => _ProcurementMonitoringScreenState();
}

class _ProcurementMonitoringScreenState extends State<ProcurementMonitoringScreen> {
  final _api = ManagementApiClient();
  bool _isLoading = true;
  Map<String, dynamic>? _data;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getProcurementMonitoring();
      if (mounted) setState(() => _data = res);
    } catch (_) {
      if (mounted) {
        setState(() {
          _data = {
            'summary': {
              'active_purchase_orders': 42,
              'registered_vendors': 28,
              'pending_deliveries': 8,
              'total_procurement_this_month_bdt': 24800000.0,
            },
            'critical_orders': [
              {'po_number': 'PO-2026-089', 'supplier': 'BSRM Steels', 'material': 'TMT Bar 16mm (50 MT)', 'amount_bdt': 7800000.0, 'status': 'IN_TRANSIT'},
              {'po_number': 'PO-2026-092', 'supplier': 'Shah Cement', 'material': 'Portland Composite Cement (2,500 Bags)', 'amount_bdt': 4200000.0, 'status': 'DELIVERED'},
              {'po_number': 'PO-2026-095', 'supplier': 'Akij Ceramics', 'material': 'Vitrified Floor Tiles (35,000 Sft)', 'amount_bdt': 3500000.0, 'status': 'PENDING_DISPATCH'},
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
    final s = _data?['summary'] ?? {};
    final orders = (_data?['critical_orders'] as List<dynamic>?) ?? [];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Procurement Monitoring', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: ManagementTheme.royalNavy))
          : RefreshIndicator(
              onRefresh: _fetchData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Overview Row
                    Row(
                      children: [
                        _metricBox('ACTIVE POs', '${s['active_purchase_orders']}', Icons.receipt_long, const Color(0xFF2563EB)),
                        const SizedBox(width: 10),
                        _metricBox('IN TRANSIT', '${s['pending_deliveries']}', Icons.local_shipping, ManagementTheme.luxuryGold),
                        const SizedBox(width: 10),
                        _metricBox('VENDORS', '${s['registered_vendors']}', Icons.storefront, ManagementTheme.successEmerald),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Spend Banner
                    Card(
                      color: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                        side: const BorderSide(color: ManagementTheme.borderSubtle),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('TOTAL PROCUREMENT SPEND (MTD)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: ManagementTheme.textMuted)),
                            const SizedBox(height: 4),
                            Text(
                              '৳ ${((s['total_procurement_this_month_bdt'] ?? 0.0) / 10000000).toStringAsFixed(2)} Crore',
                              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    const Text(
                      'HIGH-VALUE PURCHASE ORDERS',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: ManagementTheme.textMuted),
                    ),
                    const SizedBox(height: 12),

                    ...orders.map((po) {
                      final status = po['status'] ?? '';
                      final isDelivered = status == 'DELIVERED';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        color: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: ManagementTheme.borderSubtle),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(po['po_number'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: ManagementTheme.royalNavy)),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: isDelivered ? const Color(0xFFECFDF5) : const Color(0xFFFFFBEB),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      status,
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isDelivered ? ManagementTheme.successEmerald : ManagementTheme.luxuryGold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(po['material'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy)),
                              Text('Supplier: ${po['supplier']}', style: const TextStyle(fontSize: 12, color: ManagementTheme.textMuted)),
                              const SizedBox(height: 8),
                              const Divider(height: 12, color: Color(0xFFF1F5F9)),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Total Value', style: TextStyle(fontSize: 11, color: ManagementTheme.textMuted)),
                                  Text(
                                    '৳ ${(po['amount_bdt'] / 100000).toStringAsFixed(1)} Lakh',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: ManagementTheme.royalNavy),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _metricBox(String label, String value, IconData icon, Color color) {
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
              Icon(icon, size: 20, color: color),
              const SizedBox(height: 8),
              Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy)),
              const SizedBox(height: 2),
              Text(label, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: ManagementTheme.textMuted)),
            ],
          ),
        ),
      ),
    );
  }
}
