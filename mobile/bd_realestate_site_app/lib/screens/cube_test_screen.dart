import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/cube_test.dart';
import '../core/theme/app_theme.dart';
import '../core/offline/offline_sync_queue.dart';

class CubeTestScreen extends StatefulWidget {
  const CubeTestScreen({super.key});

  @override
  State<CubeTestScreen> createState() => _CubeTestScreenState();
}

class _CubeTestScreenState extends State<CubeTestScreen> {
  late List<ConcreteCubeTest> _tests;

  @override
  void initState() {
    super.initState();
    _tests = [
      ConcreteCubeTest(
        sampleCode: 'CUBE-2026-081',
        projectName: 'Green Horizon Tower',
        structuralElement: '7th Floor Slab Casting',
        castingDate: DateTime.now().subtract(const Duration(days: 28)),
        mixDesign: '1:1.5:3 (Target 3500 PSI)',
        slumpMm: 95.0,
        day7StrengthPsi: 2450.0,
        day14StrengthPsi: 3120.0,
        day28StrengthPsi: 3780.0,
        status: 'PASSED',
        labReportPhotoUrl: 'LAB-REPORT-081.JPG',
      ),
      ConcreteCubeTest(
        sampleCode: 'CUBE-2026-092',
        projectName: 'Green Horizon Tower',
        structuralElement: '8th Floor Column Cast',
        castingDate: DateTime.now().subtract(const Duration(days: 7)),
        mixDesign: '1:1.5:3 (Target 4000 PSI)',
        slumpMm: 100.0,
        status: 'DUE_TODAY',
      ),
      ConcreteCubeTest(
        sampleCode: 'CUBE-2026-105',
        projectName: 'Green Horizon Tower',
        structuralElement: 'Basement-1 Retaining Wall',
        castingDate: DateTime.now().subtract(const Duration(days: 14)),
        mixDesign: '1:1.5:3 (Target 3500 PSI)',
        slumpMm: 90.0,
        day7StrengthPsi: 2380.0,
        status: 'DUE_TODAY',
      ),
      ConcreteCubeTest(
        sampleCode: 'CUBE-2026-118',
        projectName: 'Green Horizon Tower',
        structuralElement: '8th Floor Shear Wall Cast',
        castingDate: DateTime.now().subtract(const Duration(days: 3)),
        mixDesign: '1:1.5:3 (Target 3500 PSI)',
        slumpMm: 95.0,
        status: 'PENDING',
      ),
    ];
  }

  void _recordStrength(ConcreteCubeTest test) {
    final strengthCtrl = TextEditingController(
      text: test.isDay7Due ? '2550' : test.isDay14Due ? '3150' : '3850',
    );
    bool photoAttached = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) => AlertDialog(
          title: Row(
            children: [
              const Icon(Icons.science, color: SiteAppTheme.primarySafetyOrange),
              const SizedBox(width: 8),
              Expanded(
                child: Text('Record Crushing Test — ${test.sampleCode}', style: const TextStyle(fontSize: 15)),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Structural Element: ${test.structuralElement}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text('Age in Water Tank: ${test.ageInDays} Days (${test.isDay7Due ? "Day 7" : test.isDay14Due ? "Day 14" : "Day 28 Final"})'),
                Text('Mix Design: ${test.mixDesign} · Target: ${test.targetStrengthPsi.toInt()} PSI'),
                const SizedBox(height: 12),
                TextField(
                  controller: strengthCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Compressive Crushing Strength (PSI)',
                    suffixText: 'PSI',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  icon: Icon(
                    photoAttached ? Icons.check_circle : Icons.camera_alt,
                    color: photoAttached ? SiteAppTheme.successGreen : SiteAppTheme.primarySafetyOrange,
                  ),
                  label: Text(
                    photoAttached ? 'Universal Machine Gauge Photo Attached' : 'Capture Lab Gauge Reading Photo',
                    style: TextStyle(
                      color: photoAttached ? SiteAppTheme.successGreen : Colors.black87,
                      fontSize: 11,
                    ),
                  ),
                  onPressed: () {
                    setDialogState(() => photoAttached = true);
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: SiteAppTheme.primarySafetyOrange,
                foregroundColor: Colors.white,
              ),
              onPressed: () {
                final strength = double.tryParse(strengthCtrl.text) ?? 0.0;
                setState(() {
                  if (test.isDay7Due) {
                    test.day7StrengthPsi = strength;
                  } else if (test.isDay14Due) {
                    test.day14StrengthPsi = strength;
                  } else {
                    test.day28StrengthPsi = strength;
                  }

                  if (test.day28StrengthPsi != null) {
                    test.status = (test.day28StrengthPsi! >= test.targetStrengthPsi) ? 'PASSED' : 'FAILED';
                  } else {
                    test.status = 'PENDING';
                  }
                  if (photoAttached) test.labReportPhotoUrl = 'ATTACHED';
                });

                OfflineSyncQueue().enqueue('CUBE_TEST', {
                  'sample_code': test.sampleCode,
                  'element': test.structuralElement,
                  'tested_strength_psi': strength,
                  'milestone': test.ageInDays,
                  'status': test.status,
                });

                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Crushing test for ${test.sampleCode} ($strength PSI) recorded & queued!'),
                    backgroundColor: SiteAppTheme.successGreen,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              child: const Text('Save & Verify'),
            ),
          ],
        ),
      ),
    );
  }

  void _addNewCubeSample() {
    final sampleCtrl = TextEditingController(text: 'CUBE-2026-${120 + _tests.length}');
    final elementCtrl = TextEditingController(text: '9th Floor Slab RCC Casting');
    final slumpCtrl = TextEditingController(text: '100');
    String mix = '1:1.5:3 (Target 3500 PSI)';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cast New Concrete Cube Set (3 Molds)'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: sampleCtrl,
                decoration: const InputDecoration(labelText: 'Sample Code / Mold Mark', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: elementCtrl,
                decoration: const InputDecoration(labelText: 'Structural Element', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: slumpCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Slump Cone Test (mm)',
                  suffixText: 'mm',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: mix,
                decoration: const InputDecoration(labelText: 'Mix Design & Strength', border: OutlineInputBorder()),
                items: [
                  '1:1.5:3 (Target 3500 PSI)',
                  '1:1.5:3 (Target 4000 PSI)',
                  '1:1:2 (Target 4500 PSI)',
                  '1:2:4 (Target 2500 PSI)',
                ].map((m) => DropdownMenuItem(value: m, child: Text(m, style: const TextStyle(fontSize: 12)))).toList(),
                onChanged: (v) => mix = v!,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: SiteAppTheme.primarySafetyOrange,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              final newTest = ConcreteCubeTest(
                sampleCode: sampleCtrl.text,
                projectName: 'Green Horizon Tower',
                structuralElement: elementCtrl.text,
                castingDate: DateTime.now(),
                mixDesign: mix,
                slumpMm: double.tryParse(slumpCtrl.text) ?? 95.0,
                status: 'PENDING',
              );

              setState(() => _tests.insert(0, newTest));
              OfflineSyncQueue().enqueue('CUBE_TEST', {
                'sample_code': newTest.sampleCode,
                'element': newTest.structuralElement,
                'slump_mm': newTest.slumpMm,
                'mix': newTest.mixDesign,
                'casting_date': newTest.castingDate.toIso8601String(),
              });

              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('New cube sample registered! Push alerts scheduled for Day 7, 14, 28.'),
                  backgroundColor: SiteAppTheme.successGreen,
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            child: const Text('Register Cube Set'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dueCount = _tests.where((t) => t.isAnyMilestoneDue).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Concrete Cube Crushing Test Tracker'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_box_outlined, color: SiteAppTheme.primarySafetyOrange),
            tooltip: 'Log New Cube Set',
            onPressed: _addNewCubeSample,
          ),
        ],
      ),
      body: Column(
        children: [
          // Milestone Alerts Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: dueCount > 0 ? Colors.amber.shade50 : const Color(0xFFF1F5F9),
            child: Row(
              children: [
                Icon(
                  dueCount > 0 ? Icons.notifications_active : Icons.check_circle_outline,
                  color: dueCount > 0 ? SiteAppTheme.primarySafetyOrange : SiteAppTheme.successGreen,
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    dueCount > 0
                        ? '$dueCount Concrete Cube Sets DUE for Universal Testing Machine (UTM) Crushing!'
                        : 'All concrete testing up to date. No pending Day 7/14/28 tests today.',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: dueCount > 0 ? const Color(0xFF78350F) : SiteAppTheme.darkNavy,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Cube Sample Cards List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _tests.length,
              itemBuilder: (context, index) {
                final test = _tests[index];
                return _buildCubeCard(test);
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: SiteAppTheme.primarySafetyOrange,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Cast Cube Set'),
        onPressed: _addNewCubeSample,
      ),
    );
  }

  Widget _buildCubeCard(ConcreteCubeTest test) {
    Color statusColor;
    String statusLabel;

    if (test.status == 'PASSED') {
      statusColor = SiteAppTheme.successGreen;
      statusLabel = 'PASSED (Day 28)';
    } else if (test.isAnyMilestoneDue) {
      statusColor = SiteAppTheme.primarySafetyOrange;
      statusLabel = test.isDay7Due ? 'DAY 7 DUE' : test.isDay14Due ? 'DAY 14 DUE' : 'DAY 28 DUE';
    } else if (test.status == 'FAILED') {
      statusColor = SiteAppTheme.alertRed;
      statusLabel = 'FAILED SPEC';
    } else {
      statusColor = Colors.indigo;
      statusLabel = 'CURING (Day ${test.ageInDays})';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: test.isAnyMilestoneDue ? SiteAppTheme.primarySafetyOrange : const Color(0xFFE2E8F0),
          width: test.isAnyMilestoneDue ? 1.8 : 1.0,
        ),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 3)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.inventory_2_outlined, size: 18, color: SiteAppTheme.darkNavy),
                    const SizedBox(width: 6),
                    Text(
                      test.sampleCode,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 10),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              test.structuralElement,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: SiteAppTheme.steelSlate),
            ),
            Text(
              'Mix: ${test.mixDesign} · Slump: ${test.slumpMm.toInt()} mm',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
            Text(
              'Casted on: ${DateFormat("dd-MMM-yyyy").format(test.castingDate)} (${test.ageInDays} Days in Tank)',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 12),

            // Day 7, Day 14, Day 28 Milestone Progress Chips
            Row(
              children: [
                Expanded(
                  child: _buildMilestoneBox(
                    'Day 7 (≥65%)',
                    test.day7StrengthPsi != null ? '${test.day7StrengthPsi!.toInt()} PSI' : 'Pending',
                    test.day7StrengthPsi != null,
                    test.isDay7Due,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildMilestoneBox(
                    'Day 14 (≥90%)',
                    test.day14StrengthPsi != null ? '${test.day14StrengthPsi!.toInt()} PSI' : 'Pending',
                    test.day14StrengthPsi != null,
                    test.isDay14Due,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildMilestoneBox(
                    'Day 28 (≥100%)',
                    test.day28StrengthPsi != null ? '${test.day28StrengthPsi!.toInt()} PSI' : 'Pending',
                    test.day28StrengthPsi != null,
                    test.isDay28Due,
                  ),
                ),
              ],
            ),

            if (test.isAnyMilestoneDue) ...[
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _recordStrength(test),
                  icon: const Icon(Icons.flash_on, size: 16),
                  label: Text('Record ${test.isDay7Due ? "Day 7" : test.isDay14Due ? "Day 14" : "Day 28"} Crushing Strength'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: SiteAppTheme.primarySafetyOrange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMilestoneBox(String title, String value, bool isCompleted, bool isDue) {
    Color bg = const Color(0xFFF8FAFC);
    Color border = const Color(0xFFE2E8F0);
    Color text = Colors.grey.shade600;

    if (isCompleted) {
      bg = SiteAppTheme.successGreen.withOpacity(0.1);
      border = SiteAppTheme.successGreen;
      text = SiteAppTheme.successGreen;
    } else if (isDue) {
      bg = Colors.amber.shade100;
      border = SiteAppTheme.primarySafetyOrange;
      text = const Color(0xFF78350F);
    }

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: border),
      ),
      child: Column(
        children: [
          Text(title, style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: text)),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: isCompleted ? SiteAppTheme.darkNavy : text),
          ),
        ],
      ),
    );
  }
}
