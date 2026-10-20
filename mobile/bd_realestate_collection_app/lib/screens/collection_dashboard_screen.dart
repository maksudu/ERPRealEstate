import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../core/bluetooth/bluetooth_printer_service.dart';
import 'recovery_agenda_screen.dart';
import 'on_the_spot_collection_screen.dart';
import 'bluetooth_printer_screen.dart';
import 'pdc_vault_intake_screen.dart';
import 'ni_act_logger_screen.dart';
import 'customer_search_screen.dart';
import 'installment_schedule_screen.dart';
import 'customer_ledger_screen.dart';
import 'bank_loan_tracking_screen.dart';
import 'collection_workflow_screen.dart';
import 'collection_reports_screen.dart';

class CollectionDashboardScreen extends StatefulWidget {
  final VoidCallback? onLogout;
  final VoidCallback? onOpenDrawer;

  const CollectionDashboardScreen({
    super.key,
    this.onLogout,
    this.onOpenDrawer,
  });

  @override
  State<CollectionDashboardScreen> createState() => _CollectionDashboardScreenState();
}


class _CollectionDashboardScreenState extends State<CollectionDashboardScreen> {
  final _printerService = BluetoothPrinterService();

  @override
  void initState() {
    super.initState();
    _printerService.addListener(_onPrinterChanged);
  }

  @override
  void dispose() {
    _printerService.removeListener(_onPrinterChanged);
    super.dispose();
  }

  void _onPrinterChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: CollectionTheme.darkSlate),
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
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'FIELD RECOVERY & FINTECH',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
                color: CollectionTheme.primaryEmerald,
              ),
            ),
            Text(
              'Recovery Officer Cockpit',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          // Bluetooth Status Chip
          InkWell(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const BluetoothPrinterScreen()),
              );
            },
            borderRadius: BorderRadius.circular(20),
            child: Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: _printerService.isConnected
                    ? CollectionTheme.primaryEmerald.withOpacity(0.12)
                    : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _printerService.isConnected
                      ? CollectionTheme.primaryEmerald
                      : const Color(0xFFCBD5E1),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.bluetooth,
                    size: 16,
                    color: _printerService.isConnected ? CollectionTheme.primaryEmerald : Colors.grey,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _printerService.isConnected ? '80mm Paired' : 'No Printer',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: _printerService.isConnected ? CollectionTheme.primaryEmerald : Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (widget.onLogout != null)
            IconButton(
              icon: const Icon(Icons.logout, color: Colors.black54, size: 20),
              tooltip: 'Logout',
              onPressed: widget.onLogout,
            ),
          const SizedBox(width: 4),
        ],
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Officer Performance Banner
            _buildPerformanceBanner(),
            const SizedBox(height: 16),

            // Metrics Grid
            _buildMetricsGrid(),
            const SizedBox(height: 20),

            // Modules
            const Text(
              'FINANCIAL RECOVERY MODULES',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 12),

            _buildActionCard(
              title: 'Route-Optimized Recovery Agenda',
              subtitle: 'Google Maps proximity routing with pending dues & bounced cheques',
              icon: Icons.alt_route_rounded,
              color: const Color(0xFF059669),
              badge: '5 Stops Nearby',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const RecoveryAgendaScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildActionCard(
              title: 'On-the-Spot Collection & Signature',
              subtitle: 'Cash, Cheque, dynamic bKash/Nagad QR & digital client signature',
              icon: Icons.payments_rounded,
              color: const Color(0xFFD97706),
              badge: 'Instant Receipt',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const OnTheSpotCollectionScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildActionCard(
              title: 'Bluetooth ESC/POS Thermal Printing',
              subtitle: '1-Tap pairing with portable 58mm/80mm belt printers (<3s print)',
              icon: Icons.print_rounded,
              color: const Color(0xFF0F172A),
              badge: _printerService.isConnected ? 'Ready' : 'Setup Printer',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const BluetoothPrinterScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildActionCard(
              title: 'Post-Dated Cheque (PDC) Vault Intake',
              subtitle: 'Cheque photo, bank MICR details & tamper-evident pouch barcode',
              icon: Icons.lock_clock_rounded,
              color: const Color(0xFF2563EB),
              badge: 'PDC Vault',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PdcVaultIntakeScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildActionCard(
              title: 'NI Act 1881 Section 138 Notice Logger',
              subtitle: 'Dishonored cheque legal notice A/D proof & statutory 30-day countdown',
              icon: Icons.gavel_rounded,
              color: CollectionTheme.alertCrimson,
              badge: '3 Active Notices',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NiActLoggerScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildActionCard(
              title: 'Customer Search & Portfolio Lookup',
              subtitle: 'Find buyers by name, phone, project, unit or booking reference',
              icon: Icons.person_search_rounded,
              color: const Color(0xFF0D9488),
              badge: 'Portfolio CRM',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CustomerSearchScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildActionCard(
              title: 'Installment Schedule & Aging Reports',
              subtitle: 'Milestones, due & overdue aging brackets and 1-tap reminders',
              icon: Icons.calendar_month_rounded,
              color: const Color(0xFF2563EB),
              badge: 'Schedule & Due',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const InstallmentScheduleScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildActionCard(
              title: 'Customer Statement of Account (Ledger)',
              subtitle: 'Chronological demand invoices, payments received & net balance',
              icon: Icons.receipt_long_rounded,
              color: const Color(0xFF7C3AED),
              badge: 'Audit Trail',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CustomerLedgerScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildActionCard(
              title: 'Tripartite Bank Loan Tracking',
              subtitle: 'Monitor buyer loan sanctions, developer NOC & tranche releases',
              icon: Icons.account_balance_rounded,
              color: const Color(0xFFB45309),
              badge: 'Bank Desk',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const BankLoanTrackingScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildActionCard(
              title: 'Payment Verification & Approval Workflows',
              subtitle: 'Maker-checker clearing, late fee waivers & refund governance',
              icon: Icons.verified_user_rounded,
              color: CollectionTheme.primaryEmerald,
              badge: 'Governance',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CollectionWorkflowScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildActionCard(
              title: 'Daily Collection Reports & Analytics',
              subtitle: 'Collector targets, recovery rate % and project summaries',
              icon: Icons.analytics_rounded,
              color: const Color(0xFF0F172A),
              badge: 'MIS Reports',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CollectionReportsScreen()),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildPerformanceBanner() {
    return Container(
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
          CircleAvatar(
            radius: 24,
            backgroundColor: Color(0xFF34D399),
            child: Icon(Icons.person, color: Color(0xFF064E3B), size: 28),
          ),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Officer Tarek Aziz (FO-892)',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                ),
                SizedBox(height: 2),
                Text(
                  'Assigned Zone: Gulshan, Banani, Baridhara',
                  style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricsGrid() {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.5,
      children: [
        _buildMetricTile(
          label: "Today's Collection",
          value: '৳ 12,50,000',
          subtext: '4 Transactions logged',
          icon: Icons.savings_outlined,
          color: CollectionTheme.primaryEmerald,
        ),
        _buildMetricTile(
          label: 'Month Target',
          value: '৳ 1,50,00,000',
          subtext: '68% Achieved',
          icon: Icons.trending_up,
          color: const Color(0xFF2563EB),
        ),
        _buildMetricTile(
          label: 'Assigned Agenda',
          value: '8 Clients',
          subtext: '4.8 KM route loop',
          icon: Icons.directions_run,
          color: const Color(0xFFD97706),
        ),
        _buildMetricTile(
          label: 'NI Act 138 Active',
          value: '3 Notices',
          subtext: '1 Expiring in 2 days',
          icon: Icons.warning_amber_rounded,
          color: CollectionTheme.alertCrimson,
        ),
      ],
    );
  }

  Widget _buildMetricTile({
    required String label,
    required String value,
    required String subtext,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
              ),
              Icon(icon, size: 16, color: color),
            ],
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            subtext,
            style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String badge,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: CollectionTheme.darkSlate,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      badge,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: Color(0xFFCBD5E1)),
          ],
        ),
      ),
    );
  }
}
