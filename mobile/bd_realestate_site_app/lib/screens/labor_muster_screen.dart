import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/offline/offline_sync_queue.dart';
import '../core/utils/currency_formatter.dart';
import '../models/labor_muster.dart';

class LaborMusterScreen extends StatefulWidget {
  const LaborMusterScreen({super.key});

  @override
  State<LaborMusterScreen> createState() => _LaborMusterScreenState();
}

class _LaborMusterScreenState extends State<LaborMusterScreen> {
  String _selectedSubcontractor = 'Anwar Steel & RCC Works Ltd.';
  String _tradeScope = 'RCC Structural Casting & Shuttering';

  int _rodBinders = 18;
  int _masons = 12;
  int _carpenters = 14;
  int _plumbers = 4;
  int _helpers = 22;
  double _overtimeHours = 2.0;

  int get _totalHeadcount =>
      _rodBinders + _masons + _carpenters + _plumbers + _helpers;

  double get _baseDailyWageTotal =>
      (_rodBinders * TradeWageConfig.rodBinderWage) +
      (_masons * TradeWageConfig.masonWage) +
      (_carpenters * TradeWageConfig.carpenterWage) +
      (_plumbers * TradeWageConfig.plumberWage) +
      (_helpers * TradeWageConfig.helperWage);

  double get _averageHourlyRate =>
      (_baseDailyWageTotal / (_totalHeadcount > 0 ? _totalHeadcount : 1)) / 8.0;

  double get _overtimeTotalWage =>
      _totalHeadcount * _overtimeHours * _averageHourlyRate * TradeWageConfig.overtimeHourlyRateMultiplier;

  double get _grossDailyWageTotal => _baseDailyWageTotal + _overtimeTotalWage;

  void _saveMusterRoll() {
    final muster = LaborMusterRoll(
      id: 'MUSTER-${DateTime.now().millisecondsSinceEpoch}',
      subcontractorName: _selectedSubcontractor,
      tradeScope: _tradeScope,
      rodBinders: _rodBinders,
      masons: _masons,
      carpenters: _carpenters,
      plumbers: _plumbers,
      helpers: _helpers,
      overtimeHours: _overtimeHours,
      date: DateTime.now(),
      isSynced: false,
    );

    final data = {
      'subcontractor': muster.subcontractorName,
      'scope': muster.tradeScope,
      'rod_binders': muster.rodBinders,
      'masons': muster.masons,
      'carpenters': muster.carpenters,
      'plumbers': muster.plumbers,
      'helpers': muster.helpers,
      'total_headcount': muster.totalHeadcount,
      'overtime_hours': muster.overtimeHours,
      'base_wage_bdt': muster.baseDailyWageTotal,
      'gross_wage_bdt': muster.grossDailyWageTotal,
      'date': muster.date.toIso8601String(),
    };

    OfflineSyncQueue().enqueue('MUSTER_ROLL', data);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: SiteAppTheme.successGreen),
            SizedBox(width: 8),
            Text('Labor Muster Logged!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Subcontractor: $_selectedSubcontractor', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            const SizedBox(height: 6),
            Text('Total Workforce: $_totalHeadcount Laborers'),
            Text('Overtime: ${_overtimeHours.toStringAsFixed(1)} Hours'),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Daily Wage Total:', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(
                  BdtCurrencyFormatter.format(_grossDailyWageTotal),
                  style: const TextStyle(fontWeight: FontWeight.bold, color: SiteAppTheme.primarySafetyOrange, fontSize: 16),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text('✔ Saved to offline queue and allocated against Work Order.', style: TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: SiteAppTheme.primarySafetyOrange,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Muster Roll ($_totalHeadcount workers, ${BdtCurrencyFormatter.format(_grossDailyWageTotal)}) queued!'),
                  backgroundColor: SiteAppTheme.successGreen,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Subcontractor Labor Muster Roll'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Headcount & Total Wage KPI Card
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
                      const Text('Total Site Workforce Today', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: SiteAppTheme.primarySafetyOrange.withOpacity(0.25),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$_totalHeadcount Workers',
                          style: const TextStyle(color: SiteAppTheme.primarySafetyOrange, fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    BdtCurrencyFormatter.format(_grossDailyWageTotal),
                    style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Base Wage: ${BdtCurrencyFormatter.format(_baseDailyWageTotal)} · OT Wage: ${BdtCurrencyFormatter.format(_overtimeTotalWage)}',
                    style: const TextStyle(color: Colors.white60, fontSize: 11),
                  ),
                  const SizedBox(height: 12),
                  const Divider(color: Colors.white24, height: 1),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Subcontractor: ${_selectedSubcontractor.split(" ").first}', style: const TextStyle(color: Colors.white70, fontSize: 11)),
                      Text('OT: ${_overtimeHours.toStringAsFixed(1)} hrs @ 1.5x', style: const TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Subcontractor & Work Order Dropdown
            DropdownButtonFormField<String>(
              value: _selectedSubcontractor,
              decoration: const InputDecoration(labelText: 'Allocated Subcontractor', border: OutlineInputBorder()),
              items: [
                'Anwar Steel & RCC Works Ltd.',
                'Bengal Formwork & Scaffolding Services',
                'Prime MEP & Sanitary Engineering',
                'Delta Masonry & Finishing Works',
              ].map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 12)))).toList(),
              onChanged: (v) => setState(() => _selectedSubcontractor = v!),
            ),
            const SizedBox(height: 10),

            DropdownButtonFormField<String>(
              value: _tradeScope,
              decoration: const InputDecoration(labelText: 'Trade Work Scope', border: OutlineInputBorder()),
              items: [
                'RCC Structural Casting & Shuttering',
                'Brick Masonry & Lintels',
                'Water Supply & Sanitary Rough-in',
                'Internal Plastering & Ceiling Finishing',
              ].map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 12)))).toList(),
              onChanged: (v) => setState(() => _tradeScope = v!),
            ),

            const SizedBox(height: 20),

            // Trade-wise Headcount Steppers
            const Text(
              'Headcount Breakdown by Trade',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: SiteAppTheme.darkNavy),
            ),
            const SizedBox(height: 10),

            _buildTradeStepper(
              'Rod-binders (Rebar Fabrication)',
              _rodBinders,
              TradeWageConfig.rodBinderWage,
              Icons.architecture,
              (v) => setState(() => _rodBinders = v),
            ),
            const SizedBox(height: 10),
            _buildTradeStepper(
              'Masons (Brick & Concreting)',
              _masons,
              TradeWageConfig.masonWage,
              Icons.square_foot,
              (v) => setState(() => _masons = v),
            ),
            const SizedBox(height: 10),
            _buildTradeStepper(
              'Carpenters (Shuttering & Formwork)',
              _carpenters,
              TradeWageConfig.carpenterWage,
              Icons.carpenter,
              (v) => setState(() => _carpenters = v),
            ),
            const SizedBox(height: 10),
            _buildTradeStepper(
              'Plumbers (Piping & Conduit)',
              _plumbers,
              TradeWageConfig.plumberWage,
              Icons.plumbing,
              (v) => setState(() => _plumbers = v),
            ),
            const SizedBox(height: 10),
            _buildTradeStepper(
              'Helpers (General Site Labor)',
              _helpers,
              TradeWageConfig.helperWage,
              Icons.pan_tool,
              (v) => setState(() => _helpers = v),
            ),

            const SizedBox(height: 20),

            // Overtime Hours Slider
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Shift Overtime Hours', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      Text(
                        '${_overtimeHours.toStringAsFixed(1)} Hours / Worker',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: SiteAppTheme.primarySafetyOrange),
                      ),
                    ],
                  ),
                  Slider(
                    value: _overtimeHours,
                    min: 0.0,
                    max: 6.0,
                    divisions: 12,
                    activeColor: SiteAppTheme.primarySafetyOrange,
                    onChanged: (val) => setState(() => _overtimeHours = val),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('0 hrs (Regular 8h)', style: TextStyle(color: Colors.grey.shade500, fontSize: 10)),
                      Text('6 hrs (Double Shift)', style: TextStyle(color: Colors.grey.shade500, fontSize: 10)),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Save Muster Roll Action Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.assignment_turned_in),
                label: const Text('Save Muster Roll & Wage Sheet', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: SiteAppTheme.primarySafetyOrange,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: _saveMusterRoll,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTradeStepper(
    String tradeName,
    int count,
    double dailyRate,
    IconData icon,
    ValueChanged<int> onChanged,
  ) {
    final subtotal = count * dailyRate;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: SiteAppTheme.primarySafetyOrange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: SiteAppTheme.primarySafetyOrange, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tradeName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                Text(
                  '৳${dailyRate.toInt()}/day · Total: ${BdtCurrencyFormatter.format(subtotal)}',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                ),
              ],
            ),
          ),
          Row(
            children: [
              IconButton(
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.remove_circle_outline, color: Colors.grey),
                onPressed: count > 0 ? () => onChanged(count - 1) : null,
              ),
              Container(
                constraints: const BoxConstraints(minWidth: 28),
                alignment: Alignment.center,
                child: Text('$count', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.add_circle_outline, color: SiteAppTheme.primarySafetyOrange),
                onPressed: () => onChanged(count + 1),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
