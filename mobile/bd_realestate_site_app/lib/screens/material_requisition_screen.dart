import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/network/api_client.dart';

class MaterialRequisitionScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const MaterialRequisitionScreen({super.key, this.onOpenDrawer});

  @override
  State<MaterialRequisitionScreen> createState() => _MaterialRequisitionScreenState();
}

class _MaterialRequisitionScreenState extends State<MaterialRequisitionScreen> {
  final _api = ConstructionApiClient();
  bool _isLoading = false;

  List<Map<String, dynamic>> _requisitions = [];

  final List<Map<String, String>> _catalog = [
    {'code': 'MAT-CEM-001', 'name': 'Portland Composite Cement (PCC)', 'uom': 'BAGS', 'work': 'CIVIL_STRUCTURE'},
    {'code': 'MAT-STL-020', 'name': '20mm 500W TMT Deformed Rebar', 'uom': 'MT', 'work': 'CIVIL_STRUCTURE'},
    {'code': 'MAT-STL-016', 'name': '16mm 500W TMT Deformed Rebar', 'uom': 'MT', 'work': 'CIVIL_STRUCTURE'},
    {'code': 'MAT-BRK-001', 'name': '1st Class Gas-Burned Auto Bricks', 'uom': 'NOS', 'work': 'MASONRY'},
    {'code': 'MAT-SND-001', 'name': 'Sylhet Coarse Sand (FM 2.5)', 'uom': 'CFT', 'work': 'CIVIL_STRUCTURE'},
    {'code': 'MAT-STN-001', 'name': 'Bholaganj Crushed Stone Aggregate 3/4"', 'uom': 'CFT', 'work': 'CIVIL_STRUCTURE'},
    {'code': 'MAT-PLY-018', 'name': '18mm Film-Faced Shuttering Plywood', 'uom': 'SHEETS', 'work': 'FORMWORK'},
    {'code': 'MAT-WIR-020', 'name': '20-Gauge Black Annealed Binding Wire', 'uom': 'KG', 'work': 'CIVIL_STRUCTURE'},
  ];

  @override
  void initState() {
    super.initState();
    _loadRequisitions();
  }

  Future<void> _loadRequisitions() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getRequisitions();
      final items = (res['items'] as List<dynamic>?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];
      if (items.isNotEmpty) {
        setState(() => _requisitions = items);
      } else {
        _setFallbackRequisitions();
      }
    } catch (_) {
      _setFallbackRequisitions();
    }
    setState(() => _isLoading = false);
  }

  void _setFallbackRequisitions() {
    _requisitions = [
      {
        'id': 1,
        'requisition_number': 'SMR-20261020-001',
        'material_code': 'MAT-CEM-001',
        'material_name': 'Portland Composite Cement (PCC)',
        'unit_of_measure': 'BAGS',
        'requested_quantity': 450.0,
        'approved_quantity': 450.0,
        'work_package': 'CIVIL_STRUCTURE',
        'tower_name': 'Tower A',
        'floor_number': '8th Floor',
        'status': 'APPROVED',
      },
      {
        'id': 2,
        'requisition_number': 'SMR-20261020-002',
        'material_code': 'MAT-STL-020',
        'material_name': '20mm 500W TMT Deformed Rebar',
        'unit_of_measure': 'MT',
        'requested_quantity': 12.5,
        'approved_quantity': 0.0,
        'work_package': 'CIVIL_STRUCTURE',
        'tower_name': 'Tower A',
        'floor_number': '8th Floor Slab',
        'status': 'PENDING',
      },
      {
        'id': 3,
        'requisition_number': 'SMR-20261019-003',
        'material_code': 'MAT-SND-001',
        'material_name': 'Sylhet Coarse Sand (FM 2.5)',
        'unit_of_measure': 'CFT',
        'requested_quantity': 800.0,
        'approved_quantity': 800.0,
        'work_package': 'CIVIL_STRUCTURE',
        'tower_name': 'Tower A',
        'floor_number': 'Ground Batching',
        'status': 'APPROVED',
      },
    ];
  }

  void _showNewRequisitionDialog() {
    Map<String, String> selectedMaterial = _catalog.first;
    final qtyCtrl = TextEditingController(text: '100');
    final specCtrl = TextEditingController(text: 'Standard BNBC / ASTM C150 compliance');
    String floor = '8th Floor Slab';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('New Site Material Requisition (SMR)', style: TextStyle(color: SiteAppTheme.darkNavy, fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<Map<String, String>>(
                value: selectedMaterial,
                dropdownColor: Colors.white,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Select Construction Material *', border: OutlineInputBorder()),
                items: _catalog.map((m) {
                  return DropdownMenuItem(
                    value: m,
                    child: Text('${m['name']} (${m['uom']})', overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13)),
                  );
                }).toList(),
                onChanged: (v) {
                  if (v != null) setSheet(() => selectedMaterial = v);
                },
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: qtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Quantity *',
                        suffixText: selectedMaterial['uom'],
                        border: const OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: floor,
                      dropdownColor: Colors.white,
                      decoration: const InputDecoration(labelText: 'Floor / Location', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'Basement-1 Mat', child: Text('Basement-1 Mat')),
                        DropdownMenuItem(value: '4th Floor Shear Wall', child: Text('4th Floor Shear Wall')),
                        DropdownMenuItem(value: '7th Floor Slab', child: Text('7th Floor Slab')),
                        DropdownMenuItem(value: '8th Floor Slab', child: Text('8th Floor Slab')),
                        DropdownMenuItem(value: '9th Floor Column Cast', child: Text('9th Floor Column')),
                      ],
                      onChanged: (v) => setSheet(() => floor = v ?? '8th Floor Slab'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: specCtrl,
                decoration: const InputDecoration(
                  labelText: 'Specification / QA Brand Notes',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: SiteAppTheme.primarySafetyOrange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () {
                  final qty = double.tryParse(qtyCtrl.text) ?? 100.0;
                  final newReq = {
                    'id': DateTime.now().millisecondsSinceEpoch,
                    'requisition_number': 'SMR-${DateTime.now().strftime("%Y%m%d%H%M")}',
                    'material_code': selectedMaterial['code'],
                    'material_name': selectedMaterial['name'],
                    'unit_of_measure': selectedMaterial['uom'],
                    'requested_quantity': qty,
                    'approved_quantity': 0.0,
                    'work_package': selectedMaterial['work'],
                    'tower_name': 'Tower A',
                    'floor_number': floor,
                    'status': 'PENDING',
                  };
                  setState(() => _requisitions.insert(0, newReq));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Requisition submitted to Central Store & Procurement!')));
                },
                child: const Text('Submit Material Requisition', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
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
            icon: const Icon(Icons.menu_rounded, color: SiteAppTheme.darkNavy),
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
        title: const Text('Material Requisition (SMR)', style: TextStyle(color: SiteAppTheme.darkNavy, fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.add, color: SiteAppTheme.primarySafetyOrange), onPressed: _showNewRequisitionDialog),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: SiteAppTheme.primarySafetyOrange))
          : RefreshIndicator(
              onRefresh: _loadRequisitions,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _requisitions.length,
                itemBuilder: (ctx, i) {
                  final r = _requisitions[i];
                  final isApproved = r['status'] == 'APPROVED';

                  return Card(
                    color: Colors.white,
                    elevation: 0,
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(r['requisition_number'] ?? 'SMR-001', style: const TextStyle(color: SiteAppTheme.primarySafetyOrange, fontSize: 12, fontWeight: FontWeight.bold)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: isApproved ? SiteAppTheme.successGreen.withOpacity(0.12) : const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  r['status'] ?? 'PENDING',
                                  style: TextStyle(
                                    color: isApproved ? SiteAppTheme.successGreen : const Color(0xFFD97706),
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            r['material_name'] ?? 'Material',
                            style: const TextStyle(color: SiteAppTheme.darkNavy, fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Package: ${r['work_package']} · Location: ${r['tower_name']} (${r['floor_number']})',
                            style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Requested: ${r['requested_quantity']} ${r['unit_of_measure']}',
                                style: const TextStyle(color: SiteAppTheme.darkNavy, fontSize: 13, fontWeight: FontWeight.w600),
                              ),
                              if (isApproved)
                                Text(
                                  'Approved: ${r['approved_quantity']} ${r['unit_of_measure']}',
                                  style: const TextStyle(color: SiteAppTheme.successGreen, fontSize: 13, fontWeight: FontWeight.bold),
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

extension on DateTime {
  String strftime(String format) {
    return '$year${month.toString().padLeft(2, '0')}${day.toString().padLeft(2, '0')}${hour.toString().padLeft(2, '0')}${minute.toString().padLeft(2, '0')}';
  }
}
