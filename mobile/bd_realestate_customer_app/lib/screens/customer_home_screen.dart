import 'package:flutter/material.dart';
import '../core/theme/customer_theme.dart';
import 'property_portfolio_screen.dart';
import 'construction_tracker_screen.dart';
import 'financial_center_screen.dart';
import 'snagging_tool_screen.dart';
import 'dlp_helpdesk_screen.dart';

class CustomerHomeScreen extends StatelessWidget {
  const CustomerHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'CUSTOMER SELF-SERVICE',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
                color: CustomerTheme.luxuryGold,
              ),
            ),
            const Text(
              'Green Horizon Residence',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Homeowner Greeting Banner
            _buildGreetingBanner(),
            const SizedBox(height: 16),

            // Quick Status Highlights
            _buildQuickHighlights(context),
            const SizedBox(height: 20),

            // Functional Module Shortcuts
            const Text(
              'MY APARTMENT SERVICES',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 12),

            _buildServiceCard(
              title: 'My Property Digital Portfolio',
              subtitle: 'Flat specs, parking bay P-14 & signed legal deed downloads',
              icon: Icons.apartment_rounded,
              color: CustomerTheme.midnightNavy,
              badge: 'Unit A-7',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PropertyPortfolioScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildServiceCard(
              title: 'Live Construction Tracker & 360° Tour',
              subtitle: 'Milestone progress (68%), high-res monthly gallery & 360 view',
              icon: Icons.visibility_rounded,
              color: const Color(0xFF2563EB),
              badge: '68% Complete',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ConstructionTrackerScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildServiceCard(
              title: 'Financial Center & Installment Payment',
              subtitle: 'Paid ledger, pay online via bKash/Nagad/Card & instant receipt',
              icon: Icons.payments_rounded,
              color: CustomerTheme.successGreen,
              badge: '৳ 1.10 Cr Paid',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const FinancialCenterScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildServiceCard(
              title: 'Pre-Handover Snagging Tool',
              subtitle: 'Photograph tile scratches or paint flaws for site team fix',
              icon: Icons.checklist_rtl_rounded,
              color: const Color(0xFFD97706),
              badge: '1 In Progress',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SnaggingToolScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildServiceCard(
              title: 'Post-Handover Helpdesk & Association',
              subtitle: '12-Month DLP warranty service & কল্যাণ সমিতি notice board',
              icon: Icons.home_repair_service_rounded,
              color: const Color(0xFF7C3AED),
              badge: 'DLP Active',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const DlpHelpdeskScreen()),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildGreetingBanner() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0A1128), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: const Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: Color(0xFFC5A880),
            child: Icon(Icons.person, color: Color(0xFF0A1128), size: 30),
          ),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome Home, Engr. Mahbubur',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                ),
                SizedBox(height: 3),
                Text(
                  'Unit A-7 • 7th Floor • Green Horizon Tower',
                  style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12),
                ),
                SizedBox(height: 2),
                Text(
                  'Expected Possession: December 2026',
                  style: TextStyle(color: CustomerTheme.brightGold, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickHighlights(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _buildHighlightBox(
            title: 'Construction',
            value: '68%',
            status: 'On Schedule',
            icon: Icons.foundation,
            color: const Color(0xFF2563EB),
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ConstructionTrackerScreen())),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildHighlightBox(
            title: 'Next Installment',
            value: '৳ 20.0 Lac',
            status: 'Due: 15 Nov',
            icon: Icons.credit_card,
            color: CustomerTheme.successGreen,
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FinancialCenterScreen())),
          ),
        ),
      ],
    );
  }

  Widget _buildHighlightBox({
    required String title,
    required String value,
    required String status,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                Icon(icon, size: 16, color: color),
              ],
            ),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 2),
            Text(status, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
          ],
        ),
      ),
    );
  }

  Widget _buildServiceCard({
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
                color: color.withOpacity(0.1),
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
                      color: CustomerTheme.midnightNavy,
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
