import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';

class CustomerManagerScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const CustomerManagerScreen({super.key, this.onOpenDrawer});

  @override
  State<CustomerManagerScreen> createState() => _CustomerManagerScreenState();
}

class _CustomerManagerScreenState extends State<CustomerManagerScreen> {
  final _api = ApiClient();
  final _searchController = TextEditingController();

  bool _isLoading = false;
  List<dynamic> _customers = [];

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  Future<void> _loadCustomers() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getCustomers(search: _searchController.text.trim());
      setState(() {
        _customers = res['items'] ?? [];
      });
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  void _showCreateCustomerDialog() {
    final nameEn = TextEditingController();
    final nameBn = TextEditingController();
    final phone = TextEditingController();
    final email = TextEditingController();
    final nid = TextEditingController();
    final address = TextEditingController();
    String customerType = 'INDIVIDUAL';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
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
                    const Text('New Customer Profile', style: TextStyle(color: Color(0xFF0F172A), fontSize: 17, fontWeight: FontWeight.bold)),
                    IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: nameEn,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Full Name (English) *', labelStyle: TextStyle(color: Color(0xFF64748B))),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: nameBn,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Full Name (বাংলা)', labelStyle: TextStyle(color: Color(0xFF64748B))),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: phone,
                  keyboardType: TextInputType.phone,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Primary Phone * (+880...)', labelStyle: TextStyle(color: Color(0xFF64748B))),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: email,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Email Address', labelStyle: TextStyle(color: Color(0xFF64748B))),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: nid,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'NID / Smart Card Number', labelStyle: TextStyle(color: Color(0xFF64748B))),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: address,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Present Address', labelStyle: TextStyle(color: Color(0xFF64748B))),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: customerType,
                  dropdownColor: Colors.white,
                  style: const TextStyle(color: Color(0xFF0F172A)),
                  decoration: const InputDecoration(labelText: 'Customer Type', labelStyle: TextStyle(color: Color(0xFF64748B))),
                  items: const [
                    DropdownMenuItem(value: 'INDIVIDUAL', child: Text('Individual Citizen')),
                    DropdownMenuItem(value: 'INVESTOR', child: Text('Property Investor')),
                    DropdownMenuItem(value: 'COMPANY', child: Text('Corporate / Institution')),
                  ],
                  onChanged: (v) => setSheetState(() => customerType = v ?? 'INDIVIDUAL'),
                ),
                const SizedBox(height: 18),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryTeal,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: () async {
                    if (nameEn.text.trim().isEmpty || phone.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Name and Phone are required.')));
                      return;
                    }
                    try {
                      await _api.createCustomer({
                        'full_name_en': nameEn.text.trim(),
                        'full_name_bn': nameBn.text.trim().isEmpty ? null : nameBn.text.trim(),
                        'primary_phone': phone.text.trim(),
                        'email': email.text.trim().isEmpty ? null : email.text.trim(),
                        'nid_number': nid.text.trim().isEmpty ? null : nid.text.trim(),
                        'present_address': address.text.trim().isEmpty ? null : address.text.trim(),
                        'customer_type': customerType,
                      });
                      if (mounted) {
                        Navigator.pop(ctx);
                        _loadCustomers();
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Customer registered successfully!')));
                      }
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                    }
                  },
                  child: const Text('Save Customer', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showCustomerDetail(Map<String, dynamic> brief) async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => FutureBuilder<Map<String, dynamic>>(
        future: _api.getCustomer(brief['id']),
        builder: (ctx, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const SizedBox(height: 300, child: Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal)));
          }
          final c = snapshot.data ?? brief;
          final reqs = (c['requirements'] as List?) ?? [];
          final history = (c['interaction_history'] as List?) ?? [];
          final bookings = (c['bookings'] as List?) ?? [];

          return DraggableScrollableSheet(
            initialChildSize: 0.85,
            maxChildSize: 0.95,
            minChildSize: 0.5,
            expand: false,
            builder: (_, scrollCtrl) => SingleChildScrollView(
              controller: scrollCtrl,
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(c['full_name_en'] ?? 'Customer', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold)),
                            if (c['full_name_bn'] != null)
                              Text(c['full_name_bn'], style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                            Text('Code: ${c['customer_code'] ?? '-'}', style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                      IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const Divider(color: Color(0xFFE2E8F0), height: 24),

                  // Contact info card
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: [
                        _infoRow(Icons.phone, 'Phone', c['primary_phone'] ?? '-'),
                        const SizedBox(height: 8),
                        _infoRow(Icons.email, 'Email', c['email'] ?? '-'),
                        const SizedBox(height: 8),
                        _infoRow(Icons.badge, 'NID', c['nid_number'] ?? '-'),
                        const SizedBox(height: 8),
                        _infoRow(Icons.location_on, 'Address', c['present_address'] ?? '-'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Actions row
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.add_comment, size: 16),
                          label: const Text('Log Interaction', style: TextStyle(fontSize: 12)),
                          style: OutlinedButton.styleFrom(foregroundColor: AppTheme.primaryTeal, side: const BorderSide(color: AppTheme.primaryTeal)),
                          onPressed: () => _showLogInteractionDialog(c['id']),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.playlist_add, size: 16),
                          label: const Text('Add Requirement', style: TextStyle(fontSize: 12)),
                          style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFF0F172A), side: const BorderSide(color: Color(0xFFCBD5E1))),
                          onPressed: () => _showAddRequirementDialog(c['id']),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Requirements
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Property Requirements', style: TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold)),
                      Text('${reqs.length} Active', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (reqs.isEmpty)
                    const Text('No specific requirements saved yet.', style: TextStyle(color: Colors.grey, fontSize: 12))
                  else
                    ...reqs.map((r) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(r['title'] ?? 'Requirement', style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w600, fontSize: 13)),
                              const SizedBox(height: 4),
                              Text(
                                '${r['property_type'] ?? 'Apartment'} · ${r['bedrooms'] ?? 3} Beds · Pref: ${r['preferred_location'] ?? 'Any'}',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                              ),
                              if (r['budget_max_bdt'] != null)
                                Text('Budget: BDT ${r['budget_max_bdt']}', style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 12, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        )),
                  const SizedBox(height: 20),

                  // Interaction history
                  const Text('Interaction Timeline', style: TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  if (history.isEmpty)
                    const Text('No recorded interactions yet.', style: TextStyle(color: Colors.grey, fontSize: 12))
                  else
                    ...history.take(6).map((h) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                h['channel'] == 'PHONE_CALL' ? Icons.phone_forwarded : (h['channel'] == 'WHATSAPP' ? Icons.chat : Icons.note),
                                color: AppTheme.primaryTeal,
                                size: 16,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(h['subject'] ?? 'Interaction', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12, fontWeight: FontWeight.bold)),
                                    Text(h['message_body'] ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        )),

                  if (bookings.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Text('Bookings', style: TextStyle(color: Color(0xFF0F172A), fontSize: 14, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ...bookings.map((b) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(b['booking_code'] ?? 'Booking', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12, fontWeight: FontWeight.bold)),
                              Text(b['status'] ?? '', style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        )),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: AppTheme.primaryTeal, size: 16),
        const SizedBox(width: 8),
        Text('$label: ', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
        Expanded(child: Text(value, style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12, fontWeight: FontWeight.w500))),
      ],
    );
  }

  void _showLogInteractionDialog(int customerId) {
    final subject = TextEditingController();
    final body = TextEditingController();
    String channel = 'PHONE_CALL';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          backgroundColor: Colors.white,
          title: const Text('Log Interaction', style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: channel,
                dropdownColor: Colors.white,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Channel', labelStyle: TextStyle(color: Color(0xFF64748B))),
                items: const [
                  DropdownMenuItem(value: 'PHONE_CALL', child: Text('Phone Call')),
                  DropdownMenuItem(value: 'WHATSAPP', child: Text('WhatsApp Chat')),
                  DropdownMenuItem(value: 'MEETING', child: Text('In-person Meeting')),
                  DropdownMenuItem(value: 'INTERNAL_NOTE', child: Text('Internal Note')),
                ],
                onChanged: (v) => setDlg(() => channel = v ?? 'PHONE_CALL'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: subject,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Subject *', labelStyle: TextStyle(color: Color(0xFF64748B))),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: body,
                maxLines: 2,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Details / Summary *', labelStyle: TextStyle(color: Color(0xFF64748B))),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal),
              onPressed: () async {
                if (subject.text.trim().isEmpty || body.text.trim().isEmpty) return;
                await _api.logInteraction({
                  'customer_id': customerId,
                  'channel': channel,
                  'subject': subject.text.trim(),
                  'message_body': body.text.trim(),
                });
                Navigator.pop(ctx);
                Navigator.pop(context); // Close sheet and refresh
                _loadCustomers();
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _showAddRequirementDialog(int customerId) {
    final title = TextEditingController(text: '3BHK Apartment in Gulshan');
    final budget = TextEditingController(text: '25000000');
    final location = TextEditingController(text: 'Gulshan / Banani');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        title: const Text('Add Requirement', style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: title,
              style: const TextStyle(color: Color(0xFF0F172A)),
              decoration: const InputDecoration(labelText: 'Title', labelStyle: TextStyle(color: Color(0xFF64748B))),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: location,
              style: const TextStyle(color: Color(0xFF0F172A)),
              decoration: const InputDecoration(labelText: 'Preferred Location', labelStyle: TextStyle(color: Color(0xFF64748B))),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: budget,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Color(0xFF0F172A)),
              decoration: const InputDecoration(labelText: 'Max Budget (BDT)', labelStyle: TextStyle(color: Color(0xFF64748B))),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal),
            onPressed: () async {
              await _api.addCustomerRequirement(customerId, {
                'title': title.text.trim(),
                'preferred_location': location.text.trim(),
                'budget_max_bdt': double.tryParse(budget.text.trim()),
                'property_type': 'APARTMENT',
                'bedrooms': 3,
              });
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            child: const Text('Add'),
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
        backgroundColor: Colors.white,
        elevation: 0,
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: Color(0xFF0F172A)),
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
        title: const Text('Customer Directory', style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.person_add, color: AppTheme.primaryTeal), onPressed: _showCreateCustomerDialog),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchController,
              style: const TextStyle(color: Color(0xFF0F172A)),
              onChanged: (_) => _loadCustomers(),
              decoration: InputDecoration(
                hintText: 'Search by Name, Phone, NID...',
                hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                prefixIcon: const Icon(Icons.search, color: Color(0xFF94A3B8), size: 20),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
                : _customers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.people_outline, color: Colors.grey, size: 48),
                            const SizedBox(height: 12),
                            const Text('No customers found', style: TextStyle(color: Colors.grey)),
                            const SizedBox(height: 12),
                            ElevatedButton.icon(
                              icon: const Icon(Icons.add, size: 16),
                              label: const Text('Create Customer'),
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal),
                              onPressed: _showCreateCustomerDialog,
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadCustomers,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          itemCount: _customers.length,
                          itemBuilder: (ctx, i) {
                            final c = _customers[i];
                            return Card(
                              color: Colors.white,
                              elevation: 0,
                              margin: const EdgeInsets.only(bottom: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              child: ListTile(
                                onTap: () => _showCustomerDetail(c),
                                leading: CircleAvatar(
                                  backgroundColor: AppTheme.primaryTeal.withOpacity(0.12),
                                  child: Text(
                                    (c['full_name_en'] ?? 'C').substring(0, 1).toUpperCase(),
                                    style: const TextStyle(color: AppTheme.primaryTeal, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                title: Text(c['full_name_en'] ?? '-', style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 14)),
                                subtitle: Text('${c['primary_phone'] ?? '-'} · ${c['customer_type'] ?? 'Individual'}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                                trailing: const Icon(Icons.arrow_forward_ios, color: Color(0xFF94A3B8), size: 14),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
