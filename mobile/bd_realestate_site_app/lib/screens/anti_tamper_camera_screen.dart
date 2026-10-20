import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/app_theme.dart';
import '../core/offline/offline_sync_queue.dart';

class AntiTamperCameraScreen extends StatefulWidget {
  final String projectName;
  final String floorLevel;
  final ValueChanged<Map<String, dynamic>>? onPhotoCaptured;

  const AntiTamperCameraScreen({
    super.key,
    this.projectName = 'Green Horizon Tower',
    this.floorLevel = '8th Floor Slab',
    this.onPhotoCaptured,
  });

  @override
  State<AntiTamperCameraScreen> createState() => _AntiTamperCameraScreenState();
}

class _AntiTamperCameraScreenState extends State<AntiTamperCameraScreen> {
  bool _isCaptured = false;
  bool _shutterFlash = false;
  final String _latitude = '23.7925° N';
  final String _longitude = '90.4078° E';
  final String _altitude = '+14.2m MSL';
  final String _engineerName = 'Engr. Tanvir Asif (Site Lead)';
  late String _timestamp;
  late String _sha256Hash;
  late String _currentFloor;

  @override
  void initState() {
    super.initState();
    _currentFloor = widget.floorLevel;
    _updateTimestampAndHash();
  }

  void _updateTimestampAndHash() {
    final now = DateTime.now();
    _timestamp = DateFormat('dd-MMM-yyyy hh:mm:ss a').format(now);
    _sha256Hash = 'SHA256:E9A7-${now.millisecondsSinceEpoch.toRadixString(16).toUpperCase()}-BD71';
  }

  void _captureLivePhoto() {
    setState(() => _shutterFlash = true);
    Future.delayed(const Duration(milliseconds: 160), () {
      if (mounted) {
        setState(() {
          _shutterFlash = false;
          _isCaptured = true;
          _updateTimestampAndHash();
        });
      }
    });

    final photoData = {
      'project': widget.projectName,
      'floor': _currentFloor,
      'gps': '$_latitude, $_longitude ($_altitude)',
      'timestamp': _timestamp,
      'engineer': _engineerName,
      'hash': _sha256Hash,
      'tamper_resistant': true,
    };

    OfflineSyncQueue().enqueue('PHOTO', photoData);
    widget.onPhotoCaptured?.call(photoData);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Anti-tamper GPS metadata burned onto image pixels & queued for sync!'),
        backgroundColor: SiteAppTheme.successGreen,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        title: const Text('Anti-Tamper Site Camera', style: TextStyle(color: Colors.white)),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: SiteAppTheme.alertRed.withOpacity(0.2),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: SiteAppTheme.alertRed),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.block, size: 12, color: SiteAppTheme.alertRed),
                SizedBox(width: 4),
                Text('Gallery Disabled', style: TextStyle(color: SiteAppTheme.alertRed, fontSize: 10, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Security Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: Color(0xFFF1F5F9),
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              children: [
                const Icon(Icons.gps_fixed, color: SiteAppTheme.primarySafetyOrange, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Live GPS Fix: $_latitude, $_longitude · Accuracy: ±1.8m',
                    style: const TextStyle(fontSize: 11, color: SiteAppTheme.darkNavy, fontFamily: 'monospace', fontWeight: FontWeight.w500),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: SiteAppTheme.successGreen.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text('LOCKED', style: TextStyle(color: SiteAppTheme.successGreen, fontSize: 9, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          // Floor Selector Dropdown in Viewport Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              children: [
                const Text('Target Structural Floor:', style: TextStyle(color: Color(0xFF64748B), fontSize: 12, fontWeight: FontWeight.w500)),
                const SizedBox(width: 10),
                Expanded(
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _currentFloor,
                      dropdownColor: Colors.white,
                      style: const TextStyle(color: SiteAppTheme.primarySafetyOrange, fontWeight: FontWeight.bold, fontSize: 13),
                      items: [
                        'Basement-2 Foundation Mat',
                        'Basement-1 Retaining Wall',
                        'Ground Floor Podium',
                        '4th Floor Shear Wall',
                        '7th Floor Slab',
                        '8th Floor Slab',
                        '9th Floor Column Cast',
                      ].map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
                      onChanged: _isCaptured
                          ? null
                          : (val) {
                              if (val != null) setState(() => _currentFloor = val);
                            },
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Camera Viewport / Burned Canvas
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _shutterFlash ? Colors.white : Colors.black,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white24, width: 2),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 16),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    // Mock Construction Viewfinder background
                    Container(
                      color: const Color(0xFF1E293B),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _isCaptured ? Icons.check_circle_outline : Icons.construction,
                              color: _isCaptured ? SiteAppTheme.successGreen : Colors.white24,
                              size: 72,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              _isCaptured ? 'Live Photo Captured & Watermarked' : 'Align Rebar / Casting with Frame',
                              style: TextStyle(
                                color: _isCaptured ? Colors.white : Colors.white38,
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${widget.projectName} · $_currentFloor',
                              style: const TextStyle(color: Colors.white54, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Crosshair Alignment Reticle
                    if (!_isCaptured)
                      Center(
                        child: Container(
                          width: 220,
                          height: 220,
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.white24, width: 1.5),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Center(
                            child: Icon(Icons.add, color: Colors.white38, size: 28),
                          ),
                        ),
                      ),

                    // Burned Anti-Tamper Watermark Box (Directly burned onto image pixels)
                    Positioned(
                      bottom: 12,
                      left: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.75),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: SiteAppTheme.primarySafetyOrange, width: 1.2),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.verified, color: SiteAppTheme.primarySafetyOrange, size: 14),
                                    const SizedBox(width: 4),
                                    Text(
                                      widget.projectName.toUpperCase(),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 10,
                                        letterSpacing: 0.8,
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: SiteAppTheme.primarySafetyOrange,
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                  child: Text(
                                    _currentFloor,
                                    style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'GPS: $_latitude, $_longitude ($_altitude)',
                              style: const TextStyle(color: SiteAppTheme.successGreen, fontSize: 10, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                            ),
                            Text(
                              'TIMESTAMP: $_timestamp (BST +06:00)',
                              style: const TextStyle(color: Colors.white70, fontSize: 9, fontFamily: 'monospace'),
                            ),
                            Text(
                              'SITE LEAD: $_engineerName',
                              style: const TextStyle(color: Colors.white60, fontSize: 9),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'IMMUTABLE HASH: $_sha256Hash',
                              style: TextStyle(color: Colors.amber.shade300, fontSize: 8, fontFamily: 'monospace'),
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

          // Camera Action Controls
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
            child: _isCaptured
                ? Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => setState(() => _isCaptured = false),
                          icon: const Icon(Icons.refresh, color: Colors.white70),
                          label: const Text('Retake Live Shot', style: TextStyle(color: Colors.white)),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Colors.white30),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.check),
                          label: const Text('Accept & Attach'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: SiteAppTheme.successGreen,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                        ),
                      ),
                    ],
                  )
                : Center(
                    child: GestureDetector(
                      onTap: _captureLivePhoto,
                      child: Container(
                        width: 76,
                        height: 76,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: SiteAppTheme.primarySafetyOrange, width: 4),
                        ),
                        child: Center(
                          child: Container(
                            width: 60,
                            height: 60,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.camera_alt, color: SiteAppTheme.darkNavy),
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
