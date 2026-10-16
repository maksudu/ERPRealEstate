import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../models/scurve_data.dart';

class SCurveRadarScreen extends StatefulWidget {
  const SCurveRadarScreen({super.key});

  @override
  State<SCurveRadarScreen> createState() => _SCurveRadarScreenState();
}

class _SCurveRadarScreenState extends State<SCurveRadarScreen> {
  final ProjectSCurve _projectData = const ProjectSCurve(
    projectName: 'Green Horizon Tower (Gulshan-2)',
    location: 'Plot 41, Road 103, Gulshan-2, Dhaka',
    overallPlanned: 58.0,
    overallActual: 56.4,
    scheduleVariance: -1.6,
    cpi: 1.04,
    spi: 0.97,
    points: [
      SCurvePoint(monthIndex: 1, label: 'M1', plannedPercent: 4.0, actualPercent: 4.2),
      SCurvePoint(monthIndex: 2, label: 'M2', plannedPercent: 9.0, actualPercent: 9.5),
      SCurvePoint(monthIndex: 3, label: 'M3', plannedPercent: 16.0, actualPercent: 15.8),
      SCurvePoint(monthIndex: 4, label: 'M4', plannedPercent: 24.0, actualPercent: 23.5),
      SCurvePoint(monthIndex: 5, label: 'M5', plannedPercent: 34.0, actualPercent: 32.8),
      SCurvePoint(monthIndex: 6, label: 'M6', plannedPercent: 45.0, actualPercent: 44.0),
      SCurvePoint(monthIndex: 7, label: 'M7', plannedPercent: 58.0, actualPercent: 56.4),
      SCurvePoint(monthIndex: 8, label: 'M8', plannedPercent: 70.0),
      SCurvePoint(monthIndex: 9, label: 'M9', plannedPercent: 82.0),
      SCurvePoint(monthIndex: 10, label: 'M10', plannedPercent: 92.0),
      SCurvePoint(monthIndex: 11, label: 'M11', plannedPercent: 100.0),
    ],
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Construction S-Curve Radar'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Project Header
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _projectData.projectName,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _projectData.location,
                      style: const TextStyle(fontSize: 12, color: ManagementTheme.textMuted),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // S-Curve Canvas Graph
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'S-CURVE PROGRESS RADAR',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.1, color: ManagementTheme.textMuted),
                        ),
                        Row(
                          children: [
                            _buildLegendItem('Planned', ManagementTheme.luxuryGold),
                            const SizedBox(width: 12),
                            _buildLegendItem('Actual', const Color(0xFF38BDF8)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Custom S-Curve Painter
                    SizedBox(
                      height: 180,
                      width: double.infinity,
                      child: CustomPaint(
                        painter: SCurvePainter(points: _projectData.points),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Center(
                      child: Text(
                        'Cumulative Progress Timeline (Month 1 to Handover)',
                        style: TextStyle(fontSize: 11, color: ManagementTheme.textMuted),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // EVM Performance Metrics
            const Text(
              'EARNED VALUE MANAGEMENT (EVM)',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: ManagementTheme.textMuted,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _buildEvmCard(
                    'CPI (Cost)',
                    '${_projectData.cpi}',
                    'Under Budget',
                    ManagementTheme.successEmerald,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildEvmCard(
                    'SPI (Schedule)',
                    '${_projectData.spi}',
                    'Minor Delay (4d)',
                    ManagementTheme.brightGold,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildEvmCard(
                    'Variance',
                    '${_projectData.scheduleVariance}%',
                    'Within buffer',
                    const Color(0xFF38BDF8),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Major Construction Milestones
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Milestone Progress Health', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 14),
                    _buildMilestoneRow('Deep Foundation & Cast-in-situ Piling', 1.0, true),
                    const SizedBox(height: 10),
                    _buildMilestoneRow('Basement 1 & 2 Retaining Wall RCC', 1.0, true),
                    const SizedBox(height: 10),
                    _buildMilestoneRow('Ground Floor to 7th Floor Superstructure', 1.0, true),
                    const SizedBox(height: 10),
                    _buildMilestoneRow('8th Floor to 14th Floor Rebar & Casting', 0.65, false),
                    const SizedBox(height: 10),
                    _buildMilestoneRow('Internal Masonry, Plumbing & Electrical', 0.25, false),
                    const SizedBox(height: 10),
                    _buildMilestoneRow('Exterior Glazing & Luxury Facade Finishes', 0.05, false),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.white70)),
      ],
    );
  }

  Widget _buildEvmCard(String title, String val, String status, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: ManagementTheme.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 11, color: ManagementTheme.textMuted)),
          const SizedBox(height: 4),
          Text(val, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(status, style: TextStyle(fontSize: 9, color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildMilestoneRow(String title, double progress, bool isDone) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
            ),
            Text(
              '${(progress * 100).toInt()}%',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isDone ? ManagementTheme.successEmerald : ManagementTheme.luxuryGold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: progress,
          backgroundColor: const Color(0xFF334155),
          valueColor: AlwaysStoppedAnimation<Color>(
            isDone ? ManagementTheme.successEmerald : ManagementTheme.luxuryGold,
          ),
          minHeight: 5,
          borderRadius: BorderRadius.circular(3),
        ),
      ],
    );
  }
}

class SCurvePainter extends CustomPainter {
  final List<SCurvePoint> points;

  SCurvePainter({required this.points});

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = const Color(0xFF334155)
      ..strokeWidth = 1.0;

    // Draw horizontal grid lines (25%, 50%, 75%, 100%)
    for (int i = 1; i <= 4; i++) {
      final y = size.height - (size.height * (i * 0.25));
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final plannedPaint = Paint()
      ..color = ManagementTheme.luxuryGold
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke;

    final actualPaint = Paint()
      ..color = const Color(0xFF38BDF8)
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke;

    final plannedPath = Path();
    final actualPath = Path();

    final double stepX = size.width / (points.length - 1);

    for (int i = 0; i < points.length; i++) {
      final x = i * stepX;
      final yPlanned = size.height - (size.height * (points[i].plannedPercent / 100.0));

      if (i == 0) {
        plannedPath.moveTo(x, yPlanned);
      } else {
        plannedPath.lineTo(x, yPlanned);
      }

      if (points[i].actualPercent != null) {
        final yActual = size.height - (size.height * (points[i].actualPercent! / 100.0));
        if (i == 0) {
          actualPath.moveTo(x, yActual);
        } else {
          actualPath.lineTo(x, yActual);
        }
      }
    }

    canvas.drawPath(plannedPath, plannedPaint);
    canvas.drawPath(actualPath, actualPaint);
  }

  @override
  bool shouldRepaint(SCurvePainter oldDelegate) => oldDelegate.points != points;
}
