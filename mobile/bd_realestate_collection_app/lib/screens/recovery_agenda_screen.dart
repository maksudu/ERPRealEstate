import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../models/recovery_client.dart';
import 'on_the_spot_collection_screen.dart';

class RecoveryAgendaScreen extends StatefulWidget {
  const RecoveryAgendaScreen({super.key});

  @override
  State<RecoveryAgendaScreen> createState() => _RecoveryAgendaScreenState();
}

class _RecoveryAgendaScreenState extends State<RecoveryAgendaScreen> {
  String _selectedFilter = 'All';

  final List<RecoveryClient> _clients = const [
    RecoveryClient(
      id: 'REC-001',
      name: 'Engr. Mahbubur Rahman',
      phone: '+880 1712-334455',
      project: 'Green Horizon Tower',
      unit: 'A-7 (1,850 sft)',
      overdueAmount: 750000.0,
      overdueDays: 45,
      distanceKm: 0.8,
      address: 'House 42, Road 11, Banani, Dhaka',
      latitude: 23.7937,
      longitude: 90.4043,
      status: RecoveryStatus.chequeBounced,
      legalNoticeSent: true,
      bounceReason: 'Insufficient Funds (City Bank Cheque #49281)',
    ),
    RecoveryClient(
      id: 'REC-002',
      name: 'Dr. Shahana Akhter',
      phone: '+880 1819-887766',
      project: 'Navana Heights',
      unit: 'B-12 (2,100 sft)',
      overdueAmount: 500000.0,
      overdueDays: 32,
      distanceKm: 1.4,
      address: 'Plot 15, Block D, Gulshan-1, Dhaka',
      latitude: 23.7781,
      longitude: 90.4174,
      status: RecoveryStatus.overdue,
    ),
    RecoveryClient(
      id: 'REC-003',
      name: 'Syed Tanvir Ahmed',
      phone: '+880 1911-223344',
      project: 'Lakeside Residency',
      unit: 'C-4 (1,620 sft)',
      overdueAmount: 1200000.0,
      overdueDays: 85,
      distanceKm: 2.1,
      address: 'House 09, Road 72, Gulshan-2, Dhaka',
      latitude: 23.7925,
      longitude: 90.4152,
      status: RecoveryStatus.chequeBounced,
      legalNoticeSent: true,
      bounceReason: 'Account Dormant (EBL Cheque #88192)',
    ),
    RecoveryClient(
      id: 'REC-004',
      name: 'Mrs. Farzana Haque',
      phone: '+880 1715-990011',
      project: 'Green Horizon Tower',
      unit: 'B-3 (1,780 sft)',
      overdueAmount: 320000.0,
      overdueDays: 18,
      distanceKm: 3.5,
      address: 'House 18, Road 2, Baridhara Diplomatic Zone, Dhaka',
      latitude: 23.7989,
      longitude: 90.4223,
      status: RecoveryStatus.partialPaid,
    ),
    RecoveryClient(
      id: 'REC-005',
      name: 'Kazi Mostaq Hossain',
      phone: '+880 1612-445566',
      project: 'Navana Heights',
      unit: 'A-14 (2,450 sft)',
      overdueAmount: 890000.0,
      overdueDays: 60,
      distanceKm: 4.2,
      address: 'House 55, Road 27, Block A, Banani, Dhaka',
      latitude: 23.7910,
      longitude: 90.4020,
      status: RecoveryStatus.pdcHold,
    ),
  ];

  List<RecoveryClient> get _filteredClients {
    List<RecoveryClient> list;
    if (_selectedFilter == 'Bounced Cheques (NI Act)') {
      list = _clients.where((c) => c.status == RecoveryStatus.chequeBounced).toList();
    } else if (_selectedFilter == 'Proximity < 2 KM') {
      list = _clients.where((c) => c.distanceKm <= 2.0).toList();
    } else if (_selectedFilter == 'Overdue > 40 Days') {
      list = _clients.where((c) => c.overdueDays > 40).toList();
    } else {
      list = List<RecoveryClient>.from(_clients);
    }
    list.sort((a, b) => a.distanceKm.compareTo(b.distanceKm));
    return list;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ROUTE RECOVERY AGENDA',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.1,
                color: CollectionTheme.primaryEmerald,
              ),
            ),
            Text(
              'Gulshan & Banani Zone',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _buildFilterChip('All'),
                const SizedBox(width: 8),
                _buildFilterChip('Bounced Cheques (NI Act)'),
                const SizedBox(width: 8),
                _buildFilterChip('Proximity < 2 KM'),
                const SizedBox(width: 8),
                _buildFilterChip('Overdue > 40 Days'),
              ],
            ),
          ),

          // Route Summary Map Simulation Bar
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: CollectionTheme.deepNavy,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.near_me, color: Color(0xFF34D399), size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Optimized sequence: ${_filteredClients.length} stops (${_filteredClients.fold<double>(0.0, (acc, c) => acc + c.distanceKm).toStringAsFixed(1)} KM loop)',
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Launching route navigation on Google Maps...')),
                    );
                  },
                  child: const Text(
                    'START TRIP',
                    style: TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ),
              ],
            ),
          ),

          // Client Agenda List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _filteredClients.length,
              itemBuilder: (context, index) {
                final client = _filteredClients[index];
                return _buildClientCard(client);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _selectedFilter == label;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (val) {
        if (val) setState(() => _selectedFilter = label);
      },
      selectedColor: CollectionTheme.primaryEmerald.withOpacity(0.18),
      labelStyle: TextStyle(
        color: isSelected ? CollectionTheme.primaryEmerald : const Color(0xFF64748B),
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
    );
  }

  Widget _buildClientCard(RecoveryClient client) {
    Color badgeColor;
    String badgeText;

    switch (client.status) {
      case RecoveryStatus.chequeBounced:
        badgeColor = CollectionTheme.alertCrimson;
        badgeText = 'BOUNCED (NI ACT 138)';
        break;
      case RecoveryStatus.overdue:
        badgeColor = const Color(0xFFD97706);
        badgeText = '${client.overdueDays} DAYS OVERDUE';
        break;
      case RecoveryStatus.partialPaid:
        badgeColor = const Color(0xFF2563EB);
        badgeText = 'PARTIAL PAID';
        break;
      case RecoveryStatus.pdcHold:
        badgeColor = const Color(0xFF7C3AED);
        badgeText = 'PDC MATURING';
        break;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    client.name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: CollectionTheme.darkSlate,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: badgeColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: badgeColor.withOpacity(0.4)),
                  ),
                  child: Text(
                    badgeText,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: badgeColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.home_work_outlined, size: 14, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                Text(
                  '${client.project} • Unit: ${client.unit}',
                  style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF64748B)),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    '${client.address} (${client.distanceKm} km away)',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                ),
              ],
            ),
            if (client.bounceReason != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: CollectionTheme.alertCrimson.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 16, color: CollectionTheme.alertCrimson),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        client.bounceReason!,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: CollectionTheme.alertCrimson,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('PENDING RECOVERY', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                    Text(
                      '৳ ${(client.overdueAmount).toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: CollectionTheme.primaryEmerald,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        foregroundColor: CollectionTheme.darkSlate,
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                      ),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Calling ${client.phone}...')),
                        );
                      },
                      icon: const Icon(Icons.phone, size: 16),
                      label: const Text('Call', style: TextStyle(fontSize: 12)),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        backgroundColor: CollectionTheme.primaryEmerald,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => OnTheSpotCollectionScreen(client: client),
                          ),
                        );
                      },
                      icon: const Icon(Icons.payments_outlined, size: 16),
                      label: const Text('Collect', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
