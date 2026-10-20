import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';
import 'quotation_screen.dart';

class ProjectPropertyScreen extends StatefulWidget {
  final VoidCallback? onOpenDrawer;

  const ProjectPropertyScreen({super.key, this.onOpenDrawer});

  @override
  State<ProjectPropertyScreen> createState() => _ProjectPropertyScreenState();
}

class _ProjectPropertyScreenState extends State<ProjectPropertyScreen> {
  final _api = ApiClient();
  bool _isLoading = false;
  List<dynamic> _projects = [];
  Map<String, dynamic>? _selectedProject;
  List<dynamic> _units = [];
  bool _isLoadingUnits = false;

  String? _selectedStatusFilter;

  @override
  void initState() {
    super.initState();
    _loadProjects();
  }

  Future<void> _loadProjects() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getProjects();
      setState(() {
        _projects = res;
        if (_projects.isNotEmpty && _selectedProject == null) {
          _selectProject(_projects.first['id']);
        }
      });
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  Future<void> _selectProject(int projectId) async {
    setState(() => _isLoadingUnits = true);
    try {
      final detail = await _api.getProject(projectId);
      final units = await _api.getProjectUnits(projectId, status: _selectedStatusFilter);
      setState(() {
        _selectedProject = detail;
        _units = units;
      });
    } catch (_) {}
    setState(() => _isLoadingUnits = false);
  }

  void _showUnitDetail(Map<String, dynamic> u) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Unit ${u['unit_number']}', style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold)),
                    Text('Floor ${u['floor_number']} · ${u['tower_name'] ?? 'Tower'}', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  ],
                ),
                _statusBadge(u['status']),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  _detailRow('Gross Area', '${u['gross_saleable_area_sqft'] ?? 0} sqft'),
                  const SizedBox(height: 6),
                  _detailRow('Net Carpet Area', '${u['net_carpet_area_sqft'] ?? 0} sqft'),
                  const SizedBox(height: 6),
                  _detailRow('Bedrooms / Baths', '${u['bed_count'] ?? 3} Bed · ${u['bath_count'] ?? 3} Bath'),
                  const SizedBox(height: 6),
                  _detailRow('Rate / sqft', 'BDT ${u['effective_rate_per_sqft'] ?? u['base_rate_per_sqft'] ?? 0}'),
                  const Divider(color: Color(0xFFE2E8F0), height: 16),
                  _detailRow('Total Base Price', CurrencyFormatter.formatBDT((u['total_unit_price'] ?? 0).toDouble()), isBold: true),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.request_quote, size: 16),
                    label: const Text('Generate Quote', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryTeal, foregroundColor: Colors.white),
                    onPressed: () {
                      Navigator.pop(ctx);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => QuotationScreen(initialUnit: u)),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 10),
                if (u['status'] == 'AVAILABLE')
                  ElevatedButton.icon(
                    icon: const Icon(Icons.lock_outline, size: 16),
                    label: const Text('Hold Unit (15m)', style: TextStyle(fontSize: 13)),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B), foregroundColor: Colors.white),
                    onPressed: () async {
                      await _api.lockUnit(u['id']);
                      Navigator.pop(ctx);
                      if (_selectedProject != null) {
                        _selectProject(_selectedProject!['id']);
                      }
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unit locked for 15 minutes.')));
                    },
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
        Text(value, style: TextStyle(color: isBold ? AppTheme.primaryTeal : const Color(0xFF0F172A), fontSize: 12, fontWeight: isBold ? FontWeight.bold : FontWeight.w500)),
      ],
    );
  }

  Widget _statusBadge(String? status) {
    Color color;
    switch (status) {
      case 'AVAILABLE':
        color = const Color(0xFF10B981);
        break;
      case 'RESERVED':
      case 'ON_HOLD':
        color = const Color(0xFFF59E0B);
        break;
      case 'BOOKED':
      case 'SOLD':
        color = const Color(0xFFEF4444);
        break;
      default:
        color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.2), borderRadius: BorderRadius.circular(6)),
      child: Text(status ?? 'UNKNOWN', style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  @override
  Widget build(BuildContext context) {
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
        title: const Text('Projects & Inventory', style: TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
          : Column(
              children: [
                // Project Horizontal Selector
                SizedBox(
                  height: 52,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: _projects.length,
                    itemBuilder: (ctx, i) {
                      final p = _projects[i];
                      final isSelected = _selectedProject != null && _selectedProject!['id'] == p['id'];
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          selected: isSelected,
                          label: Text(p['project_name'] ?? 'Project', style: TextStyle(color: isSelected ? Colors.white : const Color(0xFF334155), fontSize: 12)),
                          selectedColor: AppTheme.primaryTeal,
                          backgroundColor: Colors.white,
                          side: BorderSide(color: isSelected ? AppTheme.primaryTeal : const Color(0xFFE2E8F0)),
                          onSelected: (_) => _selectProject(p['id']),
                        ),
                      );
                    },
                  ),
                ),

                // Selected Project Summary Banner
                if (_selectedProject != null)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF0D9488), Color(0xFF0284C7)]),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(color: AppTheme.primaryTeal.withOpacity(0.2), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                _selectedProject!['project_name'] ?? '',
                                style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                              ),
                            ),
                            Text('${_selectedProject!['thana_upazila'] ?? 'Dhaka'}', style: const TextStyle(color: Colors.white70, fontSize: 11)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _miniMetric('Towers', '${(_selectedProject!['towers'] as List?)?.length ?? 1}'),
                            _miniMetric('Units', '${_units.length}'),
                            _miniMetric('Available', '${_units.where((u) => u['status'] == 'AVAILABLE').length}'),
                            _miniMetric('Handover', _selectedProject!['planned_handover_date'] ?? '2028'),
                          ],
                        ),
                      ],
                    ),
                  ),

                // Status Filter Chips
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: Row(
                    children: [
                      const Text('Filter: ', style: TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                      _filterChip(null, 'All'),
                      const SizedBox(width: 6),
                      _filterChip('AVAILABLE', 'Available'),
                      const SizedBox(width: 6),
                      _filterChip('RESERVED', 'Reserved'),
                      const SizedBox(width: 6),
                      _filterChip('BOOKED', 'Booked'),
                    ],
                  ),
                ),

                // Units Grid
                Expanded(
                  child: _isLoadingUnits
                      ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
                      : _units.isEmpty
                          ? const Center(child: Text('No units found matching criteria', style: TextStyle(color: Colors.grey)))
                          : GridView.builder(
                              padding: const EdgeInsets.all(16),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                childAspectRatio: 1.15,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                              ),
                              itemCount: _units.length,
                              itemBuilder: (ctx, i) {
                                final u = _units[i];
                                return InkWell(
                                  onTap: () => _showUnitDetail(u),
                                  borderRadius: BorderRadius.circular(14),
                                  child: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(
                                        color: u['status'] == 'AVAILABLE' ? const Color(0xFF10B981).withOpacity(0.4) : const Color(0xFFE2E8F0),
                                      ),
                                      boxShadow: [
                                        BoxShadow(color: const Color(0xFF0F172A).withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2)),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              '${u['unit_number']}',
                                              style: const TextStyle(color: Color(0xFF0F172A), fontSize: 16, fontWeight: FontWeight.bold),
                                            ),
                                            _statusBadge(u['status']),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '${u['gross_saleable_area_sqft'] ?? 0} sft · ${u['bed_count'] ?? 3} BHK',
                                              style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              CurrencyFormatter.formatBDT((u['total_unit_price'] ?? 0).toDouble()),
                                              style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 12, fontWeight: FontWeight.bold),
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

  Widget _miniMetric(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
      ],
    );
  }

  Widget _filterChip(String? status, String label) {
    final isSelected = _selectedStatusFilter == status;
    return InkWell(
      onTap: () {
        setState(() => _selectedStatusFilter = status);
        if (_selectedProject != null) {
          _selectProject(_selectedProject!['id']);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryTeal : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? AppTheme.primaryTeal : const Color(0xFFE2E8F0)),
        ),
        child: Text(label, style: TextStyle(color: isSelected ? Colors.white : const Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w500)),
      ),
    );
  }
}
