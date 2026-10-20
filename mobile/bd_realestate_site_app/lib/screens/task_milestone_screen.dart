import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/network/api_client.dart';

class TaskMilestoneScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const TaskMilestoneScreen({super.key, this.onOpenDrawer});

  @override
  State<TaskMilestoneScreen> createState() => _TaskMilestoneScreenState();
}

class _TaskMilestoneScreenState extends State<TaskMilestoneScreen> {
  final _api = ConstructionApiClient();
  bool _isLoading = false;
  String _activeFilter = 'ALL';

  List<Map<String, dynamic>> _tasks = [];

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getTasks();
      final items = (res['items'] as List<dynamic>?)?.map((e) => e as Map<String, dynamic>).toList() ?? [];
      if (items.isNotEmpty) {
        setState(() => _tasks = items);
      } else {
        _setFallbackTasks();
      }
    } catch (_) {
      _setFallbackTasks();
    }
    setState(() => _isLoading = false);
  }

  void _setFallbackTasks() {
    _tasks = [
      {
        'id': 1,
        'node_code': 'ACT-PIL-001',
        'node_name': 'Cast-in-Situ Bored Piling (1200mm Dia)',
        'phase_category': 'SUBSTRUCTURE',
        'activity_type': 'PILING',
        'planned_start_date': '2026-03-01',
        'planned_end_date': '2026-04-15',
        'progress_percentage': 100.0,
        'status': 'COMPLETED',
        'unit_of_measure': 'RFT',
        'planned_quantity': 4500.0,
      },
      {
        'id': 2,
        'node_code': 'ACT-MAT-002',
        'node_name': 'Foundation Mat Raft Concrete Casting (3500 PSI)',
        'phase_category': 'SUBSTRUCTURE',
        'activity_type': 'MAT_CASTING',
        'planned_start_date': '2026-04-16',
        'planned_end_date': '2026-05-10',
        'progress_percentage': 100.0,
        'status': 'COMPLETED',
        'unit_of_measure': 'CFT',
        'planned_quantity': 18500.0,
      },
      {
        'id': 3,
        'node_code': 'ACT-SLB-008',
        'node_name': '8th Floor Slab Beam & Roof Casting',
        'phase_category': 'SUPERSTRUCTURE',
        'activity_type': 'BEAM_SLAB',
        'planned_start_date': '2026-10-15',
        'planned_end_date': '2026-10-25',
        'progress_percentage': 75.0,
        'status': 'IN_PROGRESS',
        'unit_of_measure': 'CFT',
        'planned_quantity': 320.0,
      },
      {
        'id': 4,
        'node_code': 'ACT-COL-009',
        'node_name': '9th Floor Column Rebar & Shuttering',
        'phase_category': 'SUPERSTRUCTURE',
        'activity_type': 'COLUMN',
        'planned_start_date': '2026-10-26',
        'planned_end_date': '2026-11-05',
        'progress_percentage': 15.0,
        'status': 'IN_PROGRESS',
        'unit_of_measure': 'NOS',
        'planned_quantity': 24.0,
      },
      {
        'id': 5,
        'node_code': 'ACT-BRK-010',
        'node_name': 'Level 4 Internal Brick Masonry (125mm Wall)',
        'phase_category': 'FINISHING',
        'activity_type': 'BRICKWORK',
        'planned_start_date': '2026-11-01',
        'planned_end_date': '2026-11-20',
        'progress_percentage': 0.0,
        'status': 'NOT_STARTED',
        'unit_of_measure': 'SFT',
        'planned_quantity': 2800.0,
      },
    ];
  }

  void _showCreateTaskDialog() {
    final nameCtrl = TextEditingController();
    final qtyCtrl = TextEditingController(text: '100');
    final durationCtrl = TextEditingController(text: '7');
    String phase = 'SUPERSTRUCTURE';
    String uom = 'CFT';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
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
                  const Text('Assign New Task / Milestone', style: TextStyle(color: SiteAppTheme.darkNavy, fontSize: 16, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close, color: Colors.grey), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Task / Activity Description *',
                  labelStyle: TextStyle(color: Color(0xFF64748B)),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: phase,
                      dropdownColor: Colors.white,
                      decoration: const InputDecoration(labelText: 'Phase', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'SUBSTRUCTURE', child: Text('Substructure')),
                        DropdownMenuItem(value: 'SUPERSTRUCTURE', child: Text('Superstructure')),
                        DropdownMenuItem(value: 'FINISHING', child: Text('Finishing')),
                        DropdownMenuItem(value: 'MEP', child: Text('MEP')),
                      ],
                      onChanged: (v) => setSheet(() => phase = v ?? 'SUPERSTRUCTURE'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: uom,
                      dropdownColor: Colors.white,
                      decoration: const InputDecoration(labelText: 'Unit (UoM)', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'CFT', child: Text('CFT')),
                        DropdownMenuItem(value: 'SFT', child: Text('SFT')),
                        DropdownMenuItem(value: 'RFT', child: Text('RFT')),
                        DropdownMenuItem(value: 'MT', child: Text('MT')),
                        DropdownMenuItem(value: 'NOS', child: Text('NOS')),
                      ],
                      onChanged: (v) => setSheet(() => uom = v ?? 'CFT'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: qtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Target Quantity', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: durationCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Duration (Days)', border: OutlineInputBorder()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: SiteAppTheme.primarySafetyOrange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () {
                  if (nameCtrl.text.trim().isEmpty) return;
                  final newTask = {
                    'id': DateTime.now().millisecondsSinceEpoch,
                    'node_code': 'ACT-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
                    'node_name': nameCtrl.text.trim(),
                    'phase_category': phase,
                    'activity_type': 'BEAM_SLAB',
                    'planned_start_date': DateTime.now().toIso8601String().split('T')[0],
                    'planned_end_date': DateTime.now().add(Duration(days: int.tryParse(durationCtrl.text) ?? 7)).toIso8601String().split('T')[0],
                    'progress_percentage': 0.0,
                    'status': 'IN_PROGRESS',
                    'unit_of_measure': uom,
                    'planned_quantity': double.tryParse(qtyCtrl.text) ?? 100.0,
                  };
                  setState(() => _tasks.insert(0, newTask));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Task scheduled & added to milestone tracker!')));
                },
                child: const Text('Add Task & Set Deadlines', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _updateTaskProgress(Map<String, dynamic> task) {
    double currentProgress = (task['progress_percentage'] as num?)?.toDouble() ?? 0.0;
    final progressCtrl = TextEditingController(text: currentProgress.toInt().toString());

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(task['node_name'] ?? 'Task Progress', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: SiteAppTheme.darkNavy)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Update Physical Completion %:', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
            const SizedBox(height: 10),
            TextField(
              controller: progressCtrl,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: const InputDecoration(labelText: 'Progress (0 - 100%)', suffixText: '%', border: OutlineInputBorder()),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: SiteAppTheme.primarySafetyOrange, foregroundColor: Colors.white),
            onPressed: () {
              final newP = double.tryParse(progressCtrl.text) ?? currentProgress;
              setState(() {
                task['progress_percentage'] = newP.clamp(0.0, 100.0);
                if (newP >= 100) {
                  task['status'] = 'COMPLETED';
                } else if (newP > 0) {
                  task['status'] = 'IN_PROGRESS';
                }
              });
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Task progress updated!')));
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _tasks.where((t) {
      if (_activeFilter == 'ALL') return true;
      return t['status'] == _activeFilter;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
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
        title: const Text('Task & Milestone Management', style: TextStyle(color: SiteAppTheme.darkNavy, fontSize: 18, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(icon: const Icon(Icons.add, color: SiteAppTheme.primarySafetyOrange), onPressed: _showCreateTaskDialog),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _filterChip('ALL', 'All Tasks'),
                _filterChip('IN_PROGRESS', 'In Progress'),
                _filterChip('COMPLETED', 'Completed'),
                _filterChip('NOT_STARTED', 'Upcoming'),
              ],
            ),
          ),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: SiteAppTheme.primarySafetyOrange))
                : RefreshIndicator(
                    onRefresh: _loadTasks,
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: filtered.length,
                      itemBuilder: (ctx, i) {
                        final t = filtered[i];
                        final progress = ((t['progress_percentage'] ?? 0) as num).toDouble();
                        final isCompleted = t['status'] == 'COMPLETED';

                        return Card(
                          color: Colors.white,
                          elevation: 0,
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: const BorderSide(color: Color(0xFFE2E8F0)),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: SiteAppTheme.primarySafetyOrange.withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        t['node_code'] ?? 'ACT',
                                        style: const TextStyle(color: SiteAppTheme.primarySafetyOrange, fontSize: 10, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: isCompleted ? SiteAppTheme.successGreen.withOpacity(0.12) : const Color(0xFFEFF6FF),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        t['status'] ?? 'ACTIVE',
                                        style: TextStyle(
                                          color: isCompleted ? SiteAppTheme.successGreen : const Color(0xFF2563EB),
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  t['node_name'] ?? 'Task',
                                  style: const TextStyle(color: SiteAppTheme.darkNavy, fontSize: 15, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Phase: ${t['phase_category']} · Target: ${t['planned_quantity']} ${t['unit_of_measure']}',
                                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Icon(Icons.calendar_today_outlined, size: 12, color: Color(0xFF94A3B8)),
                                    const SizedBox(width: 4),
                                    Text('${t['planned_start_date']} to ${t['planned_end_date']}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('Completion: ${progress.toInt()}%', style: const TextStyle(color: SiteAppTheme.darkNavy, fontSize: 12, fontWeight: FontWeight.w600)),
                                    TextButton.icon(
                                      icon: const Icon(Icons.edit, size: 14, color: SiteAppTheme.primarySafetyOrange),
                                      label: const Text('Update Progress', style: TextStyle(color: SiteAppTheme.primarySafetyOrange, fontSize: 12)),
                                      onPressed: () => _updateTaskProgress(t),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(6),
                                  child: LinearProgressIndicator(
                                    value: progress / 100.0,
                                    backgroundColor: const Color(0xFFF1F5F9),
                                    color: isCompleted ? SiteAppTheme.successGreen : SiteAppTheme.primarySafetyOrange,
                                    minHeight: 6,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String key, String label) {
    final isSelected = _activeFilter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: isSelected,
        selectedColor: SiteAppTheme.primarySafetyOrange,
        labelStyle: TextStyle(color: isSelected ? Colors.white : const Color(0xFF64748B), fontWeight: FontWeight.w600, fontSize: 12),
        onSelected: (v) => setState(() => _activeFilter = key),
      ),
    );
  }
}
