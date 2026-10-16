import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/customer_theme.dart';
import '../models/snagging_ticket.dart';

class SnaggingToolScreen extends StatefulWidget {
  const SnaggingToolScreen({super.key});

  @override
  State<SnaggingToolScreen> createState() => _SnaggingToolScreenState();
}

class _SnaggingToolScreenState extends State<SnaggingToolScreen> {
  final _formKey = GlobalKey<FormState>();

  String _selectedRoom = 'Master Bedroom';
  String _selectedCategory = 'Paint & Wall Finish';
  final _descCtrl = TextEditingController(
    text: 'Minor paint peeling and surface unevenness near the North balcony sliding glass door frame.',
  );
  bool _photoAttached = true;

  final List<String> _rooms = [
    'Master Bedroom',
    'Guest Bedroom',
    'Balcony (Lake Facing)',
    'Master Bathroom',
    'Common Bathroom',
    'Kitchen & Utility Area',
    'Living & Dining Space',
  ];

  final List<String> _categories = [
    'Paint & Wall Finish',
    'Tiles & Marble Grouting',
    'Plumbing & Sanitary CP Fittings',
    'Electrical & Switches',
    'Teak Wood Doors & Hardware',
    'Aluminum Glass Windows',
  ];

  final List<SnaggingTicket> _snags = [
    SnaggingTicket(
      id: 'SNG-01',
      room: 'Master Bathroom',
      category: 'Tiles & Marble Grouting',
      description: 'Hairline crack on 2x2 floor porcelain tile near shower glass partition.',
      reportedDate: DateTime.now().subtract(const Duration(days: 4)),
      status: SnagStatus.underRectification,
      engineerNotes: 'Site engineer assigned contractor to replace cracked tile by Thursday.',
    ),
    SnaggingTicket(
      id: 'SNG-02',
      room: 'Living & Dining Space',
      category: 'Teak Wood Doors & Hardware',
      description: 'Main entrance heavy teak door latch lock cylinder sticking when turning key.',
      reportedDate: DateTime.now().subtract(const Duration(days: 8)),
      status: SnagStatus.rectifiedVerified,
      engineerNotes: 'Lubricated lock cylinder and re-aligned brass strike plate. Verified clean.',
    ),
  ];

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  void _submitSnag() {
    if (!_formKey.currentState!.validate()) return;

    final snag = SnaggingTicket(
      id: 'SNG-${DateTime.now().millisecondsSinceEpoch % 1000}',
      room: _selectedRoom,
      category: _selectedCategory,
      description: _descCtrl.text,
      reportedDate: DateTime.now(),
      status: SnagStatus.reported,
    );

    setState(() {
      _snags.insert(0, snag);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Pre-handover snag reported! Site engineer notified for immediate rectification.'),
        backgroundColor: CustomerTheme.successGreen,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pre-Handover Snagging Tool'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Homeowner Inspection Intro Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: CustomerTheme.midnightNavy,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Row(
                children: [
                  Icon(Icons.checklist_rtl_rounded, color: CustomerTheme.brightGold, size: 28),
                  SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pre-Handover Quality Walkthrough',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Inspect your apartment and log any minor defects. Our site engineering team will rectify all items before final handover.',
                          style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Snag Entry Form
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
                          Icon(Icons.report_problem_outlined, color: CustomerTheme.midnightNavy),
                          SizedBox(width: 8),
                          Text('Report a New Defect', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 14),

                      DropdownButtonFormField<String>(
                        value: _selectedRoom,
                        decoration: const InputDecoration(labelText: 'Room / Area', border: OutlineInputBorder()),
                        items: _rooms.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                        onChanged: (val) => setState(() => _selectedRoom = val!),
                      ),
                      const SizedBox(height: 12),

                      DropdownButtonFormField<String>(
                        value: _selectedCategory,
                        decoration: const InputDecoration(labelText: 'Defect Category', border: OutlineInputBorder()),
                        items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                        onChanged: (val) => setState(() => _selectedCategory = val!),
                      ),
                      const SizedBox(height: 12),

                      // Photo Proof Capture
                      InkWell(
                        onTap: () {
                          setState(() => _photoAttached = true);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('High-resolution defect photo attached!')),
                          );
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.camera_alt, color: CustomerTheme.midnightNavy),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _photoAttached ? 'Defect_Photo_Tile_CloseUp.jpg Attached' : 'Take / Upload Defect Photo',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: _photoAttached ? FontWeight.bold : FontWeight.normal,
                                    color: _photoAttached ? CustomerTheme.successGreen : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                              Icon(
                                _photoAttached ? Icons.check_circle : Icons.add_a_photo,
                                color: _photoAttached ? CustomerTheme.successGreen : Colors.grey,
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _descCtrl,
                        maxLines: 2,
                        decoration: const InputDecoration(labelText: 'Defect Description', border: OutlineInputBorder()),
                        validator: (v) => v!.isEmpty ? 'Description required' : null,
                      ),
                      const SizedBox(height: 16),

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _submitSnag,
                          icon: const Icon(Icons.send_rounded, size: 18),
                          label: const Text('Submit Snag to Site Engineer'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Snag Status Tracker
            const Text(
              'SNAG RECTIFICATION STATUS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 10),

            ..._snags.map((s) => _buildSnagCard(s)),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSnagCard(SnaggingTicket snag) {
    Color badgeColor;
    switch (snag.status) {
      case SnagStatus.reported:
        badgeColor = const Color(0xFFD97706);
        break;
      case SnagStatus.underRectification:
        badgeColor = const Color(0xFF2563EB);
        break;
      case SnagStatus.rectifiedVerified:
        badgeColor = CustomerTheme.successGreen;
        break;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    '${snag.room} • ${snag.category}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: badgeColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    snag.statusLabel,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: badgeColor),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(snag.description, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            if (snag.engineerNotes != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.engineering, size: 16, color: CustomerTheme.midnightNavy),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Engineer: ${snag.engineerNotes}',
                        style: const TextStyle(fontSize: 11, color: CustomerTheme.midnightNavy, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 6),
            Text(
              'Reported: ${DateFormat('dd MMM yyyy').format(snag.reportedDate)}',
              style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
            ),
          ],
        ),
      ),
    );
  }
}
