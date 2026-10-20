import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/management_theme.dart';
import '../core/security/biometric_service.dart';
import '../models/approval_item.dart';

class ApprovalCenterScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const ApprovalCenterScreen({super.key, this.onOpenDrawer});

  @override
  State<ApprovalCenterScreen> createState() => _ApprovalCenterScreenState();
}

class _ApprovalCenterScreenState extends State<ApprovalCenterScreen> {
  final _biometricService = BiometricService();
  String _selectedFilter = 'All';

  final List<ApprovalItem> _items = [
    ApprovalItem(
      id: 'APR-DSC-01',
      title: '7.5% Sales Discount Exception',
      category: ApprovalCategory.discountException,
      discountPercent: 7.5,
      project: 'Green Horizon Tower',
      subject: 'Flat A-7 (1,850 sft) • Client: Engr. Mahbubur Rahman',
      amountBdt: 18500000.0,
      marginImpactBdt: 462500.0,
      requestedBy: 'Head of Sales (Kamal Hossain)',
      submissionDate: DateTime.now().subtract(const Duration(hours: 3)),
      details: 'Customer insists on 7.5% discount vs standard sales ceiling of 3.0%. Margin impact is -৳ ৪,৬২,৫০০. Net unit price after waiver: ৳ ১,৭১,১২,৫০০.',
    ),
    ApprovalItem(
      id: 'APR-PO-02',
      title: 'Purchase Order & CS: BSRM 500W Rebar (250 MT)',
      category: ApprovalCategory.purchaseOrderCs,
      project: 'Navana Heights',
      subject: 'Comparative Statement: BSRM vs AKS vs GPH',
      amountBdt: 24750000.0,
      requestedBy: 'Chief Procurement Officer',
      submissionDate: DateTime.now().subtract(const Duration(hours: 6)),
      details: 'Comparative Statement completed. BSRM Steels is lowest compliant bidder at ৳ ৯৯,০০০/MT inclusive of VAT & delivery to Banani site. Total PO: ৳ ২,৪৭,৫০,০০০.',
    ),
    ApprovalItem(
      id: 'APR-RA-03',
      title: 'Contractor RA Bill #06: 8th Floor RCC Casting',
      category: ApprovalCategory.contractorRaBill,
      project: 'Green Horizon Tower',
      subject: 'Vendor: Anwar Steel & RCC Works Ltd',
      amountBdt: 1850000.0,
      requestedBy: 'Project Director & Site In-Charge',
      submissionDate: DateTime.now().subtract(const Duration(hours: 14)),
      details: 'Casting completed 320 CFT. Rebar 4.85 MT checked. 5% retention money (৳ ৯২,৫০০) withheld. Recommended net release: ৳ ১৭,৫৭,৫০০.',
    ),
    ApprovalItem(
      id: 'APR-CNC-04',
      title: 'Booking Cancellation & Refund Tranche Schedule',
      category: ApprovalCategory.bookingCancellation,
      project: 'Lakeside Residency',
      subject: 'Flat C-4 • Client: Kazi Mostaq Hossain',
      amountBdt: 3500000.0,
      requestedBy: 'Customer Relations Lead',
      submissionDate: DateTime.now().subtract(const Duration(days: 1)),
      details: 'Client relocating overseas. Paid down payment ৳ ৩৫,০০,০০০. Forfeiture clause 10% deducted (৳ ৩,৫০,০০০). Refund balance ৳ ৩১,৫০,০০০ in 3 monthly installments.',
    ),
  ];

  List<ApprovalItem> get _filteredItems {
    if (_selectedFilter == 'Discounts') {
      return _items.where((i) => i.category == ApprovalCategory.discountException).toList();
    } else if (_selectedFilter == 'POs & CS') {
      return _items.where((i) => i.category == ApprovalCategory.purchaseOrderCs).toList();
    } else if (_selectedFilter == 'RA Bills') {
      return _items.where((i) => i.category == ApprovalCategory.contractorRaBill).toList();
    } else if (_selectedFilter == 'Cancellations') {
      return _items.where((i) => i.category == ApprovalCategory.bookingCancellation).toList();
    }
    return _items;
  }

  void _handleBiometricApprove(ApprovalItem item) async {
    final approved = await _biometricService.promptBiometricApproval(
      context,
      title: 'MD Biometric Approval',
      reason: 'Authorize ${item.title} for ${item.project}',
      amountBdt: 'BDT ৳ ${(item.amountBdt).toStringAsFixed(0)}',
    );

    if (approved && mounted) {
      setState(() {
        item.isApproved = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${item.title} authorized with hardware Face ID!'),
          backgroundColor: ManagementTheme.successEmerald,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: ManagementTheme.royalNavy),
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
        title: const Text('Executive Approval Center'),
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildFilterChip('All'),
                const SizedBox(width: 8),
                _buildFilterChip('Discounts'),
                const SizedBox(width: 8),
                _buildFilterChip('POs & CS'),
                const SizedBox(width: 8),
                _buildFilterChip('RA Bills'),
                const SizedBox(width: 8),
                _buildFilterChip('Cancellations'),
              ],
            ),
          ),

          // Items List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _filteredItems.length,
              itemBuilder: (context, index) {
                final item = _filteredItems[index];
                return _buildApprovalCard(item);
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
      selectedColor: ManagementTheme.luxuryGold.withOpacity(0.2),
      backgroundColor: ManagementTheme.cardDark,
      labelStyle: TextStyle(
        color: isSelected ? ManagementTheme.brightGold : ManagementTheme.textMuted,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
    );
  }

  Widget _buildApprovalCard(ApprovalItem item) {
    Color categoryColor;
    switch (item.category) {
      case ApprovalCategory.discountException:
        categoryColor = ManagementTheme.brightGold;
        break;
      case ApprovalCategory.purchaseOrderCs:
        categoryColor = const Color(0xFF38BDF8);
        break;
      case ApprovalCategory.contractorRaBill:
        categoryColor = const Color(0xFF34D399);
        break;
      case ApprovalCategory.bookingCancellation:
        categoryColor = ManagementTheme.alertCrimson;
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
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: categoryColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: categoryColor.withOpacity(0.4)),
                  ),
                  child: Text(
                    item.categoryLabel,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: categoryColor),
                  ),
                ),
                Text(
                  DateFormat('hh:mm a').format(item.submissionDate),
                  style: const TextStyle(fontSize: 11, color: ManagementTheme.textMuted),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              item.title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy),
            ),
            const SizedBox(height: 4),
            Text(
              '${item.project} • ${item.subject}',
              style: const TextStyle(fontSize: 12, color: ManagementTheme.textMuted),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: ManagementTheme.borderSubtle),
              ),
              child: Text(
                item.details,
                style: const TextStyle(fontSize: 11, color: ManagementTheme.slateText, height: 1.4),
              ),
            ),
            if (item.discountPercent != null) ...[
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: ManagementTheme.alertCrimson.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: ManagementTheme.alertCrimson.withOpacity(0.2)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.shield_outlined, color: ManagementTheme.alertCrimson, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      'DISCOUNT WAIVER: ${item.discountPercent}% (Exceeds >3.0% Sales Ceiling)',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: ManagementTheme.alertCrimson),
                    ),
                  ],
                ),
              ),
            ],
            if (item.marginImpactBdt != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.trending_down, color: ManagementTheme.alertCrimson, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    'Margin Impact: -৳ ${(item.marginImpactBdt!).toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 11, color: ManagementTheme.alertCrimson, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
            const Divider(color: Color(0xFFF1F5F9), height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('FINANCIAL IMPACT', style: TextStyle(fontSize: 10, color: ManagementTheme.textMuted)),
                    Text(
                      '৳ ${(item.amountBdt).toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy),
                    ),
                  ],
                ),
                if (item.isApproved)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: ManagementTheme.successEmerald.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: ManagementTheme.successEmerald),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.verified, color: ManagementTheme.successEmerald, size: 16),
                        SizedBox(width: 6),
                        Text(
                          'AUTHORIZED (FACE ID)',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: ManagementTheme.successEmerald),
                        ),
                      ],
                    ),
                  )
                else
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ManagementTheme.royalNavy,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                    onPressed: () => _handleBiometricApprove(item),
                    icon: const Icon(Icons.fingerprint, size: 18),
                    label: const Text('1-Tap Approve', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),

          ],
        ),
      ),
    );
  }
}
