import 'package:flutter/material.dart';
import '../../domain/entities/booking_entity.dart';
import '../../core/theme/app_theme.dart';

class DigitalSignaturePad extends StatelessWidget {
  final List<List<DigitalSignaturePoint>> strokes;
  final List<DigitalSignaturePoint> currentStroke;
  final ValueChanged<DigitalSignaturePoint> onAddPoint;
  final VoidCallback onStrokeEnd;
  final VoidCallback onClear;

  const DigitalSignaturePad({
    super.key,
    required this.strokes,
    required this.currentStroke,
    required this.onAddPoint,
    required this.onStrokeEnd,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final hasSignature = strokes.isNotEmpty || currentStroke.isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: hasSignature ? AppTheme.primaryTeal : const Color(0xFFCBD5E1),
          width: hasSignature ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.draw_outlined,
                      size: 20,
                      color: hasSignature ? AppTheme.primaryTeal : Colors.grey.shade700,
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Customer On-Glass Digital Signature',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ],
                ),
                if (hasSignature)
                  TextButton.icon(
                    onPressed: onClear,
                    icon: const Icon(Icons.refresh, size: 16, color: AppTheme.dangerRed),
                    label: const Text('Clear', style: TextStyle(color: AppTheme.dangerRed, fontSize: 12)),
                    style: TextButton.styleFrom(
                      visualDensity: VisualDensity.compact,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                  ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Canvas
          ClipRRect(
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(16),
              bottomRight: Radius.circular(16),
            ),
            child: GestureDetector(
              onPanStart: (details) {
                final localPos = details.localPosition;
                onAddPoint(DigitalSignaturePoint(localPos.dx, localPos.dy));
              },
              onPanUpdate: (details) {
                final localPos = details.localPosition;
                onAddPoint(DigitalSignaturePoint(localPos.dx, localPos.dy));
              },
              onPanEnd: (details) {
                onStrokeEnd();
              },
              child: Container(
                height: 180,
                width: double.infinity,
                color: const Color(0xFFF8FAFC),
                child: Stack(
                  children: [
                    CustomPaint(
                      painter: _SignatureCustomPainter(
                        strokes: strokes,
                        currentStroke: currentStroke,
                      ),
                      size: Size.infinite,
                    ),
                    if (!hasSignature)
                      Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.touch_app_outlined, size: 36, color: Colors.grey.shade400),
                            const SizedBox(height: 8),
                            Text(
                              'Please sign with finger or stylus here\nLegal Allotment Signature Verification',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.grey.shade400,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    Positioned(
                      bottom: 8,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: hasSignature ? AppTheme.successGreen.withOpacity(0.12) : Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              hasSignature ? Icons.check_circle : Icons.verified_user_outlined,
                              size: 13,
                              color: hasSignature ? AppTheme.successGreen : Colors.grey.shade600,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              hasSignature ? 'Biometric Signature Captured' : 'Awaiting Signature',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: hasSignature ? AppTheme.successGreen : Colors.grey.shade600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SignatureCustomPainter extends CustomPainter {
  final List<List<DigitalSignaturePoint>> strokes;
  final List<DigitalSignaturePoint> currentStroke;

  _SignatureCustomPainter({
    required this.strokes,
    required this.currentStroke,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF0F172A)
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..strokeWidth = 3.0
      ..isAntiAlias = true;

    // Draw past strokes
    for (final stroke in strokes) {
      if (stroke.isEmpty) continue;
      if (stroke.length == 1) {
        canvas.drawCircle(stroke.first.toOffset(), 1.5, paint);
      } else {
        for (int i = 0; i < stroke.length - 1; i++) {
          canvas.drawLine(stroke[i].toOffset(), stroke[i + 1].toOffset(), paint);
        }
      }
    }

    // Draw current active stroke
    if (currentStroke.isNotEmpty) {
      if (currentStroke.length == 1) {
        canvas.drawCircle(currentStroke.first.toOffset(), 1.5, paint);
      } else {
        for (int i = 0; i < currentStroke.length - 1; i++) {
          canvas.drawLine(currentStroke[i].toOffset(), currentStroke[i + 1].toOffset(), paint);
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _SignatureCustomPainter oldDelegate) => true;
}
