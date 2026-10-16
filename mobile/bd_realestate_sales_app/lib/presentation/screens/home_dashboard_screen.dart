import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/unit_matrix/unit_matrix_bloc.dart';
import '../bloc/unit_matrix/unit_matrix_state.dart';
import '../bloc/lead/lead_bloc.dart';
import '../bloc/lead/lead_state.dart';
import '../../core/theme/app_theme.dart';

class HomeDashboardScreen extends StatelessWidget {
  final VoidCallback onNavigateToMatrix;
  final VoidCallback onNavigateToLeads;
  final VoidCallback onNavigateToCalculator;

  const HomeDashboardScreen({
    super.key,
    required this.onNavigateToMatrix,
    required this.onNavigateToLeads,
    required this.onNavigateToCalculator,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Sales Executive Cockpit', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
            Text('Prime Residency Project · Dhaka', style: TextStyle(color: Colors.grey, fontSize: 11)),
          ],
        ),
        actions: [
          CircleAvatar(
            backgroundColor: AppTheme.primaryTeal.withOpacity(0.15),
            child: const Text('SR', style: TextStyle(color: AppTheme.primaryTeal, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quota Achievement Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryDark, Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.15),
                    blurRadius: 15,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Monthly Quota Achievement',
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppTheme.successGreen.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          '80% Achieved',
                          style: TextStyle(color: AppTheme.successGreen, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    '৳ ২,৮০,০০,০০০ / ৳ ৩,৫০,০০,০০০',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: const LinearProgressIndicator(
                      value: 0.80,
                      minHeight: 8,
                      backgroundColor: Color(0xFF334155),
                      valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryTeal),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Remaining: ৳ ৭০,০০,০০০', style: TextStyle(color: Colors.white60, fontSize: 11)),
                      Text('Target Date: 31 Oct', style: TextStyle(color: Colors.grey.shade400, fontSize: 11)),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Live KPI Counters connected to BLoCs
            Row(
              children: [
                Expanded(
                  child: BlocBuilder<UnitMatrixBloc, UnitMatrixState>(
                    builder: (context, matrixState) {
                      return _buildKpiCard(
                        'Available Units',
                        '${matrixState.availableCount}',
                        Icons.check_circle_outline,
                        AppTheme.successGreen,
                        onNavigateToMatrix,
                      );
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: BlocBuilder<UnitMatrixBloc, UnitMatrixState>(
                    builder: (context, matrixState) {
                      return _buildKpiCard(
                        '15-Min Mutex Locks',
                        '${matrixState.onHoldCount}',
                        Icons.lock_clock,
                        AppTheme.accentAmber,
                        onNavigateToMatrix,
                      );
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: BlocBuilder<LeadBloc, LeadState>(
                    builder: (context, leadState) {
                      return _buildKpiCard(
                        'Omnichannel Leads',
                        '${leadState.allLeads.length}',
                        Icons.people_outline,
                        Colors.indigo,
                        onNavigateToLeads,
                      );
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildKpiCard(
                    'Payment Calculator',
                    'EMI & PDF',
                    Icons.calculate_outlined,
                    AppTheme.primaryTeal,
                    onNavigateToCalculator,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Quick Access Action Tiles
            const Text(
              'Sales Operations & Workflows',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 12),

            _buildActionTile(
              title: 'Interactive Flat Matrix Grid',
              subtitle: 'View color-coded units, floor escalation & 15-min mutex locks',
              icon: Icons.grid_view_rounded,
              color: AppTheme.primaryTeal,
              onTap: onNavigateToMatrix,
            ),
            const SizedBox(height: 10),
            _buildActionTile(
              title: 'Omnichannel Lead CRM & Call Logger',
              subtitle: 'Facebook/Web leads with auto call-log & duration tracking',
              icon: Icons.contact_phone_outlined,
              color: const Color(0xFF1877F2),
              onTap: onNavigateToLeads,
            ),
            const SizedBox(height: 10),
            _buildActionTile(
              title: 'BDT EMI & Installment Calculator',
              subtitle: 'Customize Down Payment & Tenure; share PDF schedule on WhatsApp',
              icon: Icons.calculate,
              color: AppTheme.accentAmber,
              onTap: onNavigateToCalculator,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildKpiCard(String label, String value, IconData icon, Color color, VoidCallback onTap) {
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 12),
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
          ],
        ),
      ),
    );
  }

  Widget _buildActionTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 2),
                      Text(subtitle, style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
