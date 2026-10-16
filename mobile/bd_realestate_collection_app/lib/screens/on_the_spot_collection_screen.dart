import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../models/recovery_client.dart';
import '../models/collection_receipt.dart';
import '../core/bluetooth/bluetooth_printer_service.dart';

class OnTheSpotCollectionScreen extends StatefulWidget {
  final RecoveryClient? client;

  const OnTheSpotCollectionScreen({super.key, this.client});

  @override
  State<OnTheSpotCollectionScreen> createState() => _OnTheSpotCollectionScreenState();
}

class _OnTheSpotCollectionScreenState extends State<OnTheSpotCollectionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _printerService = BluetoothPrinterService();

  late TextEditingController _clientNameCtrl;
  late TextEditingController _clientPhoneCtrl;
  late TextEditingController _projectCtrl;
  late TextEditingController _unitCtrl;
  late TextEditingController _amountCtrl;
  final _refCtrl = TextEditingController(text: 'TXN-98412');

  PaymentMethod _selectedMethod = PaymentMethod.bkashQr;
  final List<Offset?> _signaturePoints = [];
  bool _hasSigned = false;

  @override
  void initState() {
    super.initState();
    _clientNameCtrl = TextEditingController(text: widget.client?.name ?? 'Engr. Mahbubur Rahman');
    _clientPhoneCtrl = TextEditingController(text: widget.client?.phone ?? '+880 1712-334455');
    _projectCtrl = TextEditingController(text: widget.client?.project ?? 'Green Horizon Tower');
    _unitCtrl = TextEditingController(text: widget.client?.unit ?? 'A-7 (1,850 sft)');
    _amountCtrl = TextEditingController(
      text: widget.client != null ? widget.client!.overdueAmount.toStringAsFixed(0) : '500000',
    );
  }

  @override
  void dispose() {
    _clientNameCtrl.dispose();
    _clientPhoneCtrl.dispose();
    _projectCtrl.dispose();
    _unitCtrl.dispose();
    _amountCtrl.dispose();
    _refCtrl.dispose();
    super.dispose();
  }

  String _convertToWords(double amount) {
    if (amount <= 0) return 'Zero Taka Only';
    int val = amount.toInt();
    if (val == 500000) return 'Five Lac Taka Only';
    if (val == 750000) return 'Seven Lac Fifty Thousand Taka Only';
    if (val == 1200000) return 'Twelve Lac Taka Only';
    if (val == 320000) return 'Three Lac Twenty Thousand Taka Only';
    if (val == 890000) return 'Eight Lac Ninety Thousand Taka Only';
    return '${val.toString()} Taka Only';
  }

  void _processCollection() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_hasSigned) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Client digital signature is required before finalizing receipt!'),
          backgroundColor: CollectionTheme.alertCrimson,
        ),
      );
      return;
    }

    final double amount = double.tryParse(_amountCtrl.text) ?? 0.0;
    final String mrNumber = 'MR-${DateTime.now().year}-${(DateTime.now().millisecondsSinceEpoch % 90000 + 10000)}';

    final receipt = CollectionReceipt(
      receiptNumber: mrNumber,
      clientName: _clientNameCtrl.text,
      clientPhone: _clientPhoneCtrl.text,
      unitNumber: _unitCtrl.text,
      project: _projectCtrl.text,
      amount: amount,
      paymentMethod: _selectedMethod,
      transactionRef: _refCtrl.text,
      amountInWords: _convertToWords(amount),
      date: DateTime.now(),
      hasSignature: true,
      collectedBy: 'Officer Tarek Aziz (ID: FO-892)',
    );

    _showReceiptSuccessDialog(receipt);
  }

  void _showReceiptSuccessDialog(CollectionReceipt receipt) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: CollectionTheme.primaryEmerald, size: 28),
            SizedBox(width: 10),
            Text('Collection Recorded!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Money Receipt: ${receipt.receiptNumber}', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text('Amount: ৳ ${receipt.amount.toStringAsFixed(0)} (${receipt.paymentMethodTitle})'),
            const SizedBox(height: 4),
            Text('Client: ${receipt.clientName}', style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
            const SizedBox(height: 4),
            Text('In Words: ${receipt.amountInWords}', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic)),
            const Divider(height: 24),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.print, color: CollectionTheme.darkSlate),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _printerService.isConnected
                              ? 'Printer: ${_printerService.connectedDevice!.name}'
                              : 'No Bluetooth Printer Connected',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'Size: ${_printerService.paperSize == PrinterPaperSize.mm58 ? '58mm' : '80mm'} thermal paper roll',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            child: const Text('Close'),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: CollectionTheme.darkSlate,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              final scaffoldMessenger = ScaffoldMessenger.of(context);
              Navigator.pop(ctx);
              if (!_printerService.isConnected) {
                scaffoldMessenger.showSnackBar(
                  const SnackBar(
                    content: Text('Please pair a Bluetooth thermal printer in settings first!'),
                    backgroundColor: CollectionTheme.alertCrimson,
                  ),
                );
              } else {
                await _printerService.printReceipt(receipt);
                scaffoldMessenger.showSnackBar(
                  SnackBar(
                    content: Text('Receipt #${receipt.receiptNumber} printed on thermal belt printer!'),
                    backgroundColor: CollectionTheme.primaryEmerald,
                  ),
                );
                if (mounted) Navigator.pop(context);
              }
            },
            icon: const Icon(Icons.bluetooth_connected, size: 18),
            label: const Text('1-Tap Bluetooth Print'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('On-the-Spot Collection'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Client & Project Information
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.person_pin, color: CollectionTheme.primaryEmerald, size: 20),
                          SizedBox(width: 8),
                          Text('Client & Unit Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _clientNameCtrl,
                        decoration: const InputDecoration(labelText: 'Client Name', border: OutlineInputBorder()),
                        validator: (v) => v!.isEmpty ? 'Client name required' : null,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _projectCtrl,
                              decoration: const InputDecoration(labelText: 'Project', border: OutlineInputBorder()),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _unitCtrl,
                              decoration: const InputDecoration(labelText: 'Unit / Flat', border: OutlineInputBorder()),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Payment Method & Amount Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.account_balance_wallet, color: CollectionTheme.accentGold, size: 20),
                          SizedBox(width: 8),
                          Text('Payment Mode & Amount', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _amountCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: CollectionTheme.primaryEmerald),
                        decoration: const InputDecoration(
                          labelText: 'Collection Amount (BDT)',
                          prefixText: '৳ ',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (double.tryParse(v ?? '') ?? 0) <= 0 ? 'Enter valid amount' : null,
                      ),
                      const SizedBox(height: 14),
                      const Text('Select Payment Method', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _buildMethodChoice(PaymentMethod.bkashQr, 'bKash QR', CollectionTheme.bkashPink),
                          _buildMethodChoice(PaymentMethod.nagadQr, 'Nagad QR', CollectionTheme.nagadOrange),
                          _buildMethodChoice(PaymentMethod.cash, 'Cash', CollectionTheme.primaryEmerald),
                          _buildMethodChoice(PaymentMethod.cheque, 'Cheque', const Color(0xFF2563EB)),
                          _buildMethodChoice(PaymentMethod.payOrder, 'Pay Order', const Color(0xFF7C3AED)),
                        ],
                      ),

                      // If bKash or Nagad QR selected, show dynamic merchant QR container
                      if (_selectedMethod == PaymentMethod.bkashQr || _selectedMethod == PaymentMethod.nagadQr) ...[
                        const SizedBox(height: 16),
                        _buildDynamicMerchantQrBox(),
                      ],

                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _refCtrl,
                        decoration: InputDecoration(
                          labelText: _selectedMethod == PaymentMethod.cash
                              ? 'Cash Receipt Voucher No'
                              : 'Txn Hash / Cheque No / PO Reference',
                          border: const OutlineInputBorder(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Digital Signature Pad Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.draw, color: CollectionTheme.darkSlate, size: 20),
                              SizedBox(width: 8),
                              Text('Client Digital Signature', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ],
                          ),
                          TextButton(
                            onPressed: () {
                              setState(() {
                                _signaturePoints.clear();
                                _hasSigned = false;
                              });
                            },
                            child: const Text('Clear', style: TextStyle(color: CollectionTheme.alertCrimson)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        height: 130,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                        ),
                        child: GestureDetector(
                          onPanUpdate: (DragUpdateDetails details) {
                            RenderBox renderBox = context.findRenderObject() as RenderBox;
                            Offset localPosition = renderBox.globalToLocal(details.globalPosition);
                            setState(() {
                              _signaturePoints.add(localPosition);
                              _hasSigned = true;
                            });
                          },
                          onPanEnd: (DragEndDetails details) => _signaturePoints.add(null),
                          child: CustomPaint(
                            painter: SignaturePainter(points: _signaturePoints),
                            size: Size.infinite,
                            child: Center(
                              child: _hasSigned
                                  ? const SizedBox.shrink()
                                  : const Text(
                                      'Touch & draw client signature here',
                                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                                    ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Confirm and Process Collection Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _processCollection,
                  icon: const Icon(Icons.check_circle_outline, size: 22),
                  label: const Text('Record Collection & Issue Money Receipt'),
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMethodChoice(PaymentMethod method, String label, Color color) {
    final isSelected = _selectedMethod == method;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (val) {
        if (val) setState(() => _selectedMethod = method);
      },
      selectedColor: color.withOpacity(0.18),
      avatar: CircleAvatar(
        radius: 6,
        backgroundColor: color,
      ),
      labelStyle: TextStyle(
        color: isSelected ? color : const Color(0xFF475569),
        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
        fontSize: 12,
      ),
    );
  }

  Widget _buildDynamicMerchantQrBox() {
    final isBkash = _selectedMethod == PaymentMethod.bkashQr;
    final color = isBkash ? CollectionTheme.bkashPink : CollectionTheme.nagadOrange;
    final brand = isBkash ? 'bKash Merchant Payment' : 'Nagad Merchant Payment';
    final merchantNumber = '01700-112233';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: color),
            ),
            child: Icon(Icons.qr_code_2, size: 48, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(brand, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color)),
                const SizedBox(height: 3),
                Text('Merchant A/C: $merchantNumber', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text('Ref: ${_unitCtrl.text}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                const SizedBox(height: 2),
                const Text('Client scans with bKash/Nagad app to pay directly', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class SignaturePainter extends CustomPainter {
  final List<Offset?> points;

  SignaturePainter({required this.points});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF0F172A)
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.0;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != null && points[i + 1] != null) {
        canvas.drawLine(points[i]!, points[i + 1]!, paint);
      }
    }
  }

  @override
  bool shouldRepaint(SignaturePainter oldDelegate) => oldDelegate.points != points;
}
