import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../core/security/biometric_service.dart';
import 'approval_center_screen.dart';
import 'scurve_radar_screen.dart';
import 'cashflow_forecast_screen.dart';

class BiCockpitScreen extends StatelessWidget {
  const BiCockpitScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'EXECUTIVE BI COCKPIT',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.5,
                color: ManagementTheme.luxuryGold,
              ),
            ),
            Text(
              'Bangladesh Enterprise Radar',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Lock Session',
            icon: const Icon(Icons.lock_outline, color: ManagementTheme.luxuryGold),
            onPressed: () {
              BiometricService().lock();
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Pending Executive Approvals Alert Pill
            _buildApprovalAlertCard(context),
            const SizedBox(height: 16),

            // Top Key Financial Metrics
            const Text(
              'FINANCIAL POSITION IN BDT',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
                color: ManagementTheme.textMuted,
              ),
            ),
            const SizedBox(height: 10),
            _buildFinancialMetricsGrid(),
            const SizedBox(height: 18),

            // Liquid Cash & Bank Balances Breakdown
            _buildBankLiquidityCard(),
            const SizedBox(height: 18),

            // Fast Executive Navigation Cards
            const Text(
              'STRATEGIC OVERSIGHT',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
                color: ManagementTheme.textMuted,
              ),
            ),
            const SizedBox(height: 10),
            _buildStrategicCard(
              title: 'Construction S-Curve Radar',
              subtitle: 'Baseline planned vs actual progress curves & EVM performance',
              icon: Icons.ssid_chart,
              color: const Color(0xFF38BDF8),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SCurveRadarScreen()),
              ),
            ),
            const SizedBox(height: 10),
            _buildStrategicCard(
              title: '90-Day Cash Flow Forecast',
              subtitle: 'Projected installment inflows vs contractor RA bills & term debts',
              icon: Icons.account_balance,
              color: ManagementTheme.luxuryGold,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CashFlowForecastScreen()),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildApprovalAlertCard(BuildContext context) {
    return InkWell(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const ApprovalCenterScreen()),
      ),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF3B1E08), Color(0xFF1E293B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: ManagementTheme.brightGold.withOpacity(0.5)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(
                color: ManagementTheme.brightGold,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.fingerprint, color: Colors.white, size: 24),
            ),

            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '4 Approvals Awaiting Biometrics',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'POs, Discount waivers & RA contractor bills',
                    style: TextStyle(fontSize: 11, color: ManagementTheme.textMuted),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, color: ManagementTheme.brightGold, size: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildFinancialMetricsGrid() {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.35,
      children: [
        _buildMetricTile(
          label: "Today's Sales",
          value: '৳ 4.80 Cr',
          subtext: '2 Luxury Units Booked',
          icon: Icons.trending_up,
          color: ManagementTheme.luxuryGold,
        ),
        _buildMetricTile(
          label: 'Month Collection',
          value: '৳ 21.50 Cr',
          subtext: '88% of Monthly Target',
          icon: Icons.savings_outlined,
          color: ManagementTheme.successEmerald,
        ),
        _buildMetricTile(
          label: 'Total Overdue',
          value: '৳ 9.45 Cr',
          subtext: 'Across 38 clients',
          icon: Icons.warning_amber_rounded,
          color: ManagementTheme.alertCrimson,
        ),
        _buildMetricTile(
          label: 'Unsold Inventory',
          value: '৳ 185.0 Cr',
          subtext: '142 Units in Gulshan/Uttara',
          icon: Icons.domain,
          color: const Color(0xFFA78BFA),
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
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ManagementTheme.cardDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
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
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: ManagementTheme.textMuted),
              ),
              Icon(icon, size: 16, color: color),
            ],
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            subtext,
            style: const TextStyle(fontSize: 10, color: ManagementTheme.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildBankLiquidityCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.account_balance, color: ManagementTheme.luxuryGold, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Liquid Cash & Bank Balances',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ],
                ),
                Text(
                  '৳ 38.20 Cr',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: ManagementTheme.brightGold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _buildBankRow('Prime Bank Ltd', 'CD A/C: 1102948-001', '৳ 14.80 Cr'),
            const Divider(color: Color(0xFF334155), height: 16),
            _buildBankRow('Eastern Bank PLC', 'SND A/C: 2209182-019', '৳ 11.20 Cr'),
            const Divider(color: Color(0xFF334155), height: 16),
            _buildBankRow('Dutch-Bangla Bank PLC', 'Collection A/C: 440918-091', '৳ 7.45 Cr'),
            const Divider(color: Color(0xFF334155), height: 16),
            _buildBankRow('The City Bank Ltd', 'Escrow A/C: 881029-004', '৳ 4.75 Cr'),
          ],
        ),
      ),
    );
  }

  Widget _buildBankRow(String bank, String acc, String balance) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(bank, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            Text(acc, style: const TextStyle(fontSize: 10, color: ManagementTheme.textMuted)),
          ],
        ),
        Text(
          balance,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
        ),
      ],
    );
  }

  Widget _buildStrategicCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: ManagementTheme.cardDark,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
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
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11, color: ManagementTheme.textMuted),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 16, color: ManagementTheme.textMuted),
          ],
        ),
      ),
    );
  }
}
