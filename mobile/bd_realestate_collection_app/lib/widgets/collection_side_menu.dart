import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../screens/installment_schedule_screen.dart';
import '../screens/customer_ledger_screen.dart';
import '../screens/bank_loan_tracking_screen.dart';
import '../screens/bluetooth_printer_screen.dart';
import '../screens/pdc_vault_intake_screen.dart';
import '../screens/ni_act_logger_screen.dart';

class CollectionSideMenu extends StatelessWidget {
  final int currentTabIndex;
  final Function(int)? onSelectTab;
  final VoidCallback onLogout;

  const CollectionSideMenu({
    super.key,
    required this.currentTabIndex,
    this.onSelectTab,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: Colors.white,
      child: Column(
        children: [
          // Header
          Container(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 20,
              bottom: 20,
              left: 20,
              right: 20,
            ),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [CollectionTheme.primaryEmerald, Color(0xFF047857)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor: Colors.white.withOpacity(0.2),
                      child: const Text(
                        'RI',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Md. Rafiqul Islam',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'COL-108 • Sr. Field Recovery',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            'Zone: Dhaka Central (Mirpur/Uttara)',
                            style: TextStyle(
                              color: Colors.white60,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.18),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.verified_user, color: Colors.amberAccent, size: 15),
                      SizedBox(width: 6),
                      Text(
                        'Field Receipt Book Active',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Menu List
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                _buildSectionHeader('CORE RECOVERY COCKPIT'),
                _buildMenuItem(
                  context,
                  icon: Icons.dashboard_rounded,
                  title: 'Collection Cockpit',
                  subtitle: 'Today Target & Overdue Summary',
                  isSelected: currentTabIndex == 0,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(0);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.people_alt_rounded,
                  title: 'Customer Directory & Aging',
                  subtitle: 'Search Units, Overdues & Calls',
                  isSelected: currentTabIndex == 1,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(1);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.add_circle_rounded,
                  title: 'Instant Payment Entry',
                  subtitle: 'Cash, Cheque, bKash & Nagad',
                  isSelected: currentTabIndex == 2,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(2);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.rule_folder_rounded,
                  title: 'Approvals & Waivers',
                  subtitle: 'Late Fee Waiver & Refunds',
                  isSelected: currentTabIndex == 3,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(3);
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.analytics_rounded,
                  title: 'Recovery Reports',
                  subtitle: 'Daily Collections & Target KPI',
                  isSelected: currentTabIndex == 4,
                  onTap: () {
                    Navigator.pop(context);
                    onSelectTab?.call(4);
                  },
                ),

                const Divider(height: 24, thickness: 1, color: Color(0xFFE2E8F0)),
                _buildSectionHeader('FINANCIAL & LEDGER TOOLS'),
                _buildMenuItem(
                  context,
                  icon: Icons.calendar_month_rounded,
                  title: 'Installment Schedule Tracker',
                  subtitle: 'Down Payment & Monthly Dues',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const InstallmentScheduleScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.receipt_long_rounded,
                  title: 'Customer Financial Ledger',
                  subtitle: 'Debit/Credit Balance Statement',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const CustomerLedgerScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.account_balance_rounded,
                  title: 'Bank Loan Disbursements',
                  subtitle: 'NOC, Sanctions & Tranches',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const BankLoanTrackingScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.lock_clock_rounded,
                  title: 'PDC Cheque Vault',
                  subtitle: 'Post-Dated Cheque Intake',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const PdcVaultIntakeScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.gavel_rounded,
                  title: 'NI Act Legal Notices',
                  subtitle: 'Dishonour Notice Tracking',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const NiActLoggerScreen()),
                    );
                  },
                ),
                _buildMenuItem(
                  context,
                  icon: Icons.print_rounded,
                  title: 'Thermal Printer Setup',
                  subtitle: 'ESC/POS Bluetooth 58mm/80mm',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const BluetoothPrinterScreen()),
                    );
                  },
                ),
              ],
            ),
          ),

          // Bottom Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              border: Border(
                top: BorderSide(color: Color(0xFFE2E8F0)),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextButton.icon(
                    style: TextButton.styleFrom(
                      foregroundColor: CollectionTheme.alertCrimson,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      alignment: Alignment.centerLeft,
                    ),
                    icon: const Icon(Icons.logout_rounded, size: 20),
                    label: const Text(
                      'Logout Collector',
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                    onPressed: () {
                      Navigator.pop(context);
                      onLogout();
                    },
                  ),
                ),
                const Text(
                  'v2.8 POS',
                  style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 20, top: 12, bottom: 6),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: Color(0xFF64748B),
          letterSpacing: 1.1,
        ),
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    bool isSelected = false,
    required VoidCallback onTap,
  }) {
    return ListTile(
      dense: true,
      leading: Container(
        padding: const EdgeInsets.all(7),
        decoration: BoxDecoration(
          color: isSelected
              ? CollectionTheme.primaryEmerald.withOpacity(0.12)
              : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 20,
          color: isSelected ? CollectionTheme.primaryEmerald : const Color(0xFF475569),
        ),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
          color: isSelected ? CollectionTheme.primaryEmerald : CollectionTheme.darkSlate,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
      ),
      trailing: isSelected
          ? Container(
              width: 5,
              height: 22,
              decoration: BoxDecoration(
                color: CollectionTheme.primaryEmerald,
                borderRadius: BorderRadius.circular(3),
              ),
            )
          : const Icon(Icons.chevron_right, size: 16, color: Color(0xFFCBD5E1)),
      onTap: onTap,
    );
  }
}
