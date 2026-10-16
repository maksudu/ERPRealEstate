import 'package:flutter/material.dart';
import '../models/store_grn.dart';
import '../core/theme/app_theme.dart';
import '../core/offline/offline_sync_queue.dart';

class StoreGrnScreen extends StatefulWidget {
  const StoreGrnScreen({super.key});

  @override
  State<StoreGrnScreen> createState() => _StoreGrnScreenState();
}

class _StoreGrnScreenState extends State<StoreGrnScreen> {
  final _challanCtrl = TextEditingController(text: 'CH-2026-9041');
  final _poCtrl = TextEditingController(text: 'PO-2026-BSRM-0442');
  final _truckCtrl = TextEditingController(text: 'DHAKA METRO-TA 11-4890');
  final _driverCtrl = TextEditingController(text: 'Md. Rafiqul Islam');
  final _driverPhoneCtrl = TextEditingController(text: '+8801711993344');
  final _qtyCtrl = TextEditingController(text: '22.5');

  String _selectedSupplier = 'BSRM Steels Ltd';
  String _selectedMaterial = '20mm 500W TMT Deformed Rebar';
  final String _unit = 'MT';

  bool _weighbridgeAttached = true;
  bool _millCertAttached = true;
  bool _physicalPassed = true;
  final bool _challanPhotoScanned = true;

  late List<StoreGrnChallan> _recentGrns;

  @override
  void initState() {
    super.initState();
    _recentGrns = [
      StoreGrnChallan(
        id: 'GRN-01',
        challanNumber: 'BSRM-CH-8891',
        purchaseOrderNumber: 'PO-2026-BSRM-0442',
        truckNumber: 'CHATTO METRO-TA 14-2201',
        supplierName: 'BSRM Steels Ltd',
        materialName: '20mm 500W TMT Rebar',
        quantityReceived: 18.5,
        unitOfMeasure: 'MT',
        receivedDate: DateTime.now().subtract(const Duration(hours: 4)),
        driverName: 'Sultan Ali',
        hasPhysicalInspectionPassed: true,
      ),
      StoreGrnChallan(
        id: 'GRN-02',
        challanNumber: 'SHAH-0492',
        purchaseOrderNumber: 'PO-2026-SHAH-0109',
        truckNumber: 'DHAKA METRO-U 12-5591',
        supplierName: 'Shah Cement Industries',
        materialName: 'Portland Composite Cement (PCC)',
        quantityReceived: 400,
        unitOfMeasure: 'Bags',
        receivedDate: DateTime.now().subtract(const Duration(days: 1)),
        driverName: 'Harun-ur-Rashid',
        hasPhysicalInspectionPassed: true,
      ),
    ];
  }

  @override
  void dispose() {
    _challanCtrl.dispose();
    _poCtrl.dispose();
    _truckCtrl.dispose();
    _driverCtrl.dispose();
    _driverPhoneCtrl.dispose();
    _qtyCtrl.dispose();
    super.dispose();
  }

  void _recordChallan() {
    final grn = StoreGrnChallan(
      id: 'GRN-${DateTime.now().millisecondsSinceEpoch}',
      challanNumber: _challanCtrl.text,
      purchaseOrderNumber: _poCtrl.text,
      truckNumber: _truckCtrl.text,
      supplierName: _selectedSupplier,
      materialName: _selectedMaterial,
      quantityReceived: double.tryParse(_qtyCtrl.text) ?? 0.0,
      unitOfMeasure: _unit,
      receivedDate: DateTime.now(),
      driverName: _driverCtrl.text,
      driverPhone: _driverPhoneCtrl.text,
      hasPhysicalInspectionPassed: _physicalPassed,
      hasWeightBridgeSlipAttached: _weighbridgeAttached,
      hasMillTestCertAttached: _millCertAttached,
      challanPhotoUrl: _challanPhotoScanned ? 'SCANNED-CHALLAN-DOC.JPG' : null,
      isSynced: false,
    );

    OfflineSyncQueue().enqueue('GRN', {
      'challan': grn.challanNumber,
      'po_number': grn.purchaseOrderNumber,
      'truck': grn.truckNumber,
      'supplier': grn.supplierName,
      'material': grn.materialName,
      'qty': grn.quantityReceived,
      'unit': grn.unitOfMeasure,
      'driver': grn.driverName,
      'inspected': grn.hasPhysicalInspectionPassed,
    });

    setState(() {
      _recentGrns.insert(0, grn);
    });

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.inventory_2, color: SiteAppTheme.successGreen),
            SizedBox(width: 8),
            Text('Goods Receipt Note (GRN) Issued!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('GRN Ref: ${grn.id}', style: const TextStyle(fontWeight: FontWeight.bold)),
            Text('Challan No: ${grn.challanNumber}'),
            Text('Matched PO: ${grn.purchaseOrderNumber}', style: const TextStyle(color: SiteAppTheme.successGreen, fontWeight: FontWeight.bold)),
            Text('Material: ${grn.quantityReceived} ${grn.unitOfMeasure} · ${grn.materialName}'),
            Text('Truck: ${grn.truckNumber} (${grn.driverName})'),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: SiteAppTheme.primarySafetyOrange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                '✔ Weighbridge slip verified\n✔ Mill Test Certificate attached\n✔ Stock automatically credited to Site Store',
                style: TextStyle(fontSize: 11, color: SiteAppTheme.darkNavy, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: SiteAppTheme.primarySafetyOrange,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Acknowledge Intake'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Site Store Delivery Challan (GRN)'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quick Challan Intake Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Incoming Truck Challan Intake',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: SiteAppTheme.darkNavy),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: SiteAppTheme.successGreen.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.verified, size: 12, color: SiteAppTheme.successGreen),
                            SizedBox(width: 4),
                            Text('PO Matched', style: TextStyle(color: SiteAppTheme.successGreen, fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _challanCtrl,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          decoration: const InputDecoration(labelText: 'Delivery Challan No.', border: OutlineInputBorder()),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _poCtrl,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: SiteAppTheme.primarySafetyOrange),
                          decoration: const InputDecoration(labelText: 'Purchase Order No.', border: OutlineInputBorder()),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _truckCtrl,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          decoration: const InputDecoration(labelText: 'Truck License Plate', border: OutlineInputBorder()),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _driverCtrl,
                          style: const TextStyle(fontSize: 13),
                          decoration: const InputDecoration(labelText: 'Driver Full Name', border: OutlineInputBorder()),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  DropdownButtonFormField<String>(
                    value: _selectedSupplier,
                    decoration: const InputDecoration(labelText: 'Verified Material Supplier', border: OutlineInputBorder()),
                    items: [
                      'BSRM Steels Ltd',
                      'Shah Cement Industries',
                      'Heidelberg Materials Bangladesh',
                      'Bashundhara Ready Mix Concrete',
                    ].map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 13)))).toList(),
                    onChanged: (v) => setState(() => _selectedSupplier = v!),
                  ),
                  const SizedBox(height: 10),

                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: DropdownButtonFormField<String>(
                          value: _selectedMaterial,
                          decoration: const InputDecoration(labelText: 'Material Catalog Description', border: OutlineInputBorder()),
                          items: [
                            '20mm 500W TMT Deformed Rebar',
                            '16mm 500W TMT Deformed Rebar',
                            'Portland Composite Cement (PCC)',
                            'Stone Aggregate (3/4 down graded)',
                          ].map((m) => DropdownMenuItem(value: m, child: Text(m, style: const TextStyle(fontSize: 12)))).toList(),
                          onChanged: (v) => setState(() => _selectedMaterial = v!),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        flex: 1,
                        child: TextField(
                          controller: _qtyCtrl,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          decoration: InputDecoration(
                            labelText: 'Qty Received',
                            suffixText: _unit,
                            border: const OutlineInputBorder(),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Material Quality Gate Checklist
                  const Text('Physical Quality Gate Verification:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 6),
                  Material(
                    color: Colors.transparent,
                    child: Column(
                      children: [
                        CheckboxListTile(
                          value: _weighbridgeAttached,
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Certified Weighbridge Slip Attached', style: TextStyle(fontSize: 12)),
                          activeColor: SiteAppTheme.primarySafetyOrange,
                          onChanged: (v) => setState(() => _weighbridgeAttached = v!),
                        ),
                        CheckboxListTile(
                          value: _millCertAttached,
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Mill Test Certificate (MTC) & Heat Number Tagged', style: TextStyle(fontSize: 12)),
                          activeColor: SiteAppTheme.primarySafetyOrange,
                          onChanged: (v) => setState(() => _millCertAttached = v!),
                        ),
                        CheckboxListTile(
                          value: _physicalPassed,
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: const Text('Physical Inspection: No rust, moisture, or damage', style: TextStyle(fontSize: 12)),
                          activeColor: SiteAppTheme.primarySafetyOrange,
                          onChanged: (v) => setState(() => _physicalPassed = v!),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.qr_code_scanner),
                      label: const Text('Scan Challan & Issue Store GRN', style: TextStyle(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: SiteAppTheme.primarySafetyOrange,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _recordChallan,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Recent GRN Challans
            const Text(
              'Recent Site Store Deliveries',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: SiteAppTheme.darkNavy),
            ),
            const SizedBox(height: 10),

            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _recentGrns.length,
              itemBuilder: (context, index) {
                final item = _recentGrns[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: SiteAppTheme.primarySafetyOrange.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.local_shipping, color: SiteAppTheme.primarySafetyOrange, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(item.challanNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                Text(
                                  '${item.quantityReceived} ${item.unitOfMeasure}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: SiteAppTheme.primarySafetyOrange),
                                ),
                              ],
                            ),
                            Text('${item.supplierName} · ${item.materialName}', style: TextStyle(fontSize: 11, color: Colors.grey.shade700)),
                            Text('Truck: ${item.truckNumber} (Driver: ${item.driverName})', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
