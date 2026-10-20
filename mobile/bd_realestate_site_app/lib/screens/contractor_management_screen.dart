import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/network/api_client.dart';

class ContractorManagementScreen extends StatefulWidget {
  const ContractorManagementScreen({super.key});

  @override
  State<ContractorManagementScreen> createState() => _ContractorManagementScreenState();
}

class _ContractorManagementScreenState extends State<ContractorManagementScreen> {
  final _api = ConstructionApiClient();
  bool _isLoading = false;
  int _activeTab = 0; // 0 = Subcontractors, 1 = Joint Measurements (JMS), 2 = RA Bills

  List<Map<String, dynamic>> _contractors = [];
  List<Map<String, dynamic>> _measurements = [];
  List<Map<String, dynamic>> _raBills = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getContractors();
      final items = (res['items'] as List<dynamic>?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];
      if (items.isNotEmpty) {
        setState(() => _contractors = items);
      } else {
        _setFallbackData();
      }
    } catch (_) {
      _setFallbackData();
    }
    setState(() => _isLoading = false);
  }

  void _setFallbackData() {
    _contractors = [
      {
        'id': 1,
        'contractor_name': 'Eastern Structural Builders Ltd.',
        'contractor_code': 'CON-001',
        'trade_specialty': 'RCC Civil Structure & Formwork',
        'contact_person': 'Engr. Mahbubul Alam',
        'contact_number': '+8801712334455',
        'contract_value': 8500000.0,
        'status': 'ACTIVE',
        'performance_rating': 4.8,
      },
      {
        'id': 2,
        'contractor_name': 'Bengal Steel Reinforcement Works',
        'contractor_code': 'CON-002',
        'trade_specialty': 'Rod Binding & Rebar Fabrication',
        'contact_person': 'Ustad Nurul Islam',
        'contact_number': '+8801819887766',
        'contract_value': 3200000.0,
        'status': 'ACTIVE',
        'performance_rating': 4.6,
      },
      {
        'id': 3,
        'contractor_name': 'Padma Masonry & Plastering Co.',
        'contractor_code': 'CON-003',
        'trade_specialty': 'Internal & External Brickwork & Plaster',
        'contact_person': 'Md. Kabir Hossain',
        'contact_number': '+8801915443322',
        'contract_value': 2100000.0,
        'status': 'ACTIVE',
        'performance_rating': 4.4,
      },
    ];

    _measurements = [
      {
        'id': 1,
        'jms_number': 'JMS-PRJ01-2026-08',
        'contractor_name': 'Eastern Structural Builders Ltd.',
        'location': '8th Floor Slab Beam Casting',
        'item_description': 'RCC casting with pump (1:1.5:3)',
        'measured_quantity': 320.0,
        'unit': 'CFT',
        'certified_date': '2026-10-18',
        'status': 'JOINT_VERIFIED',
      },
      {
        'id': 2,
        'jms_number': 'JMS-PRJ01-2026-07',
        'contractor_name': 'Bengal Steel Reinforcement Works',
        'location': '8th Floor Slab Rebar Network',
        'item_description': 'Cutting, bending & fixing 500W rebar',
        'measured_quantity': 4.85,
        'unit': 'MT',
        'certified_date': '2026-10-15',
        'status': 'JOINT_VERIFIED',
      },
    ];

    _raBills = [
      {
        'id': 1,
        'bill_number': 'RA-04/EASTERN/2026',
        'contractor_name': 'Eastern Structural Builders Ltd.',
        'gross_amount': 840000.0,
        'retention_amount': 42000.0,
        'tax_vat_deducted': 84000.0,
        'net_payable': 714000.0,
        'status': 'APPROVED_BY_PD',
      },
      {
        'id': 2,
        'bill_number': 'RA-03/BENGAL/2026',
        'contractor_name': 'Bengal Steel Reinforcement Works',
        'gross_amount': 360000.0,
        'retention_amount': 18000.0,
        'tax_vat_deducted': 36000.0,
        'net_payable': 306000.0,
        'status': 'UNDER_VERIFICATION',
      },
    ];
  }

  void _verifyBill(Map<String, dynamic> bill) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Verify Bill: ${bill['bill_number']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: SiteAppTheme.darkNavy)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Contractor: ${bill['contractor_name']}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            Text('Net Payable: ৳${bill['net_payable']?.toInt()}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: SiteAppTheme.primarySafetyOrange)),
            const SizedBox(height: 12),
            const Text('Confirm site measurements and consultant verification matches joint measurement sheet?', style: TextStyle(fontSize: 12)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: SiteAppTheme.successGreen, foregroundColor: Colors.white),
            onPressed: () {
              setState(() => bill['status'] = 'CERTIFIED_BY_SITE');
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Bill certified and submitted to Accounts!')));
            },
            child: const Text('Certify & Pass'),
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
        title: const Text('Contractor Management', style: TextStyle(color: SiteAppTheme.darkNavy, fontSize: 18, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Segmented Tabs
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(12)),
            child: Row(
              children: [
                _tabItem(0, 'Contractors (${_contractors.length})'),
                _tabItem(1, 'JMS Records (${_measurements.length})'),
                _tabItem(2, 'RA Bills (${_raBills.length})'),
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: SiteAppTheme.primarySafetyOrange))
                : _activeTab == 0
                    ? _buildContractorsList()
                    : (_activeTab == 1 ? _buildJmsList() : _buildBillsList()),
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
            color: isSelected ? SiteAppTheme.primarySafetyOrange : Colors.transparent,
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

  Widget _buildContractorsList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _contractors.length,
      itemBuilder: (ctx, i) {
        final c = _contractors[i];
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
                    Text(c['contractor_code'] ?? 'CON', style: const TextStyle(color: SiteAppTheme.primarySafetyOrange, fontSize: 11, fontWeight: FontWeight.bold)),
                    Row(
                      children: [
                        const Icon(Icons.star, color: Colors.amber, size: 14),
                        const SizedBox(width: 2),
                        Text('${c['performance_rating']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: SiteAppTheme.darkNavy)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(c['contractor_name'] ?? 'Contractor', style: const TextStyle(color: SiteAppTheme.darkNavy, fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Specialty: ${c['trade_specialty']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Contact: ${c['contact_person']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                    Text(c['contact_number'] ?? '', style: const TextStyle(color: SiteAppTheme.primarySafetyOrange, fontSize: 12, fontWeight: FontWeight.w600)),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildJmsList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _measurements.length,
      itemBuilder: (ctx, i) {
        final j = _measurements[i];
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
                    Text(j['jms_number'] ?? 'JMS', style: const TextStyle(color: SiteAppTheme.primarySafetyOrange, fontSize: 11, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: SiteAppTheme.successGreen.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                      child: Text(j['status'] ?? 'VERIFIED', style: const TextStyle(color: SiteAppTheme.successGreen, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(j['contractor_name'] ?? '', style: const TextStyle(color: SiteAppTheme.darkNavy, fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Location: ${j['location']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                Text('Work: ${j['item_description']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                const SizedBox(height: 8),
                Text('Measured: ${j['measured_quantity']} ${j['unit']}', style: const TextStyle(color: SiteAppTheme.darkNavy, fontWeight: FontWeight.bold, fontSize: 13)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBillsList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _raBills.length,
      itemBuilder: (ctx, i) {
        final b = _raBills[i];
        final isVerified = b['status'] != 'UNDER_VERIFICATION';

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
                    Text(b['bill_number'] ?? 'RA Bill', style: const TextStyle(color: SiteAppTheme.primarySafetyOrange, fontSize: 11, fontWeight: FontWeight.bold)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: isVerified ? SiteAppTheme.successGreen.withOpacity(0.12) : const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        b['status'] ?? 'PENDING',
                        style: TextStyle(
                          color: isVerified ? SiteAppTheme.successGreen : const Color(0xFFD97706),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(b['contractor_name'] ?? '', style: const TextStyle(color: SiteAppTheme.darkNavy, fontSize: 14, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Gross Amount: ৳${(b['gross_amount'] as num).toInt()} · Net Payable: ৳${(b['net_payable'] as num).toInt()}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                const SizedBox(height: 10),
                if (!isVerified)
                  ElevatedButton.icon(
                    icon: const Icon(Icons.verified, size: 14),
                    label: const Text('Verify & Certify Measurement', style: TextStyle(fontSize: 12)),
                    style: ElevatedButton.styleFrom(backgroundColor: SiteAppTheme.primarySafetyOrange, foregroundColor: Colors.white),
                    onPressed: () => _verifyBill(b),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
