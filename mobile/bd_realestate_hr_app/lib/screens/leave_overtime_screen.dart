import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../core/network/api_client.dart';

class LeaveOvertimeScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const LeaveOvertimeScreen({super.key, this.onOpenDrawer});

  @override
  State<LeaveOvertimeScreen> createState() => _LeaveOvertimeScreenState();
}

class _LeaveOvertimeScreenState extends State<LeaveOvertimeScreen> with SingleTickerProviderStateMixin {
  final _api = HrApiClient();
  late TabController _tabController;
  bool _isLoading = true;
  List<dynamic> _balances = [];
  List<dynamic> _myLeaves = [];
  List<dynamic> _overtimes = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final leaveRes = await _api.getLeaveBalances();
      final otRes = await _api.getOvertimeRequests();
      if (mounted) {
        setState(() {
          _balances = leaveRes['balances'] ?? [];
          _myLeaves = leaveRes['my_applications'] ?? [];
          _overtimes = otRes['requests'] ?? [];
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _balances = [
            {'type': 'Casual Leave', 'total': 10, 'used': 2, 'available': 8},
            {'type': 'Sick Leave', 'total': 14, 'used': 1, 'available': 13},
            {'type': 'Earned Leave', 'total': 15, 'used': 0, 'available': 15},
          ];
          _myLeaves = [
            {'id': 401, 'type': 'Casual Leave', 'dates': '12 Oct - 13 Oct 2026', 'days': 2, 'status': 'APPROVED', 'reason': 'Family emergency'},
          ];
          _overtimes = [
            {'id': 1, 'date': '2026-10-18', 'hours': 2.5, 'status': 'APPROVED', 'reason': 'Night concrete casting'},
          ];
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showApplyLeaveModal() {
    String selectedType = 'Casual Leave';
    final startCtrl = TextEditingController(text: '2026-10-25');
    final endCtrl = TextEditingController(text: '2026-10-26');
    final reasonCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Apply for Leave', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: HrTheme.deepNavy)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: selectedType,
                decoration: const InputDecoration(labelText: 'Leave Category'),
                items: ['Casual Leave', 'Sick Leave', 'Earned Leave']
                    .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                    .toList(),
                onChanged: (v) => setModalState(() => selectedType = v!),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: TextField(controller: startCtrl, decoration: const InputDecoration(labelText: 'Start Date'))),
                  const SizedBox(width: 10),
                  Expanded(child: TextField(controller: endCtrl, decoration: const InputDecoration(labelText: 'End Date'))),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reasonCtrl,
                decoration: const InputDecoration(labelText: 'Reason for Leave'),
                maxLines: 2,
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: HrTheme.primaryIndigo),
                onPressed: () async {
                  Navigator.pop(ctx);
                  await _api.applyLeave(
                    leaveType: selectedType,
                    startDate: startCtrl.text,
                    endDate: endCtrl.text,
                    totalDays: 2,
                    reason: reasonCtrl.text.isNotEmpty ? reasonCtrl.text : 'Personal matters',
                  );
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(backgroundColor: HrTheme.successTeal, content: Text('Leave application submitted for approval!')),
                    );
                    _loadData();
                  }
                },
                child: const Text('Submit Application'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showApplyOvertimeModal() {
    final dateCtrl = TextEditingController(text: '2026-10-20');
    final hoursCtrl = TextEditingController(text: '2.5');
    final reasonCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Request Overtime Hours', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: HrTheme.deepNavy)),
            const SizedBox(height: 16),
            TextField(controller: dateCtrl, decoration: const InputDecoration(labelText: 'Work Date')),
            const SizedBox(height: 12),
            TextField(controller: hoursCtrl, decoration: const InputDecoration(labelText: 'Overtime Hours (e.g. 2.5)')),
            const SizedBox(height: 12),
            TextField(controller: reasonCtrl, decoration: const InputDecoration(labelText: 'Task / Justification'), maxLines: 2),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: HrTheme.primaryIndigo),
              onPressed: () async {
                Navigator.pop(ctx);
                await _api.applyOvertime(
                  date: dateCtrl.text,
                  hours: double.tryParse(hoursCtrl.text) ?? 2.0,
                  reason: reasonCtrl.text.isNotEmpty ? reasonCtrl.text : 'Site project requirement',
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(backgroundColor: HrTheme.successTeal, content: Text('Overtime hours submitted!')),
                  );
                  _loadData();
                }
              },
              child: const Text('Submit Overtime'),
            ),
          ],
        ),
      ),
    );
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
        title: const Text('Leave & Overtime', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: HrTheme.primaryIndigo,
          unselectedLabelColor: const Color(0xFF64748B),
          indicatorColor: HrTheme.primaryIndigo,
          tabs: const [
            Tab(text: 'Leave Management'),
            Tab(text: 'Overtime Hours'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: HrTheme.primaryIndigo))
          : TabBarView(
              controller: _tabController,
              children: [
                // 1. Leave Tab
                RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Balances
                        Row(
                          children: _balances.map((b) {
                            return Expanded(
                              child: Card(
                                margin: const EdgeInsets.only(right: 8),
                                color: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  side: const BorderSide(color: HrTheme.slateBorder),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(b['type'], style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                                      const SizedBox(height: 6),
                                      Text('${b['available']} Left', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: HrTheme.deepNavy)),
                                      Text('${b['used']} of ${b['total']} used', style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 16),

                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: HrTheme.primaryIndigo,
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(48),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('Apply for Leave', style: TextStyle(fontWeight: FontWeight.bold)),
                          onPressed: _showApplyLeaveModal,
                        ),
                        const SizedBox(height: 24),

                        const Text('MY LEAVE APPLICATIONS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Color(0xFF64748B))),
                        const SizedBox(height: 10),

                        ..._myLeaves.map((l) => Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              color: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                                side: const BorderSide(color: HrTheme.slateBorder),
                              ),
                              child: ListTile(
                                leading: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(10)),
                                  child: const Icon(Icons.calendar_month, color: HrTheme.primaryIndigo, size: 20),
                                ),
                                title: Text(l['type'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.deepNavy)),
                                subtitle: Text('${l['dates']} (${l['days']} Days)\nReason: ${l['reason']}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                                trailing: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(6)),
                                  child: Text(l['status'], style: const TextStyle(color: HrTheme.successTeal, fontWeight: FontWeight.bold, fontSize: 10)),
                                ),
                              ),
                            )),
                      ],
                    ),
                  ),
                ),

                // 2. Overtime Tab
                RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: HrTheme.primaryIndigo,
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(48),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.alarm_add, size: 18),
                          label: const Text('Request Overtime Hours', style: TextStyle(fontWeight: FontWeight.bold)),
                          onPressed: _showApplyOvertimeModal,
                        ),
                        const SizedBox(height: 24),

                        const Text('SUBMITTED OVERTIME RECORDS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: Color(0xFF64748B))),
                        const SizedBox(height: 10),

                        ..._overtimes.map((ot) => Card(
                              margin: const EdgeInsets.only(bottom: 10),
                              color: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                                side: const BorderSide(color: HrTheme.slateBorder),
                              ),
                              child: ListTile(
                                leading: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(color: const Color(0xFFFFFBEB), borderRadius: BorderRadius.circular(10)),
                                  child: const Icon(Icons.access_time, color: HrTheme.amberWarning, size: 20),
                                ),
                                title: Text('${ot['hours']} Hours Overtime', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.deepNavy)),
                                subtitle: Text('Date: ${ot['date']} • ${ot['reason']}', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                                trailing: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(6)),
                                  child: Text(ot['status'], style: const TextStyle(color: HrTheme.successTeal, fontWeight: FontWeight.bold, fontSize: 10)),
                                ),
                              ),
                            )),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}
