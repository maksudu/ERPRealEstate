import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';

class SiteVisitScreen extends StatefulWidget {
  const SiteVisitScreen({super.key});

  @override
  State<SiteVisitScreen> createState() => _SiteVisitScreenState();
}

class _SiteVisitScreenState extends State<SiteVisitScreen> {
  final _api = ApiClient();
  bool _isLoading = false;
  List<dynamic> _visits = [];
  List<dynamic> _followups = [];
  int _activeTab = 0; // 0 = Site Visits, 1 = Follow-ups

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final visits = await _api.getSiteVisits();
      final followups = await _api.getFollowUps();
      setState(() {
        _visits = visits;
        _followups = followups;
      });
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  void _showScheduleVisitDialog() {
    DateTime selectedDate = DateTime.now().add(const Duration(days: 1, hours: 2));
    final location = TextEditingController(text: 'Project Site, Gulshan 2');
    final agenda = TextEditingController(text: 'Apartment physical inspection and view discussion');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Schedule Site Visit', style: TextStyle(color: Color(0xFF0F172A), fontSize: 17, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.calendar_today, color: AppTheme.primaryTeal),
                title: const Text('Date & Time', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                subtitle: Text(
                  DateFormat('EEE, dd MMM yyyy · hh:mm a').format(selectedDate),
                  style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold),
                ),
                trailing: TextButton(
                  onPressed: () async {
                    final d = await showDatePicker(
                      context: context,
                      initialDate: selectedDate,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 90)),
                    );
                    if (d != null) {
                      final t = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay.fromDateTime(selectedDate),
                      );
                      if (t != null) {
                        setSheetState(() {
                          selectedDate = DateTime(d.year, d.month, d.day, t.hour, t.minute);
                        });
                      }
                    }
                  },
                  child: const Text('Change'),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: location,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Site Address / Meeting Point', labelStyle: TextStyle(color: Color(0xFF64748B))),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: agenda,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Agenda / Discussion Points', labelStyle: TextStyle(color: Color(0xFF64748B))),
              ),
              const SizedBox(height: 18),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryTeal,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () async {
                  try {
                    await _api.createSiteVisit({
                      'customer_id': 1,
                      'project_id': 1,
                      'scheduled_start': selectedDate.toIso8601String(),
                      'meeting_location': location.text.trim(),
                      'agenda': agenda.text.trim(),
                    });
                    Navigator.pop(ctx);
                    _loadData();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Site visit scheduled! Automated follow-up reminder set.')),
                    );
                  } catch (e) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                  }
                },
                child: const Text('Confirm Schedule', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showUpdateVisitStatusDialog(Map<String, dynamic> v) {
    String status = v['status'] ?? 'PLANNED';
    final outcome = TextEditingController(text: v['outcome'] ?? '');
    final nextAction = TextEditingController(text: v['next_action'] ?? '');

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          backgroundColor: Colors.white,
          title: const Text('Update Visit Outcome', style: TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: status,
                dropdownColor: Colors.white,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Visit Status', labelStyle: TextStyle(color: Color(0xFF64748B))),
                items: const [
                  DropdownMenuItem(value: 'PLANNED', child: Text('Planned')),
                  DropdownMenuItem(value: 'CONFIRMED', child: Text('Confirmed')),
                  DropdownMenuItem(value: 'COMPLETED', child: Text('Completed (Attended)')),
                  DropdownMenuItem(value: 'NO_SHOW', child: Text('Customer No-Show')),
                  DropdownMenuItem(value: 'RESCHEDULED', child: Text('Rescheduled')),
                  DropdownMenuItem(value: 'CANCELLED', child: Text('Cancelled')),
                ],
                onChanged: (val) => setDlg(() => status = val ?? 'COMPLETED'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: outcome,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Customer Feedback / Outcome', labelStyle: TextStyle(color: Color(0xFF64748B))),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: nextAction,
                style: const TextStyle(color: Color(0xFF0F172A)),
                decoration: const InputDecoration(labelText: 'Next Sales Action', labelStyle: TextStyle(color: Color(0xFF64748B))),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal),
              onPressed: () async {
                await _api.updateSiteVisit(v['id'], {
                  'status': status,
                  'outcome': outcome.text.trim(),
                  'next_action': nextAction.text.trim(),
                });
                Navigator.pop(ctx);
                _loadData();
              },
              child: const Text('Update'),
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
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('Site Visits & Reminders', style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.add_alarm, color: AppTheme.primaryTeal), onPressed: _showScheduleVisitDialog),
        ],
      ),
      body: Column(
        children: [
          // Segmented Tab
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _activeTab = 0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _activeTab == 0 ? AppTheme.primaryTeal : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          'Site Visits (${_visits.length})',
                          style: TextStyle(color: _activeTab == 0 ? Colors.white : const Color(0xFF64748B), fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _activeTab = 1),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _activeTab == 1 ? AppTheme.primaryTeal : Colors.transparent,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          'Follow-up Tasks (${_followups.length})',
                          style: TextStyle(color: _activeTab == 1 ? Colors.white : const Color(0xFF64748B), fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
                : _activeTab == 0
                    ? _buildSiteVisitsList()
                    : _buildFollowupsList(),
          ),
        ],
      ),
    );
  }

  Widget _buildSiteVisitsList() {
    if (_visits.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.location_city_outlined, color: Colors.grey, size: 48),
            const SizedBox(height: 12),
            const Text('No site visits scheduled', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              icon: const Icon(Icons.add),
              label: const Text('Schedule Site Visit'),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal),
              onPressed: _showScheduleVisitDialog,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _visits.length,
        itemBuilder: (ctx, i) {
          final v = _visits[i];
          final start = v['scheduled_start'] != null ? DateTime.tryParse(v['scheduled_start']) : null;
          final isCompleted = v['status'] == 'COMPLETED';

          return Card(
            color: Colors.white,
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        v['project_name'] ?? 'Project Site Visit',
                        style: const TextStyle(color: Color(0xFF0F172A), fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: (isCompleted ? const Color(0xFF10B981) : const Color(0xFFF59E0B)).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          v['status'] ?? 'PLANNED',
                          style: TextStyle(color: isCompleted ? const Color(0xFF10B981) : const Color(0xFFD97706), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.access_time, color: AppTheme.primaryTeal, size: 14),
                      const SizedBox(width: 6),
                      Text(
                        start != null ? DateFormat('dd MMM yyyy · hh:mm a').format(start) : 'Scheduled Date',
                        style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.place, color: Color(0xFF94A3B8), size: 14),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(v['meeting_location'] ?? 'Site', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                      ),
                    ],
                  ),
                  if (v['outcome'] != null) ...[
                    const Divider(color: Color(0xFFE2E8F0), height: 16),
                    Text('Outcome: ${v['outcome']}', style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 12, fontWeight: FontWeight.w600)),
                  ],
                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerRight,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.primaryTeal,
                        side: const BorderSide(color: AppTheme.primaryTeal),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      ),
                      onPressed: () => _showUpdateVisitStatusDialog(v),
                      child: const Text('Update Status', style: TextStyle(fontSize: 11)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFollowupsList() {
    if (_followups.isEmpty) {
      return const Center(child: Text('No follow-up tasks due', style: TextStyle(color: Colors.grey)));
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _followups.length,
        itemBuilder: (ctx, i) {
          final f = _followups[i];
          final isOverdue = f['is_overdue'] == true;

          return Card(
            color: Colors.white,
            elevation: 0,
            margin: const EdgeInsets.only(bottom: 10),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            child: ListTile(
              leading: Icon(
                isOverdue ? Icons.warning_amber_rounded : Icons.task_alt,
                color: isOverdue ? Colors.redAccent : AppTheme.primaryTeal,
              ),
              title: Text(f['title'] ?? 'Task', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13, fontWeight: FontWeight.bold)),
              subtitle: Text(
                'Due: ${f['due_date']?.substring(0, 10) ?? '-'} · Priority: ${f['priority'] ?? 'Medium'}',
                style: TextStyle(color: isOverdue ? Colors.redAccent.shade200 : const Color(0xFF64748B), fontSize: 11),
              ),
              trailing: f['status'] == 'COMPLETED'
                  ? const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 18)
                  : IconButton(
                      icon: const Icon(Icons.check_circle_outline, color: AppTheme.primaryTeal),
                      onPressed: () async {
                        await _api.completeFollowUp(f['id']);
                        _loadData();
                      },
                    ),
            ),
          );
        },
      ),
    );
  }
}
