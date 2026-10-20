import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../core/network/api_client.dart';
import 'project_performance_screen.dart';
import 'sales_analytics_screen.dart';
import 'cashflow_monitoring_screen.dart';
import 'approval_center_screen.dart';
import 'procurement_monitoring_screen.dart';
import 'construction_monitoring_screen.dart';
import 'hr_overview_screen.dart';
import 'compliance_alerts_screen.dart';
import 'management_reports_screen.dart';

class ExecutiveDashboardScreen extends StatefulWidget {
  final VoidCallback? onLogout;
  final VoidCallback? onOpenDrawer;

  const ExecutiveDashboardScreen({super.key, this.onLogout, this.onOpenDrawer});

  @override
  State<ExecutiveDashboardScreen> createState() => _ExecutiveDashboardScreenState();
}

class _ExecutiveDashboardScreenState extends State<ExecutiveDashboardScreen> {
  final _api = ManagementApiClient();
  bool _isLoading = true;
  Map<String, dynamic>? _dashboardData;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() => _isLoading = true);
    try {
      final data = await _api.getExecutiveDashboard();
      if (mounted) setState(() => _dashboardData = data);
    } catch (_) {
      // Graceful fallback values
      if (mounted) {
        setState(() {
          _dashboardData = {
            'kpis': {
              'total_revenue_bdt': 148500000.0,
              'total_expenses_bdt': 64200000.0,
              'net_profit_bdt': 84300000.0,
              'profit_margin_pct': 56.8,
              'actual_collections_bdt': 52800000.0,
              'monthly_target_bdt': 60000000.0,
              'target_achievement_pct': 88.0,
              'outstanding_receivables_bdt': 92500000.0,
              'active_projects': 6,
              'pending_approvals': 4,
              'total_units': 240,
              'booked_units': 184,
              'occupancy_rate_pct': 76.6,
            },
            'monthly_trend': [
              {'month': 'May', 'revenue_cr': 8.4, 'collection_cr': 4.1},
              {'month': 'Jun', 'revenue_cr': 9.2, 'collection_cr': 5.2},
              {'month': 'Jul', 'revenue_cr': 11.5, 'collection_cr': 6.8},
              {'month': 'Aug', 'revenue_cr': 10.8, 'collection_cr': 5.9},
              {'month': 'Sep', 'revenue_cr': 13.2, 'collection_cr': 7.4},
              {'month': 'Oct', 'revenue_cr': 14.8, 'collection_cr': 8.2},
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
    final kpis = _dashboardData?['kpis'] ?? {};

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
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
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'BOARDROOM COCKPIT',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.4,
                color: ManagementTheme.luxuryGold,
              ),
            ),
            Text(
              'Executive Performance Radar',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: ManagementTheme.royalNavy, size: 20),
            tooltip: 'Refresh Radar',
            onPressed: _loadDashboard,
          ),
          if (widget.onLogout != null)
            IconButton(
              icon: const Icon(Icons.logout, color: ManagementTheme.textMuted, size: 20),
              tooltip: 'Logout',
              onPressed: widget.onLogout,
            ),
          const SizedBox(width: 4),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: ManagementTheme.royalNavy))
          : RefreshIndicator(
              onRefresh: _loadDashboard,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Pending Approvals Urgent Alert Banner
                    _buildPendingApprovalsPill(context, kpis['pending_approvals'] ?? 0),
                    const SizedBox(height: 16),

                    // Top Revenue & Profitability Card
                    _buildProfitabilityCard(kpis),
                    const SizedBox(height: 16),

                    // Cash Collections & Receivables Row
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricTile(
                            title: 'COLLECTIONS (MTD)',
                            value: '৳ ${(kpis['actual_collections_bdt'] / 10000000).toStringAsFixed(2)} Cr',
                            subtitle: '${kpis['target_achievement_pct']}% of Target',
                            icon: Icons.account_balance_wallet,
                            iconColor: ManagementTheme.successEmerald,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildMetricTile(
                            title: 'OUTSTANDING DUES',
                            value: '৳ ${(kpis['outstanding_receivables_bdt'] / 10000000).toStringAsFixed(2)} Cr',
                            subtitle: 'Aging Overdue Alert',
                            icon: Icons.timer,
                            iconColor: ManagementTheme.alertCrimson,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Inventory & Occupancy Row
                    Row(
                      children: [
                        Expanded(
                          child: _buildMetricTile(
                            title: 'BOOKED INVENTORY',
                            value: '${kpis['booked_units']} / ${kpis['total_units']}',
                            subtitle: '${kpis['occupancy_rate_pct']}% Units Sold',
                            icon: Icons.apartment,
                            iconColor: ManagementTheme.luxuryGold,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildMetricTile(
                            title: 'ACTIVE SITES',
                            value: '${kpis['active_projects']} Projects',
                            subtitle: 'Under Execution',
                            icon: Icons.foundation,
                            iconColor: const Color(0xFF2563EB),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Executive Modules Hub
                    const Text(
                      'STRATEGIC ENTERPRISE MODULES',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.1,
                        color: ManagementTheme.textMuted,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildModulesGrid(context),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildPendingApprovalsPill(BuildContext context, int count) {
    return InkWell(
      onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => const ApprovalCenterScreen()));
      },
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFBEB),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFFDE68A)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(color: Color(0xFFF59E0B), shape: BoxShape.circle),
              child: const Icon(Icons.rule_folder, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$count Pending Executive Approvals',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF92400E)),
                  ),
                  const Text('POs, discounts, refunds & contractor bills', style: TextStyle(fontSize: 11, color: Color(0xFFB45309))),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFF92400E)),
          ],
        ),
      ),
    );
  }

  Widget _buildProfitabilityCard(Map<String, dynamic> kpis) {
    final revenue = (kpis['total_revenue_bdt'] ?? 0.0) / 10000000;
    final expense = (kpis['total_expenses_bdt'] ?? 0.0) / 10000000;
    final profit = (kpis['net_profit_bdt'] ?? 0.0) / 10000000;
    final margin = kpis['profit_margin_pct'] ?? 0.0;

    return Card(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: ManagementTheme.borderSubtle),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'NET PROFITABILITY (YTD)',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: ManagementTheme.textMuted),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: ManagementTheme.successEmerald.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '+$margin% Margin',
                    style: const TextStyle(color: ManagementTheme.successEmerald, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              '৳ ${profit.toStringAsFixed(2)} Crore',
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy),
            ),
            const SizedBox(height: 16),
            const Divider(color: Color(0xFFF1F5F9)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Revenue', style: TextStyle(fontSize: 11, color: ManagementTheme.textMuted)),
                      const SizedBox(height: 2),
                      Text('৳ ${revenue.toStringAsFixed(2)} Cr', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: ManagementTheme.royalNavy)),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Operational Expense', style: TextStyle(fontSize: 11, color: ManagementTheme.textMuted)),
                      const SizedBox(height: 2),
                      Text('৳ ${expense.toStringAsFixed(2)} Cr', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: ManagementTheme.alertCrimson)),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricTile({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
  }) {
    return Card(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: ManagementTheme.borderSubtle),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.8, color: ManagementTheme.textMuted)),
                Icon(icon, size: 18, color: iconColor),
              ],
            ),
            const SizedBox(height: 10),
            Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy)),
            const SizedBox(height: 4),
            Text(subtitle, style: TextStyle(fontSize: 11, color: iconColor, fontWeight: FontWeight.w500)),
          ],
        ),
      ),
    );
  }

  Widget _buildModulesGrid(BuildContext context) {
    final modules = [
      {'title': 'Project Performance', 'subtitle': 'S-Curve & Budget Variance', 'icon': Icons.show_chart, 'page': const ProjectPerformanceScreen()},
      {'title': 'Sales Analytics', 'subtitle': 'Velocity & Unsold Inventory', 'icon': Icons.insights, 'page': const SalesAnalyticsScreen()},
      {'title': 'Cash Flow Monitoring', 'subtitle': 'Liquidity & Payables Forecast', 'icon': Icons.monetization_on_outlined, 'page': const CashflowMonitoringScreen()},
      {'title': 'Approval Center', 'subtitle': 'PO, Discount & Refund Queue', 'icon': Icons.verified, 'page': const ApprovalCenterScreen()},
      {'title': 'Procurement Monitor', 'subtitle': 'Requisitions, Quotations & POs', 'icon': Icons.local_shipping_outlined, 'page': const ProcurementMonitoringScreen()},
      {'title': 'Construction Radar', 'subtitle': 'Milestones & Delayed Activities', 'icon': Icons.engineering_outlined, 'page': const ConstructionMonitoringScreen()},
      {'title': 'HRMS Overview', 'subtitle': 'Headcount, Attendance & Payroll', 'icon': Icons.badge_outlined, 'page': const HrOverviewScreen()},
      {'title': 'Compliance & Legal', 'subtitle': 'Permits, RAJUK & Tax Deadlines', 'icon': Icons.gavel_outlined, 'page': const ComplianceAlertsScreen()},
      {'title': 'Reports & Briefs', 'subtitle': 'Boardroom PDF Summaries', 'icon': Icons.picture_as_pdf_outlined, 'page': const ManagementReportsScreen()},
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: modules.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.45,
      ),
      itemBuilder: (context, idx) {
        final m = modules[idx];
        return Card(
          color: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: ManagementTheme.borderSubtle),
          ),
          child: InkWell(
            onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => m['page'] as Widget));
            },
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(m['icon'] as IconData, color: ManagementTheme.royalNavy, size: 24),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        m['title'] as String,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: ManagementTheme.royalNavy),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        m['subtitle'] as String,
                        style: const TextStyle(fontSize: 10, color: ManagementTheme.textMuted),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
