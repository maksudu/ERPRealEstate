import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/customer_theme.dart';
import '../models/dlp_ticket.dart';

class DlpHelpdeskScreen extends StatefulWidget {
  const DlpHelpdeskScreen({super.key});

  @override
  State<DlpHelpdeskScreen> createState() => _DlpHelpdeskScreenState();
}

class _DlpHelpdeskScreenState extends State<DlpHelpdeskScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<DlpTicket> _dlpTickets = [
    DlpTicket(
      id: 'DLP-001',
      category: 'Plumbing & Concealed Pipe',
      issueDescription: 'Concealed CPVC hot water line low water pressure in Master Bath.',
      reportedDate: DateTime.now().subtract(const Duration(days: 3)),
      rectificationDeadline: DateTime.now().add(const Duration(days: 2)),
      status: 'ASSIGNED_TO_PLUMBER',
      siteEngineerAssigned: 'Engr. Sohel Rana (01711-223344)',
    ),
    DlpTicket(
      id: 'DLP-002',
      category: 'Electrical & Inverter',
      issueDescription: 'Main circuit breaker tripping intermittently on heavy AC load.',
      reportedDate: DateTime.now().subtract(const Duration(days: 12)),
      rectificationDeadline: DateTime.now().subtract(const Duration(days: 10)),
      status: 'RESOLVED_UNDER_WARRANTY',
      siteEngineerAssigned: 'Engr. Nazmul Islam (01819-334455)',
    ),
  ];

  final List<AssociationNotice> _notices = const [
    AssociationNotice(
      title: 'Annual General Meeting (AGM) 2026',
      date: '10 Nov 2026',
      content: 'All apartment owners of Green Horizon Tower are cordially invited to the Community Hall for election of Executive Committee.',
      category: 'General Meeting',
    ),
    AssociationNotice(
      title: 'Monthly Service Charge & Sinking Fund',
      date: '01 Oct 2026',
      content: 'Monthly service charge of ৳ ৬,৫০০ is due by 10th of every month. Sinking fund reserve balance currently stands at ৳ ২৫,০০,০০০.',
      category: 'Finance & Accounts',
    ),
    AssociationNotice(
      title: 'Kohler Generator Servicing & Elevator AMC',
      date: '25 Sep 2026',
      content: 'Routine scheduled maintenance of 250 KVA standby generator and Schindler high-speed lifts will take place this Saturday.',
      category: 'Maintenance',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _submitDlpClaim() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          top: 20,
          left: 20,
          right: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Submit 12-Month DLP Warranty Ticket',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 6),
            const Text(
              'Your property is protected under the 12-Month Defect Liability Period (DLP) warranty for plumbing, electrical, tiles and waterproofing.',
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: 'Plumbing & Concealed Pipe',
              decoration: const InputDecoration(labelText: 'Warranty Category', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'Plumbing & Concealed Pipe', child: Text('Plumbing & Concealed Pipe')),
                DropdownMenuItem(value: 'Electrical Circuit & Fixture', child: Text('Electrical Circuit & Fixture')),
                DropdownMenuItem(value: 'Waterproofing & Dampness', child: Text('Waterproofing & Dampness')),
                DropdownMenuItem(value: 'Door Alignment & Teak Fitting', child: Text('Door Alignment & Teak Fitting')),
              ],
              onChanged: (_) {},
            ),
            const SizedBox(height: 12),
            TextFormField(
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Describe the Issue', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('DLP Ticket logged! A warranty technician will visit within 24 hours.'),
                      backgroundColor: CustomerTheme.successGreen,
                    ),
                  );
                },
                icon: const Icon(Icons.send),
                label: const Text('Dispatch Warranty Technician'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Helpdesk & Owners Association'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: CustomerTheme.midnightNavy,
          indicatorColor: CustomerTheme.luxuryGold,
          tabs: const [
            Tab(text: '12-Month DLP Warranty'),
            Tab(text: 'কল্যাণ সমিতি (Association)'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: 12-Month DLP
          _buildDlpTab(),

          // Tab 2: Owners Association
          _buildAssociationTab(),
        ],
      ),
    );
  }

  Widget _buildDlpTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Warranty Badge Banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF064E3B), Color(0xFF065F46)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Row(
            children: [
              Icon(Icons.verified_user, color: Color(0xFF34D399), size: 32),
              SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '12-Month Comprehensive DLP Active',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Valid until: 31 December 2027 • Free technician dispatch for all structural, plumbing & electrical issues',
                      style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'ACTIVE WARRANTY TICKETS',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Color(0xFF64748B)),
            ),
            TextButton.icon(
              onPressed: _submitDlpClaim,
              icon: const Icon(Icons.add, size: 16),
              label: const Text('New Claim', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            ),
          ],
        ),
        const SizedBox(height: 8),

        ..._dlpTickets.map((t) => _buildDlpTicketCard(t)),
      ],
    );
  }

  Widget _buildDlpTicketCard(DlpTicket ticket) {
    final isResolved = ticket.status == 'RESOLVED_UNDER_WARRANTY';
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
                Text(ticket.category, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: (isResolved ? CustomerTheme.successGreen : const Color(0xFFD97706)).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isResolved ? 'RESOLVED' : 'IN RECTIFICATION',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isResolved ? CustomerTheme.successGreen : const Color(0xFFD97706),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(ticket.issueDescription, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            if (ticket.siteEngineerAssigned != null)
              Text('Assigned: ${ticket.siteEngineerAssigned}', style: const TextStyle(fontSize: 11, color: CustomerTheme.midnightNavy, fontWeight: FontWeight.w500)),
            Text('Reported: ${DateFormat('dd MMM yyyy').format(ticket.reportedDate)}', style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
          ],
        ),
      ),
    );
  }

  Widget _buildAssociationTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Sinking Fund & Dues Summary
        Row(
          children: [
            Expanded(
              child: _buildAssocBox('Monthly Service', '৳ 6,500', 'Due 10th of Month', const Color(0xFF2563EB)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildAssocBox('Sinking Fund Reserve', '৳ 25.0 Lac', 'Transferred to Society', CustomerTheme.successGreen),
            ),
          ],
        ),
        const SizedBox(height: 20),

        const Text(
          'কল্যাণ সমিতি বিজ্ঞপ্তি (NOTICE BOARD)',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.1,
            color: Color(0xFF64748B),
          ),
        ),
        const SizedBox(height: 10),

        ..._notices.map((n) {
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
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: CustomerTheme.midnightNavy.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(n.category, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: CustomerTheme.midnightNavy)),
                      ),
                      Text(n.date, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(n.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 4),
                  Text(n.content, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4)),
                ],
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildAssocBox(String title, String val, String subtitle, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
          const SizedBox(height: 6),
          Text(val, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
        ],
      ),
    );
  }
}
