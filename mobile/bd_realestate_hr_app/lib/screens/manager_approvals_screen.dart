import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../core/network/api_client.dart';

class ManagerApprovalsScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const ManagerApprovalsScreen({super.key, this.onOpenDrawer});

  @override
  State<ManagerApprovalsScreen> createState() => _ManagerApprovalsScreenState();
}

class _ManagerApprovalsScreenState extends State<ManagerApprovalsScreen> with SingleTickerProviderStateMixin {
  final _api = HrApiClient();
  late TabController _tabController;
  bool _isLoading = true;
  List<dynamic> _leaves = [];
  List<dynamic> _overtimes = [];
  List<dynamic> _requests = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadApprovals();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadApprovals() async {
    setState(() => _isLoading = true);
    try {
      final lRes = await _api.getManagerLeaveRequests();
      final otRes = await _api.getManagerOvertimeRequests();
      final reqRes = await _api.getEmployeeRequests();
      if (mounted) {
        setState(() {
          _leaves = lRes['requests'] ?? [];
          _overtimes = otRes['requests'] ?? [];
          _requests = reqRes['requests'] ?? [];
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _leaves = [
            {'id': 501, 'employee_name': 'Tanvir Ahmed', 'employee_code': 'EMP-1044', 'department': 'Architecture', 'leave_type': 'Casual Leave', 'start_date': '2026-10-22', 'end_date': '2026-10-23', 'total_days': 2, 'reason': 'Personal family matters'},
          ];
          _overtimes = [
            {'id': 601, 'employee_name': 'Rafiqul Islam', 'employee_code': 'EMP-1049', 'hours': 3.5, 'date': '2026-10-19', 'project': 'Sky Heights', 'reason': 'Slab casting night audit'},
          ];
          _requests = [
            {'id': 701, 'type': 'SALARY_ADVANCE', 'employee': 'Abdur Rashid (EMP-1060)', 'amount_bdt': 25000.0, 'reason': 'Medical emergency', 'date': '2026-10-19'},
          ];
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _actionLeave(int id, String action) async {
    await _api.actionManagerLeave(id, action);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: action == 'APPROVED' ? HrTheme.successTeal : HrTheme.alertCrimson, content: Text('Leave request #$id $action!')),
      );
      _loadApprovals();
    }
  }

  Future<void> _actionOvertime(int id, String action) async {
    await _api.actionManagerOvertime(id, action);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: action == 'APPROVED' ? HrTheme.successTeal : HrTheme.alertCrimson, content: Text('Overtime request #$id $action!')),
      );
      _loadApprovals();
    }
  }

  Future<void> _actionRequest(int id, String action) async {
    await _api.actionEmployeeRequest(id, action);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: action == 'APPROVED' ? HrTheme.successTeal : HrTheme.alertCrimson, content: Text('Request #$id $action!')),
      );
      _loadApprovals();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: HrTheme.deepNavy),
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
        title: const Text('Team Approvals Center', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: HrTheme.primaryIndigo,
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: HrTheme.primaryIndigo,
          tabs: const [
            Tab(text: 'Leaves'),
            Tab(text: 'Overtime'),
            Tab(text: 'Loans & Req'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: HrTheme.primaryIndigo))
          : TabBarView(
              controller: _tabController,
              children: [
                // 1. Leave Requests Tab
                RefreshIndicator(
                  onRefresh: _loadApprovals,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _leaves.length,
                    itemBuilder: (ctx, idx) {
                      final l = _leaves[idx];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        color: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: HrTheme.slateBorder),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(l['employee_name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: HrTheme.deepNavy)),
                                  Text('${l['total_days']} Days', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.primaryIndigo)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text('${l['employee_code']} • ${l['department']}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                              const SizedBox(height: 6),
                              Text('Dates: ${l['start_date']} to ${l['end_date']} (${l['leave_type']})', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                              Text('Reason: ${l['reason']}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  OutlinedButton(
                                    style: OutlinedButton.styleFrom(foregroundColor: HrTheme.alertCrimson),
                                    onPressed: () => _actionLeave(l['id'], 'REJECTED'),
                                    child: const Text('Reject'),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(backgroundColor: HrTheme.successTeal, foregroundColor: Colors.white),
                                    onPressed: () => _actionLeave(l['id'], 'APPROVED'),
                                    child: const Text('Approve Leave'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                // 2. Overtime Tab
                RefreshIndicator(
                  onRefresh: _loadApprovals,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _overtimes.length,
                    itemBuilder: (ctx, idx) {
                      final ot = _overtimes[idx];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        color: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: HrTheme.slateBorder),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(ot['employee_name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: HrTheme.deepNavy)),
                                  Text('${ot['hours']} Hours', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.amberWarning)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text('${ot['employee_code']} • Project: ${ot['project']}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                              Text('Date: ${ot['date']} • Reason: ${ot['reason']}', style: const TextStyle(fontSize: 12)),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  OutlinedButton(
                                    style: OutlinedButton.styleFrom(foregroundColor: HrTheme.alertCrimson),
                                    onPressed: () => _actionOvertime(ot['id'], 'REJECTED'),
                                    child: const Text('Reject'),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(backgroundColor: HrTheme.successTeal, foregroundColor: Colors.white),
                                    onPressed: () => _actionOvertime(ot['id'], 'APPROVED'),
                                    child: const Text('Authorize OT'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

                // 3. Loans & Requests Tab
                RefreshIndicator(
                  onRefresh: _loadApprovals,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _requests.length,
                    itemBuilder: (ctx, idx) {
                      final r = _requests[idx];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        color: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: HrTheme.slateBorder),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(r['employee'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: HrTheme.deepNavy)),
                                  Text('৳ ${r['amount_bdt'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.primaryIndigo)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text('Type: ${r['type']} • Reason: ${r['reason']}', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  OutlinedButton(
                                    style: OutlinedButton.styleFrom(foregroundColor: HrTheme.alertCrimson),
                                    onPressed: () => _actionRequest(r['id'], 'REJECTED'),
                                    child: const Text('Reject'),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(backgroundColor: HrTheme.successTeal, foregroundColor: Colors.white),
                                    onPressed: () => _actionRequest(r['id'], 'APPROVED'),
                                    child: const Text('Approve Request'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
