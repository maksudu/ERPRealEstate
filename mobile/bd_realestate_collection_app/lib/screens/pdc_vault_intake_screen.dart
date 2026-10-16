import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/collection_theme.dart';
import '../models/pdc_intake.dart';

class PdcVaultIntakeScreen extends StatefulWidget {
  const PdcVaultIntakeScreen({super.key});

  @override
  State<PdcVaultIntakeScreen> createState() => _PdcVaultIntakeScreenState();
}

class _PdcVaultIntakeScreenState extends State<PdcVaultIntakeScreen> {
  final _formKey = GlobalKey<FormState>();

  final _clientCtrl = TextEditingController(text: 'Syed Tanvir Ahmed');
  final _unitCtrl = TextEditingController(text: 'C-4 (Lakeside)');
  final _chequeNoCtrl = TextEditingController(text: 'SB-8819204');
  final _branchCtrl = TextEditingController(text: 'Gulshan Branch');
  final _routingCtrl = TextEditingController(text: '125261389');
  final _amountCtrl = TextEditingController(text: '450000');
  final _barcodeCtrl = TextEditingController(text: 'POUCH-SEC-77419');

  String _selectedBank = 'Islami Bank Bangladesh Ltd';
  DateTime _maturityDate = DateTime.now().add(const Duration(days: 60));
  bool _photoCaptured = true;

  final List<String> _banks = [
    'Islami Bank Bangladesh Ltd',
    'BRAC Bank PLC',
    'Dutch-Bangla Bank PLC',
    'Eastern Bank PLC',
    'The City Bank Ltd',
    'Pubali Bank Ltd',
    'Mutual Trust Bank Ltd',
  ];

  final List<PdcIntake> _vaultList = [
    PdcIntake(
      id: 'PDC-01',
      clientName: 'Engr. Mahbubur Rahman',
      unitNumber: 'A-7 (Green Horizon)',
      chequeNumber: 'EBL-492810',
      bankName: 'Eastern Bank PLC',
      branch: 'Banani',
      routingNumber: '095260472',
      amount: 750000.0,
      maturityDate: DateTime(2026, 11, 15),
      securityPouchBarcode: 'POUCH-SEC-11204',
      intakeDate: DateTime.now().subtract(const Duration(days: 5)),
    ),
    PdcIntake(
      id: 'PDC-02',
      clientName: 'Mrs. Farzana Haque',
      unitNumber: 'B-3 (Green Horizon)',
      chequeNumber: 'DBBL-993821',
      bankName: 'Dutch-Bangla Bank PLC',
      branch: 'Gulshan-2',
      routingNumber: '090261346',
      amount: 320000.0,
      maturityDate: DateTime(2026, 12, 1),
      securityPouchBarcode: 'POUCH-SEC-11205',
      intakeDate: DateTime.now().subtract(const Duration(days: 2)),
    ),
  ];

  @override
  void dispose() {
    _clientCtrl.dispose();
    _unitCtrl.dispose();
    _chequeNoCtrl.dispose();
    _branchCtrl.dispose();
    _routingCtrl.dispose();
    _amountCtrl.dispose();
    _barcodeCtrl.dispose();
    super.dispose();
  }

  void _savePdc() {
    if (!_formKey.currentState!.validate()) return;

    final newPdc = PdcIntake(
      id: 'PDC-${DateTime.now().millisecondsSinceEpoch % 1000}',
      clientName: _clientCtrl.text,
      unitNumber: _unitCtrl.text,
      chequeNumber: _chequeNoCtrl.text,
      bankName: _selectedBank,
      branch: _branchCtrl.text,
      routingNumber: _routingCtrl.text,
      amount: double.tryParse(_amountCtrl.text) ?? 0.0,
      maturityDate: _maturityDate,
      securityPouchBarcode: _barcodeCtrl.text,
      intakeDate: DateTime.now(),
    );

    setState(() {
      _vaultList.insert(0, newPdc);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('PDC #${newPdc.chequeNumber} logged into Secure Vault with Pouch Barcode ${newPdc.securityPouchBarcode}!'),
        backgroundColor: CollectionTheme.primaryEmerald,
      ),
    );

    _chequeNoCtrl.text = 'SB-${DateTime.now().millisecondsSinceEpoch % 90000 + 10000}';
    _barcodeCtrl.text = 'POUCH-SEC-${DateTime.now().millisecondsSinceEpoch % 90000 + 10000}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Post-Dated Cheque (PDC) Vault Intake'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cheque Intake Form
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.lock_clock, color: CollectionTheme.primaryEmerald),
                          SizedBox(width: 8),
                          Text('Cheque & Pouch Registration', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Cheque Photo Capture Banner
                      InkWell(
                        onTap: () {
                          setState(() {
                            _photoCaptured = true;
                          });
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Cheque high-resolution image verified!')),
                          );
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: CollectionTheme.primaryEmerald.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.camera_alt, color: CollectionTheme.primaryEmerald, size: 28),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _photoCaptured ? 'Cheque Front & Back Captured' : 'Tap to Photograph Cheque',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      _photoCaptured ? 'MICR band readable • High Resolution' : 'Camera snapshot for clearing audit trail',
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                    ),
                                  ],
                                ),
                              ),
                              Icon(
                                _photoCaptured ? Icons.check_circle : Icons.arrow_forward_ios,
                                color: _photoCaptured ? CollectionTheme.primaryEmerald : Colors.grey,
                                size: 18,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),

                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _clientCtrl,
                              decoration: const InputDecoration(labelText: 'Client Name', border: OutlineInputBorder()),
                              validator: (v) => v!.isEmpty ? 'Client required' : null,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _unitCtrl,
                              decoration: const InputDecoration(labelText: 'Unit / Project', border: OutlineInputBorder()),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      DropdownButtonFormField<String>(
                        value: _selectedBank,
                        decoration: const InputDecoration(labelText: 'Drawee Bank', border: OutlineInputBorder()),
                        items: _banks.map((b) => DropdownMenuItem(value: b, child: Text(b))).toList(),
                        onChanged: (val) => setState(() => _selectedBank = val!),
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _chequeNoCtrl,
                              decoration: const InputDecoration(labelText: 'Cheque Number', border: OutlineInputBorder()),
                              validator: (v) => v!.isEmpty ? 'Cheque number required' : null,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _branchCtrl,
                              decoration: const InputDecoration(labelText: 'Bank Branch', border: OutlineInputBorder()),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _routingCtrl,
                              keyboardType: TextInputType.number,
                              maxLength: 9,
                              decoration: const InputDecoration(
                                labelText: 'Routing No (9 Digits)',
                                helperText: 'BEFTN / BACPS Clearing',
                                counterText: '',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) {
                                if (v == null || v.isEmpty) return 'Routing required';
                                if (v.length != 9) return 'Must be 9 digits';
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _amountCtrl,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Cheque Amount (BDT)',
                                prefixText: '৳ ',
                                border: OutlineInputBorder(),
                              ),
                              validator: (v) => (double.tryParse(v ?? '') ?? 0) <= 0 ? 'Valid amount required' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () async {
                                final d = await showDatePicker(
                                  context: context,
                                  initialDate: _maturityDate,
                                  firstDate: DateTime.now(),
                                  lastDate: DateTime.now().add(const Duration(days: 730)),
                                );
                                if (d != null) setState(() => _maturityDate = d);
                              },
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'Maturity Date',
                                  border: OutlineInputBorder(),
                                  suffixIcon: Icon(Icons.calendar_month, size: 20),
                                ),
                                child: Text(
                                  DateFormat('dd MMM yyyy').format(_maturityDate),
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _barcodeCtrl,
                              decoration: InputDecoration(
                                labelText: 'Security Pouch Barcode',
                                border: const OutlineInputBorder(),
                                suffixIcon: IconButton(
                                  icon: const Icon(Icons.qr_code_scanner, color: CollectionTheme.primaryEmerald),
                                  onPressed: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Simulated barcode scan: POUCH-SEC-88204')),
                                    );
                                  },
                                ),
                              ),
                              validator: (v) => v!.isEmpty ? 'Pouch barcode required' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _savePdc,
                          icon: const Icon(Icons.archive_outlined),
                          label: const Text('Intake PDC to Physical Vault'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Recently Logged PDCs in Vault
            const Text(
              'SECURED IN PDC VAULT',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 10),

            ..._vaultList.map((pdc) {
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: CollectionTheme.primaryEmerald.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.receipt_long, color: CollectionTheme.primaryEmerald, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(pdc.clientName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text('${pdc.bankName} (${pdc.branch})', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                            Text('Chq #${pdc.chequeNumber} • Routing: ${pdc.routingNumber} • Pouch: ${pdc.securityPouchBarcode}', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '৳ ${pdc.amount.toStringAsFixed(0)}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: CollectionTheme.primaryEmerald),
                          ),
                          Text(
                            'Due: ${DateFormat('dd MMM').format(pdc.maturityDate)}',
                            style: const TextStyle(fontSize: 11, color: Color(0xFFD97706), fontWeight: FontWeight.w600),
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
