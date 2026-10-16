import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/hr_theme.dart';
import '../models/timesheet_entry.dart';

class ProjectTimesheetScreen extends StatefulWidget {
  const ProjectTimesheetScreen({super.key});

  @override
  State<ProjectTimesheetScreen> createState() => _ProjectTimesheetScreenState();
}

class _ProjectTimesheetScreenState extends State<ProjectTimesheetScreen> {
  final _formKey = GlobalKey<FormState>();

  String _selectedProject = 'Green Horizon Tower (Gulshan-2)';
  String _selectedTask = 'RCC Slab Rebar Inspection';
  double _hoursWorked = 5.5;
  final _remarksCtrl = TextEditingController(
    text: '7th floor slab rebar checking with structural design consultant.',
  );

  final List<String> _projects = [
    'Green Horizon Tower (Gulshan-2)',
    'Navana Heights (Banani)',
    'Lakeside Residency (Gulshan-1)',
    'Head Office General Overhead',
  ];

  final List<String> _tasks = [
    'RCC Slab Rebar Inspection',
    'Concrete Mix Slump & Crushing QA',
    'Subcontractor Labor Supervision',
    'Architectural Finishing Inspection',
    'Vendor Material Inward GRN',
    'Consultant Site Coordination Meeting',
  ];

  final List<TimesheetEntry> _entries = [
    TimesheetEntry(
      id: 'TS-01',
      date: DateTime.now().subtract(const Duration(days: 1)),
      projectName: 'Green Horizon Tower (Gulshan-2)',
      taskCategory: 'RCC Slab Rebar Inspection',
      hoursWorked: 5.5,
      remarks: 'Rebar binding inspection with structural team.',
    ),
    TimesheetEntry(
      id: 'TS-02',
      date: DateTime.now().subtract(const Duration(days: 1)),
      projectName: 'Navana Heights (Banani)',
      taskCategory: 'Subcontractor Labor Supervision',
      hoursWorked: 2.5,
      remarks: 'Muster roll audit for masonry team.',
    ),
  ];

  double get _todayTotalHours => _entries
      .where((e) => DateUtils.isSameDay(e.date, DateTime.now()))
      .fold(0.0, (acc, e) => acc + e.hoursWorked);

  @override
  void dispose() {
    _remarksCtrl.dispose();
    super.dispose();
  }

  void _saveTimesheet() {
    if (!_formKey.currentState!.validate()) return;

    final entry = TimesheetEntry(
      id: 'TS-${DateTime.now().millisecondsSinceEpoch % 1000}',
      date: DateTime.now(),
      projectName: _selectedProject,
      taskCategory: _selectedTask,
      hoursWorked: _hoursWorked,
      remarks: _remarksCtrl.text,
    );

    setState(() {
      _entries.insert(0, entry);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Timesheet logged: $_hoursWorked hrs booked to ${entry.projectName}!'),
        backgroundColor: HrTheme.successTeal,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Project Daily Timesheet'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Daily Logged Hours Target Bar
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: HrTheme.deepNavy,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "TODAY'S LOGGED HOURS",
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF94A3B8),
                          letterSpacing: 1.1,
                        ),
                      ),
                      Text(
                        '${_todayTotalHours.toStringAsFixed(1)} / 8.0 hrs',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: (_todayTotalHours / 8.0).clamp(0.0, 1.0),
                    backgroundColor: const Color(0xFF334155),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF34D399)),
                    minHeight: 6,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Timesheet Entry Form Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.more_time, color: HrTheme.primaryIndigo),
                          SizedBox(width: 8),
                          Text('Log Work Hours for Job-Costing', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 14),

                      DropdownButtonFormField<String>(
                        value: _selectedProject,
                        decoration: const InputDecoration(labelText: 'Project Cost Centre', border: OutlineInputBorder()),
                        items: _projects.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                        onChanged: (val) => setState(() => _selectedProject = val!),
                      ),
                      const SizedBox(height: 12),

                      DropdownButtonFormField<String>(
                        value: _selectedTask,
                        decoration: const InputDecoration(labelText: 'Task Activity', border: OutlineInputBorder()),
                        items: _tasks.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                        onChanged: (val) => setState(() => _selectedTask = val!),
                      ),
                      const SizedBox(height: 14),

                      // Hours Slider
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Hours Worked:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          Text(
                            '${_hoursWorked.toStringAsFixed(1)} Hours',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: HrTheme.primaryIndigo),
                          ),
                        ],
                      ),
                      Slider(
                        value: _hoursWorked,
                        min: 0.5,
                        max: 10.0,
                        divisions: 19,
                        label: '${_hoursWorked.toStringAsFixed(1)} hrs',
                        activeColor: HrTheme.primaryIndigo,
                        onChanged: (val) => setState(() => _hoursWorked = val),
                      ),

                      TextFormField(
                        controller: _remarksCtrl,
                        maxLines: 2,
                        decoration: const InputDecoration(labelText: 'Work Notes / Deliverables', border: OutlineInputBorder()),
                        validator: (v) => v!.isEmpty ? 'Notes required' : null,
                      ),
                      const SizedBox(height: 16),

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _saveTimesheet,
                          icon: const Icon(Icons.check, size: 18),
                          label: const Text('Save Timesheet Entry'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Recent Timesheet Entries
            const Text(
              'RECENT LOGGED TIMESHEETS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 10),

            ..._entries.map((entry) {
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: HrTheme.primaryIndigo.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.access_time_filled, color: HrTheme.primaryIndigo, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(entry.projectName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text(entry.taskCategory, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                            Text(entry.remarks, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${entry.hoursWorked} hrs',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: HrTheme.primaryIndigo),
                          ),
                          Text(
                            DateFormat('dd MMM').format(entry.date),
                            style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
