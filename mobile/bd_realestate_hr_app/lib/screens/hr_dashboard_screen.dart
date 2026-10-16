import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import 'geofenced_attendance_screen.dart';
import 'leave_management_screen.dart';
import 'payslip_vault_screen.dart';
import 'project_timesheet_screen.dart';

class HrDashboardScreen extends StatelessWidget {
  const HrDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'HR & FIELD WORKFORCE',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
                color: HrTheme.primaryIndigo,
              ),
            ),
            Text(
              'Employee Self-Service Portal',
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
            // Employee Profile Card
            _buildProfileBanner(),
            const SizedBox(height: 16),

            // Today's Clock-in Status
            _buildTodayClockCard(context),
            const SizedBox(height: 16),

            // Attendance KPI Grid
            _buildAttendanceGrid(),
            const SizedBox(height: 20),

            // Functional Modules
            const Text(
              'EMPLOYEE OPERATIONS MODULES',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 12),

            _buildModuleCard(
              title: 'Geofenced Attendance & Liveness',
              subtitle: '50-metre boundary polygon check & anti-spoof facial blink',
              icon: Icons.fingerprint_rounded,
              color: HrTheme.primaryIndigo,
              badge: '50m Radius',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const GeofencedAttendanceScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildModuleCard(
              title: 'Leave Management & Balances',
              subtitle: 'Casual, Sick (with medical certificate) & Earned balances',
              icon: Icons.calendar_month_rounded,
              color: HrTheme.successTeal,
              badge: '10 CL Left',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LeaveManagementScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildModuleCard(
              title: 'Encrypted Digital Payslip Vault',
              subtitle: 'Basic, House Rent, PF, TDS & password-protected PDF slip',
              icon: Icons.lock_person_rounded,
              color: const Color(0xFF0F172A),
              badge: 'Sep 2026 Ready',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PayslipVaultScreen()),
              ),
            ),
            const SizedBox(height: 12),

            _buildModuleCard(
              title: 'Project Daily Timesheet',
              subtitle: 'Site engineers log daily project hours for job-costing',
              icon: Icons.access_time_filled_rounded,
              color: HrTheme.amberWarning,
              badge: '5.5 hrs Booked',
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProjectTimesheetScreen()),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF312E81), Color(0xFF4338CA)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: const Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: Color(0xFF818CF8),
            child: Icon(Icons.person, color: Colors.white, size: 30),
          ),
          SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Md. Tanvir Hossain',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                ),
                SizedBox(height: 3),
                Text(
                  'Senior Project Engineer (Emp ID: EMP-1049)',
                  style: TextStyle(color: Color(0xFFC7D2FE), fontSize: 12),
                ),
                SizedBox(height: 1),
                Text(
                  'Civil Construction Division • Gulshan Projects',
                  style: TextStyle(color: Color(0xFFA5B4FC), fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTodayClockCard(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Row(
              children: [
                Icon(Icons.access_time_rounded, color: HrTheme.successTeal, size: 28),
                SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Today's Attendance", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    SizedBox(height: 2),
                    Text('Clocked In: 08:52 AM (Gulshan HO)', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  ],
                ),
              ],
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: HrTheme.successTeal,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                minimumSize: Size.zero,
              ),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const GeofencedAttendanceScreen()),
              ),
              child: const Text('Verify', style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttendanceGrid() {
    return GridView.count(
      crossAxisCount: 3,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.3,
      children: [
        _buildStatTile('Present', '21 Days', HrTheme.successTeal),
        _buildStatTile('Leaves', '1 Day', HrTheme.primaryIndigo),
        _buildStatTile('Late In', '0 Days', HrTheme.amberWarning),
      ],
    );
  }

  Widget _buildStatTile(String label, String val, Color color) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: HrTheme.slateBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF64748B))),
          const SizedBox(height: 4),
          Text(val, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _buildModuleCard({
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
          border: Border.all(color: HrTheme.slateBorder),
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
                      color: HrTheme.deepNavy,
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
