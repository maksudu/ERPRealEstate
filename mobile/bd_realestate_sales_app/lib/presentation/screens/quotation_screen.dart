import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';

class QuotationScreen extends StatefulWidget {
  final Map<String, dynamic>? initialUnit;

  const QuotationScreen({super.key, this.initialUnit});

  @override
  State<QuotationScreen> createState() => _QuotationScreenState();
}

class _QuotationScreenState extends State<QuotationScreen> {
  final _api = ApiClient();
  bool _isLoading = false;
  List<dynamic> _quotations = [];

  @override
  void initState() {
    super.initState();
    _loadQuotations();
    if (widget.initialUnit != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _showGenerateQuoteSheet(widget.initialUnit!);
      });
    }
  }

  Future<void> _loadQuotations() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getQuotations();
      setState(() => _quotations = res);
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  void _showGenerateQuoteSheet([Map<String, dynamic>? unit]) {
    final customerName = TextEditingController();
    final customerPhone = TextEditingController();
    final customerEmail = TextEditingController();
    final ratePerSqft = TextEditingController(
      text: unit != null ? '${unit['effective_rate_per_sqft'] ?? unit['base_rate_per_sqft'] ?? 12500}' : '12500',
    );
    final parkingCharge = TextEditingController(text: '${unit?['parking_charge'] ?? 500000}');
    final discountPct = TextEditingController(text: '0');

    double netTotal = (unit != null ? ((unit['total_unit_price'] ?? 0).toDouble()) : 15000000.0);
    double area = unit != null ? (unit['gross_saleable_area_sqft'] ?? 1500).toDouble() : 1500.0;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          void recalculate() {
            final rate = double.tryParse(ratePerSqft.text.trim()) ?? 0;
            final park = double.tryParse(parkingCharge.text.trim()) ?? 0;
            final disc = double.tryParse(discountPct.text.trim()) ?? 0;
            final base = area * rate;
            final discAmount = base * (disc / 100);
            setSheetState(() {
              netTotal = base + park - discAmount;
            });
          }

          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        unit != null ? 'Quote for Unit ${unit['unit_number']}' : 'Generate Quotation',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 17, fontWeight: FontWeight.bold),
                      ),
                      IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: customerName,
                    style: const TextStyle(color: Color(0xFF0F172A)),
                    decoration: const InputDecoration(labelText: 'Customer Name *', labelStyle: TextStyle(color: Color(0xFF64748B))),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: customerPhone,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(color: Color(0xFF0F172A)),
                    decoration: const InputDecoration(labelText: 'Customer Phone *', labelStyle: TextStyle(color: Color(0xFF64748B))),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: customerEmail,
                    keyboardType: TextInputType.emailAddress,
                    style: const TextStyle(color: Color(0xFF0F172A)),
                    decoration: const InputDecoration(labelText: 'Customer Email', labelStyle: TextStyle(color: Color(0xFF64748B))),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: ratePerSqft,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(color: Color(0xFF0F172A)),
                          onChanged: (_) => recalculate(),
                          decoration: const InputDecoration(labelText: 'Rate / sqft (BDT)', labelStyle: TextStyle(color: Color(0xFF64748B))),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: parkingCharge,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(color: Color(0xFF0F172A)),
                          onChanged: (_) => recalculate(),
                          decoration: const InputDecoration(labelText: 'Parking (BDT)', labelStyle: TextStyle(color: Color(0xFF64748B))),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: discountPct,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: Color(0xFF0F172A)),
                    onChanged: (_) => recalculate(),
                    decoration: const InputDecoration(labelText: 'Discount % (e.g. 2.5)', labelStyle: TextStyle(color: Color(0xFF64748B))),
                  ),
                  const SizedBox(height: 14),

                  // Net Payable Preview Card
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Net Total Price:', style: TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.bold)),
                        Text(
                          CurrencyFormatter.formatBDT(netTotal),
                          style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryTeal,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: () async {
                      if (customerName.text.trim().isEmpty || customerPhone.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Customer name and phone are required.')));
                        return;
                      }
                      try {
                        await _api.createQuotation({
                          'unit_id': unit != null ? unit['id'] : 1,
                          'customer_name': customerName.text.trim(),
                          'customer_phone': customerPhone.text.trim(),
                          'customer_email': customerEmail.text.trim().isEmpty ? null : customerEmail.text.trim(),
                          'rate_per_sqft': double.tryParse(ratePerSqft.text.trim()),
                          'parking_charge': double.tryParse(parkingCharge.text.trim()),
                          'discount_pct': double.tryParse(discountPct.text.trim()),
                          'valid_days': 15,
                        });
                        if (mounted) {
                          Navigator.pop(ctx);
                          _loadQuotations();
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Quotation generated successfully with PDF!')));
                        }
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                      }
                    },
                    child: const Text('Save & Issue Quotation', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          );
        },
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
        title: const Text('Quotation Management', style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.add, color: AppTheme.primaryTeal), onPressed: () => _showGenerateQuoteSheet()),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
          : _quotations.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.request_quote_outlined, color: Colors.grey, size: 48),
                      const SizedBox(height: 12),
                      const Text('No quotations generated yet', style: TextStyle(color: Colors.grey)),
                      const SizedBox(height: 12),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('Create New Quotation'),
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal),
                        onPressed: () => _showGenerateQuoteSheet(),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadQuotations,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _quotations.length,
                    itemBuilder: (ctx, i) {
                      final q = _quotations[i];
                      return Card(
                        color: Colors.white,
                        elevation: 0,
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    q['quotation_number'] ?? 'QT-2026',
                                    style: const TextStyle(color: AppTheme.primaryTeal, fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF10B981).withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      q['status'] ?? 'ISSUED',
                                      style: const TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                '${q['customer_name'] ?? 'Customer'} · ${q['customer_phone'] ?? '-'}',
                                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                              Text(
                                'Unit ${q['unit_code'] ?? '-'} · Area ${q['chargeable_area_sqft'] ?? 0} sqft',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                              ),
                              const Divider(color: Color(0xFFE2E8F0), height: 16),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Net Total Amount', style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                      Text(
                                        CurrencyFormatter.formatBDT((q['net_total_price'] ?? 0).toDouble()),
                                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                  OutlinedButton.icon(
                                    icon: const Icon(Icons.picture_as_pdf, size: 14),
                                    label: const Text('PDF Report', style: TextStyle(fontSize: 11)),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppTheme.primaryTeal,
                                      side: const BorderSide(color: AppTheme.primaryTeal),
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    ),
                                    onPressed: () {
                                      final url = _api.getQuotationPdfUrl(q['id']);
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Opening quotation PDF: $url')),
                                      );
                                    },
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
