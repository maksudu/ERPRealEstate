import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/offline/offline_sync_queue.dart';
import 'anti_tamper_camera_screen.dart';
import 'dpr_entry_screen.dart';
import 'labor_muster_screen.dart';
import 'cube_test_screen.dart';
import 'store_grn_screen.dart';
import 'task_milestone_screen.dart';
import 'material_requisition_screen.dart';
import 'contractor_management_screen.dart';
import 'safety_management_screen.dart';

class SiteDashboardScreen extends StatefulWidget {
  final VoidCallback? onNavigateToDpr;
  final VoidCallback? onNavigateToLabor;
  final VoidCallback? onNavigateToCubes;
  final VoidCallback? onNavigateToStores;

  final VoidCallback? onLogout;
  final VoidCallback? onOpenDrawer;

  const SiteDashboardScreen({
    super.key,
    this.onNavigateToDpr,
    this.onNavigateToLabor,
    this.onNavigateToCubes,
    this.onNavigateToStores,
    this.onLogout,
    this.onOpenDrawer,
  });


  @override
  State<SiteDashboardScreen> createState() => _SiteDashboardScreenState();
}

class _SiteDashboardScreenState extends State<SiteDashboardScreen> {
  final OfflineSyncQueue _syncQueue = OfflineSyncQueue();
  final String _activeProject = 'Green Horizon Tower (Gulshan-2)';
  final String _activeFloor = '8th Floor Slab RCC Casting';

  @override
  void initState() {
    super.initState();
    _syncQueue.addListener(_onQueueChanged);
  }

  @override
  void dispose() {
    _syncQueue.removeListener(_onQueueChanged);
    super.dispose();
  }

  void _onQueueChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: SiteAppTheme.darkNavy),
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
            const Text(
              'SITE OPERATIONS HUB',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.2,
                color: SiteAppTheme.primarySafetyOrange,
              ),
            ),
            Text(
              _activeProject,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: SiteAppTheme.darkNavy,
              ),
            ),
          ],
        ),
        actions: [
          // Live Offline Sync Queue Action & Badge
          IconButton(
            tooltip: 'Sync Offline Data',
            onPressed: () async {
              final messenger = ScaffoldMessenger.of(context);
              if (_syncQueue.pendingCount == 0) {
                messenger.showSnackBar(
                  const SnackBar(
                    content: Text('All construction records are synchronized with Cloud ERP!'),
                    backgroundColor: SiteAppTheme.successGreen,
                  ),
                );
              } else {
                await _syncQueue.syncAll();
                if (mounted) {
                  messenger.showSnackBar(
                    const SnackBar(
                      content: Text('Offline records successfully synchronized with ERP!'),
                      backgroundColor: SiteAppTheme.successGreen,
                    ),
                  );
                }
              }
            },
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  _syncQueue.isSyncing
                      ? Icons.sync
                      : (_syncQueue.pendingCount > 0 ? Icons.cloud_upload : Icons.cloud_done),
                  color: _syncQueue.pendingCount > 0
                      ? SiteAppTheme.primarySafetyOrange
                      : SiteAppTheme.successGreen,
                ),
                if (_syncQueue.pendingCount > 0)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: SiteAppTheme.alertRed,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '${_syncQueue.pendingCount}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.camera_alt, color: SiteAppTheme.primarySafetyOrange),
            tooltip: 'Anti-Tamper Camera',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => AntiTamperCameraScreen(
                    projectName: _activeProject,
                    floorLevel: _activeFloor,
                  ),
                ),
              );
            },
          ),
          if (widget.onLogout != null)
            IconButton(
              icon: const Icon(Icons.logout, color: Color(0xFF64748B), size: 20),
              tooltip: 'Logout',
              onPressed: widget.onLogout,
            ),
          const SizedBox(width: 8),
        ],
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Active Milestone Card with Safety Orange Gradient
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [SiteAppTheme.primarySafetyOrange, Color(0xFFEA580C)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 16, offset: const Offset(0, 6)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('CURRENT STRUCTURAL ACTIVITY', style: TextStyle(color: Colors.white60, fontSize: 10, letterSpacing: 1)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: SiteAppTheme.primarySafetyOrange.withOpacity(0.25),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('IN PROGRESS', style: TextStyle(color: SiteAppTheme.primarySafetyOrange, fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _activeFloor,
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Mix 1:1.5:3 · Target 3500 PSI · Structural Consultant Inspected',
                    style: TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Colors.white24, height: 1),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildHeaderStat('Casting Volume', '320 CFT', Icons.format_paint),
                      _buildHeaderStat('Steel Rebar', '4.85 MT', Icons.architecture),
                      _buildHeaderStat('Site Labor', '70 Men', Icons.groups),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Offline Sync Queue Status Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: _syncQueue.pendingCount > 0 ? Colors.amber.shade50 : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: _syncQueue.pendingCount > 0 ? SiteAppTheme.primarySafetyOrange : const Color(0xFFCBD5E1),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _syncQueue.pendingCount > 0 ? Icons.cloud_upload : Icons.cloud_done,
                    color: _syncQueue.pendingCount > 0 ? SiteAppTheme.primarySafetyOrange : SiteAppTheme.successGreen,
                    size: 22,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _syncQueue.pendingCount > 0
                              ? '${_syncQueue.pendingCount} Offline Records in Local Isar Queue'
                              : 'Local Database Fully Synchronized',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                        Text(
                          _syncQueue.pendingCount > 0
                              ? 'Queued locally: Ready to push when network restores'
                              : 'All DPRs, Cube Tests, and GRNs safely backed up to Cloud ERP',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  if (_syncQueue.pendingCount > 0)
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: SiteAppTheme.primarySafetyOrange,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        visualDensity: VisualDensity.compact,
                      ),
                      onPressed: () => _syncQueue.syncAll(),
                      child: const Text('Sync Now', style: TextStyle(fontSize: 11)),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Site Quick Navigation Operational Cards
            const Text(
              'Site Engineering Workflows',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: SiteAppTheme.darkNavy),
            ),
            const SizedBox(height: 12),

            _buildNavCard(
              title: 'Daily Progress Report (DPR)',
              subtitle: 'Log concrete volume (CFT), rod (MT), and daily narrative',
              icon: Icons.assignment_outlined,
              badge: 'Offline-First',
              color: SiteAppTheme.primarySafetyOrange,
              onTap: widget.onNavigateToDpr ??
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const DprEntryScreen())),
            ),
            const SizedBox(height: 10),

            _buildNavCard(
              title: 'Anti-Tamper Watermarked Camera',
              subtitle: 'Gallery disabled; burns GPS, Floor, Date & SHA-256 hash',
              icon: Icons.camera_alt_outlined,
              badge: 'Tamper-Proof',
              color: Colors.teal,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => AntiTamperCameraScreen(projectName: _activeProject, floorLevel: _activeFloor),
                ),
              ),
            ),
            const SizedBox(height: 10),

            _buildNavCard(
              title: 'Subcontractor Labor Muster Roll',
              subtitle: 'Headcount by trade (Masons, Rod-binders, Plumbers) & wages',
              icon: Icons.groups_outlined,
              badge: 'Wage Engine',
              color: Colors.indigo,
              onTap: widget.onNavigateToLabor ??
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LaborMusterScreen())),
            ),
            const SizedBox(height: 10),

            _buildNavCard(
              title: 'Concrete Cube Crushing Test Tracker',
              subtitle: 'Day 7, Day 14, Day 28 UTM strength alerts with lab photos',
              icon: Icons.science_outlined,
              badge: 'UTM Testing',
              color: Colors.deepPurple,
              onTap: widget.onNavigateToCubes ??
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CubeTestScreen())),
            ),
            const SizedBox(height: 10),

            _buildNavCard(
              title: 'Site Store Delivery Challan (GRN)',
              subtitle: 'Incoming truck challan scanner & PO verification match',
              icon: Icons.inventory_2_outlined,
              badge: 'PO Matching',
              color: const Color(0xFF0F172A),
              onTap: widget.onNavigateToStores ??
                  () => Navigator.push(context, MaterialPageRoute(builder: (_) => const StoreGrnScreen())),
            ),
            const SizedBox(height: 10),

            _buildNavCard(
              title: 'Task & Milestone Schedule',
              subtitle: 'Assign tasks, set planned deadlines and update progress',
              icon: Icons.alt_route,
              badge: 'WBS Engine',
              color: Colors.blue.shade700,
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TaskMilestoneScreen())),
            ),
            const SizedBox(height: 10),

            _buildNavCard(
              title: 'Site Material Requisition (SMR)',
              subtitle: 'Request cement, steel, bricks, sand & formwork plywood',
              icon: Icons.shopping_cart_checkout,
              badge: 'Store Requisition',
              color: Colors.teal.shade700,
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MaterialRequisitionScreen())),
            ),
            const SizedBox(height: 10),

            _buildNavCard(
              title: 'Contractor Management & JMS',
              subtitle: 'Work progress, joint measurement sheets & RA bills',
              icon: Icons.engineering_outlined,
              badge: 'JMS Verification',
              color: Colors.brown.shade700,
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ContractorManagementScreen())),
            ),
            const SizedBox(height: 10),

            _buildNavCard(
              title: 'Safety, EHS Incidents & NCR',
              subtitle: 'Site inspections, defect logging and CAPA rectification',
              icon: Icons.warning_amber_rounded,
              badge: 'Safety First',
              color: SiteAppTheme.alertRed,
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SafetyManagementScreen())),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderStat(String label, String value, IconData icon) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: SiteAppTheme.primarySafetyOrange),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10)),
          ],
        ),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
      ],
    );
  }

  Widget _buildNavCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required String badge,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 3)),
        ],
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
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              title,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: SiteAppTheme.darkNavy),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: color.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              badge,
                              style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(subtitle, style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
