import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class NidCameraCaptureCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool isCaptured;
  final VoidCallback onCapture;

  const NidCameraCaptureCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.isCaptured,
    required this.onCapture,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCaptured ? AppTheme.successGreen : const Color(0xFFCBD5E1),
          width: isCaptured ? 1.5 : 1.0,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _openCameraModal(context),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: isCaptured
                        ? AppTheme.successGreen.withOpacity(0.12)
                        : AppTheme.primaryTeal.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    isCaptured ? Icons.check_circle : Icons.camera_alt_outlined,
                    color: isCaptured ? AppTheme.successGreen : AppTheme.primaryTeal,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            title,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          const SizedBox(width: 8),
                          if (isCaptured)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.successGreen.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'OCR Scanned',
                                style: TextStyle(
                                  fontSize: 10,
                                  color: AppTheme.successGreen,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        isCaptured ? 'High-resolution image verified & attached.' : subtitle,
                        style: TextStyle(
                          color: isCaptured ? AppTheme.successGreen : Colors.grey.shade600,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  isCaptured ? Icons.refresh : Icons.chevron_right,
                  color: Colors.grey.shade400,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openCameraModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _CameraCaptureSheet(
        title: title,
        onCaptureConfirmed: onCapture,
      ),
    );
  }
}

class _CameraCaptureSheet extends StatefulWidget {
  final String title;
  final VoidCallback onCaptureConfirmed;

  const _CameraCaptureSheet({
    required this.title,
    required this.onCaptureConfirmed,
  });

  @override
  State<_CameraCaptureSheet> createState() => _CameraCaptureSheetState();
}

class _CameraCaptureSheetState extends State<_CameraCaptureSheet> {
  bool _photoTaken = false;
  bool _shutterBlink = false;

  void _snapPhoto() {
    setState(() => _shutterBlink = true);
    Future.delayed(const Duration(milliseconds: 150), () {
      if (mounted) {
        setState(() {
          _shutterBlink = false;
          _photoTaken = true;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.title,
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Camera Viewport Simulation
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(
                color: _shutterBlink ? Colors.white : Colors.black87,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white24, width: 2),
              ),
              child: Stack(
                children: [
                  // NID Card outline guide
                  Center(
                    child: Container(
                      width: 290,
                      height: 180,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: _photoTaken ? AppTheme.successGreen : AppTheme.accentAmber,
                          width: 2.5,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        color: _photoTaken
                            ? const Color(0xFF1E293B)
                            : Colors.white.withOpacity(0.04),
                      ),
                      child: _photoTaken
                          ? Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.verified, color: AppTheme.successGreen, size: 44),
                                const SizedBox(height: 8),
                                const Text(
                                  'GOVERNMENT OF BANGLADESH',
                                  style: TextStyle(color: Colors.white70, fontSize: 10, letterSpacing: 1),
                                ),
                                const Text(
                                  'NATIONAL ID CARD / NID',
                                  style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.black45,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: const Text(
                                    'NID: 19852691234567890',
                                    style: TextStyle(color: AppTheme.accentAmber, fontSize: 11, fontFamily: 'monospace'),
                                  ),
                                ),
                              ],
                            )
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.crop_free, color: Colors.white.withOpacity(0.6), size: 48),
                                const SizedBox(height: 8),
                                Text(
                                  'Align ${widget.title} within frame',
                                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                              ],
                            ),
                    ),
                  ),

                  // OCR scanning indicator
                  Positioned(
                    top: 16,
                    left: 20,
                    right: 20,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            _photoTaken ? Icons.check_circle : Icons.document_scanner,
                            color: _photoTaken ? AppTheme.successGreen : AppTheme.accentAmber,
                            size: 15,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _photoTaken ? 'OCR Document Verified' : 'Real-time Edge & Text Detection Active',
                            style: TextStyle(
                              color: _photoTaken ? AppTheme.successGreen : Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
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

          // Action Controls
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: _photoTaken
                ? Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => setState(() => _photoTaken = false),
                          icon: const Icon(Icons.refresh, color: Colors.white70),
                          label: const Text('Retake', style: TextStyle(color: Colors.white)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.white30),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            widget.onCaptureConfirmed();
                            Navigator.pop(context);
                          },
                          icon: const Icon(Icons.check),
                          label: const Text('Use Photo'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.successGreen,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                    ],
                  )
                : Center(
                    child: GestureDetector(
                      onTap: _snapPhoto,
                      child: Container(
                        width: 74,
                        height: 74,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 4),
                        ),
                        child: Center(
                          child: Container(
                            width: 58,
                            height: 58,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
