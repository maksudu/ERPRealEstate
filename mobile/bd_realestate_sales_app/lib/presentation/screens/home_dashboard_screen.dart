import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';

class HomeDashboardScreen extends StatefulWidget {
  final VoidCallback onNavigateToMatrix;
  final VoidCallback onNavigateToLeads;
  final VoidCallback onNavigateToCustomers;
  final VoidCallback onNavigateToVisits;
  final VoidCallback onNavigateToBookings;
  final VoidCallback onNavigateToQuotations;
  final VoidCallback onNavigateToApprovals;
  final VoidCallback? onOpenDrawer;

  const HomeDashboardScreen({
    super.key,
    required this.onNavigateToMatrix,
    required this.onNavigateToLeads,
    required this.onNavigateToCustomers,
    required this.onNavigateToVisits,
    required this.onNavigateToBookings,
    required this.onNavigateToQuotations,
    required this.onNavigateToApprovals,
    this.onOpenDrawer,
  });

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  final _api = ApiClient();
  bool _isLoading = false;
  Map<String, dynamic>? _dash;

  @override
  void initState() {
    super.initState();
    _loadDashboard();
  }

  Future<void> _loadDashboard() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getDashboard();
      setState(() => _dash = res);
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final kpis = _dash?['kpis'] as Map<String, dynamic>? ?? {};
    final pipeline = (_dash?['pipeline'] as List?) ?? [];
    final todayTasks = (_dash?['today_tasks'] as List?) ?? [];
    final upcomingVisits = (_dash?['upcoming_visits'] as List?) ?? [];
    final user = _api.currentUser;

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
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              user != null ? '${user['full_name_en'] ?? 'Sales Executive'}' : 'Sales Cockpit',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0F172A)),
            ),
            const Text(
              'BlueOceans Real Estate · Dhaka',
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.primaryTeal),
            onPressed: _loadDashboard,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
          : RefreshIndicator(
              onRefresh: _loadDashboard,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Target Achievement Gradient Banner
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF0D9488), Color(0xFF0284C7)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(color: AppTheme.primaryTeal.withOpacity(0.2), blurRadius: 15, offset: const Offset(0, 5)),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Confirmed Bookings (Total)', style: TextStyle(color: Colors.white70, fontSize: 12)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(10)),
                                child: Text(
                                  'Conv. Rate: ${kpis['conversion_rate'] ?? 12.5}%',
                                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            CurrencyFormatter.formatBDT((kpis['bookings_value'] ?? 285000000.0).toDouble()),
                            style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('${kpis['bookings'] ?? 18} Units Booked', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                              Text('${kpis['conversions_this_month'] ?? 4} this month', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Key Performance Metrics Grid
                    const Text('Performance Indicators', style: TextStyle(color: Color(0xFF0F172A), fontSize: 15, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _kpiTile(
                            'Total Leads',
                            '${kpis['total_leads'] ?? 0}',
                            '+${kpis['new_leads_today'] ?? 0} today',
                            Icons.people_outline,
                            const Color(0xFF2563EB),
                            widget.onNavigateToLeads,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _kpiTile(
                            'New Inquiries',
                            '${kpis['new_leads'] ?? 0}',
                            'Unassigned & New',
                            Icons.person_add_outlined,
                            const Color(0xFF059669),
                            widget.onNavigateToLeads,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _kpiTile(
                            'Follow-ups',
                            '${kpis['follow_ups'] ?? 0}',
                            '${kpis['follow_ups_overdue'] ?? 0} Overdue',
                            Icons.alarm,
                            const Color(0xFFD97706),
                            widget.onNavigateToVisits,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _kpiTile(
                            'Site Visits',
                            '${kpis['site_visits'] ?? 0}',
                            '${kpis['site_visits_upcoming'] ?? 0} Upcoming',
                            Icons.location_city,
                            const Color(0xFF7C3AED),
                            widget.onNavigateToVisits,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Quick Action Hub
                    const Text('Sales Workflows', style: TextStyle(color: Color(0xFF0F172A), fontSize: 15, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        _quickButton(Icons.request_quote, 'Quotation', const Color(0xFF059669), widget.onNavigateToQuotations),
                        const SizedBox(width: 10),
                        _quickButton(Icons.book_online, 'Bookings', const Color(0xFF0284C7), widget.onNavigateToBookings),
                        const SizedBox(width: 10),
                        _quickButton(Icons.grid_view, 'Units Matrix', AppTheme.primaryTeal, widget.onNavigateToMatrix),
                        const SizedBox(width: 10),
                        _quickButton(Icons.verified, 'Approvals', const Color(0xFFD97706), widget.onNavigateToApprovals),
                      ],
                    ),
                    const SizedBox(height: 22),

                    // Sales Pipeline Breakdown
                    if (pipeline.isNotEmpty) ...[
                      const Text('Sales Funnel Pipeline', style: TextStyle(color: Color(0xFF0F172A), fontSize: 15, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                          boxShadow: [
                            BoxShadow(color: const Color(0xFF0F172A).withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 3)),
                          ],
                        ),
                        child: Column(
                          children: pipeline.map((p) {
                            final stage = p['stage'] as String? ?? '';
                            final count = p['count'] as int? ?? 0;
                            final total = (kpis['total_leads'] as int?) ?? 1;
                            final pct = total > 0 ? (count / total).clamp(0.05, 1.0) : 0.1;

                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(stage.replaceAll('_', ' '), style: const TextStyle(color: Color(0xFF334155), fontSize: 12, fontWeight: FontWeight.w500)),
                                      Text('$count', style: const TextStyle(color: AppTheme.primaryTeal, fontWeight: FontWeight.bold, fontSize: 12)),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: pct,
                                      minHeight: 6,
                                      backgroundColor: const Color(0xFFF1F5F9),
                                      valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryTeal),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      const SizedBox(height: 22),
                    ],

                    // Today's Follow-up Agenda
                    if (todayTasks.isNotEmpty) ...[
                      const Text("Today's Overdue & Due Reminders", style: TextStyle(color: Color(0xFF0F172A), fontSize: 15, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      ...todayTasks.take(4).map((t) => Card(
                            color: Colors.white,
                            margin: const EdgeInsets.only(bottom: 8),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                            ),
                            child: ListTile(
                              leading: const Icon(Icons.alarm_on, color: Color(0xFFF59E0B)),
                              title: Text(t['title'] ?? 'Follow-up', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.bold)),
                              subtitle: Text('${t['lead_name'] ?? t['customer_name'] ?? 'Client'} · Due ${t['due_date']?.substring(11, 16) ?? ''}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                              trailing: const Icon(Icons.arrow_forward_ios, color: Color(0xFF94A3B8), size: 12),
                              onTap: widget.onNavigateToVisits,
                            ),
                          )),
                      const SizedBox(height: 14),
                    ],

                    // Upcoming Site Visits Agenda
                    if (upcomingVisits.isNotEmpty) ...[
                      const Text("Upcoming Site Visits", style: TextStyle(color: Color(0xFF0F172A), fontSize: 15, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      ...upcomingVisits.take(3).map((v) => Card(
                            color: Colors.white,
                            margin: const EdgeInsets.only(bottom: 8),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                            ),
                            child: ListTile(
                              leading: const Icon(Icons.location_city, color: Color(0xFF8B5CF6)),
                              title: Text(v['project_name'] ?? 'Site Visit', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.bold)),
                              subtitle: Text('${v['lead_name'] ?? 'Client'} · ${v['meeting_location'] ?? 'Site'}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                              trailing: const Icon(Icons.arrow_forward_ios, color: Color(0xFF94A3B8), size: 12),
                              onTap: widget.onNavigateToVisits,
                            ),
                          )),
                    ],
                  ],
                ),
              ),
            ),
    );
  }

  Widget _kpiTile(String title, String count, String subtitle, IconData icon, Color color, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(color: const Color(0xFF0F172A).withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 3)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w500)),
                Icon(icon, color: color, size: 18),
              ],
            ),
            const SizedBox(height: 8),
            Text(count, style: const TextStyle(color: Color(0xFF0F172A), fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 2),
            Text(subtitle, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _quickButton(IconData icon, String label, Color color, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(color: const Color(0xFF0F172A).withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 2)),
            ],
          ),
          child: Column(
            children: [
              Icon(icon, color: color, size: 22),
              const SizedBox(height: 6),
              Text(label, style: const TextStyle(color: Color(0xFF334155), fontSize: 10, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}
