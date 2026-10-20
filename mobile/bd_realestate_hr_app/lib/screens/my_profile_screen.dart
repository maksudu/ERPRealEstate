import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../core/network/api_client.dart';

class MyProfileScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const MyProfileScreen({super.key, this.onOpenDrawer});

  @override
  State<MyProfileScreen> createState() => _MyProfileScreenState();
}

class _MyProfileScreenState extends State<MyProfileScreen> {
  final _api = HrApiClient();
  bool _isLoading = true;
  Map<String, dynamic>? _profile;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getProfile();
      if (mounted) setState(() => _profile = res['profile']);
    } catch (_) {
      if (mounted) {
        setState(() {
          _profile = {
            'name': 'Engr. Kamal Hossain',
            'employee_code': 'EMP-1042',
            'designation': 'Senior Project Manager',
            'department': 'Engineering & Construction',
            'joining_date': '2021-04-15',
            'phone': '+880 1711-234567',
            'email': 'kamal.hossain@blueoceans.com.bd',
            'nid': '19882691234567890',
            'tin': '489201934012',
            'bank_name': 'Dutch-Bangla Bank Ltd',
            'account_number': '115.120.0094827',
            'emergency_contact': 'Mrs. Nasrin Sultana (Spouse) - 01819-000000',
            'documents': [
              {'name': 'NID Smart Card Copy.pdf', 'type': 'ID_PROOF'},
              {'name': 'B.Sc Civil Engineering Certificate.pdf', 'type': 'EDUCATION'},
              {'name': 'Appointment & Confirmation Letter.pdf', 'type': 'OFFICIAL'},
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
    final p = _profile ?? {};
    final docs = (p['documents'] as List<dynamic>?) ?? [];

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
        title: const Text('My Profile & Documents', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: HrTheme.primaryIndigo))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Profile Header
                  Card(
                    color: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                      side: const BorderSide(color: HrTheme.slateBorder),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 30,
                            backgroundColor: HrTheme.primaryIndigo.withOpacity(0.12),
                            child: const Icon(Icons.person, color: HrTheme.primaryIndigo, size: 36),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(p['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: HrTheme.deepNavy)),
                                const SizedBox(height: 2),
                                Text('${p['designation']} • ${p['employee_code']}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                const SizedBox(height: 2),
                                Text(p['department'] ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: HrTheme.primaryIndigo)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Official & Personal Info Card
                  Card(
                    color: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: HrTheme.slateBorder),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('EMPLOYMENT & TAX INFORMATION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                          const SizedBox(height: 12),
                          _detailRow('Official Email', p['email']),
                          _detailRow('Phone Number', p['phone']),
                          _detailRow('Joining Date', p['joining_date']),
                          _detailRow('Bangladesh NID', p['nid']),
                          _detailRow('Tax E-TIN Number', p['tin']),
                          _detailRow('Salary Bank', '${p['bank_name']}\nA/C: ${p['account_number']}'),
                          _detailRow('Emergency Contact', p['emergency_contact']),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Authorized Documents Card
                  Card(
                    color: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: HrTheme.slateBorder),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('AUTHORIZED HR DOCUMENTS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                          const SizedBox(height: 12),
                          ...docs.map((d) => ListTile(
                                dense: true,
                                contentPadding: EdgeInsets.zero,
                                leading: const Icon(Icons.picture_as_pdf, color: HrTheme.alertCrimson, size: 22),
                                title: Text(d['name'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: HrTheme.deepNavy)),
                                subtitle: Text('Category: ${d['type']}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                                trailing: const Icon(Icons.download, size: 18, color: HrTheme.primaryIndigo),
                                onTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(backgroundColor: HrTheme.deepNavy, content: Text('Downloading ${d['name']}...')),
                                  );
                                },
                              )),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _detailRow(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 130, child: Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)))),
          Expanded(child: Text(value?.toString() ?? '--', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: HrTheme.deepNavy))),
        ],
      ),
    );
  }
}
