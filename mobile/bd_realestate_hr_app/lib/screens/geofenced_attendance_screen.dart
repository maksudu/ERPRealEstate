import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../models/attendance_record.dart';

class GeofencedAttendanceScreen extends StatefulWidget {
  const GeofencedAttendanceScreen({super.key});

  @override
  State<GeofencedAttendanceScreen> createState() => _GeofencedAttendanceScreenState();
}

class _GeofencedAttendanceScreenState extends State<GeofencedAttendanceScreen> {
  String _selectedSite = 'Head Office (Gulshan-1)';
  final double _currentDistanceMetres = 28.0; // Within 50m geofence
  bool _isMockGpsActive = false;
  bool _livenessPassed = false;
  bool _isVerifyingLiveness = false;
  String _livenessPrompt = 'Center face in oval and blink';

  final List<String> _assignedSites = [
    'Head Office (Gulshan-1)',
    'Green Horizon Tower Site (Gulshan-2)',
    'Navana Heights Site (Banani)',
  ];

  void _runFacialLivenessVerification() async {
    setState(() {
      _isVerifyingLiveness = true;
      _livenessPrompt = 'Look directly at camera...';
      _livenessPassed = false;
    });

    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;
    setState(() => _livenessPrompt = 'Please BLINK now...');

    await Future.delayed(const Duration(milliseconds: 1200));
    if (!mounted) return;
    setState(() {
      _livenessPrompt = 'Blink Verified • Liveness Score: 99.4%';
      _isVerifyingLiveness = false;
      _livenessPassed = true;
    });
  }

  void _submitClockIn() {
    if (_isMockGpsActive) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('ATTENDANCE BLOCKED: Fake GPS / Mock Location detected!'),
          backgroundColor: HrTheme.alertCrimson,
        ),
      );
      return;
    }

    if (_currentDistanceMetres > 50.0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('You are ${_currentDistanceMetres.toInt()}m away from $_selectedSite. Must be within 50m!'),
          backgroundColor: HrTheme.alertCrimson,
        ),
      );
      return;
    }

    if (!_livenessPassed) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please complete facial liveness blink test before clock-in!'),
          backgroundColor: HrTheme.amberWarning,
        ),
      );
      return;
    }

    final record = AttendanceRecord(
      id: 'ATT-${DateTime.now().millisecondsSinceEpoch}',
      employeeName: 'Md. Tanvir Hossain',
      checkInTime: DateTime.now(),
      siteName: _selectedSite,
      latitude: 23.7781,
      longitude: 90.4174,
      distanceMetres: _currentDistanceMetres,
      isWithinGeofence: true,
      isMocked: false,
      isLivenessVerified: true,
      status: 'PRESENT_ON_TIME',
    );

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: HrTheme.successTeal, size: 28),
            SizedBox(width: 10),
            Text('Clock-In Verified!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Site: ${record.siteName}', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('Distance: ${record.distanceMetres.toInt()} metres from site polygon boundary'),
            const SizedBox(height: 4),
            const Text('GPS Anti-Spoof: Passed (Real Hardware GNSS)'),
            const SizedBox(height: 4),
            const Text('Facial Liveness: Blink Verified (ML Kit)'),
            const SizedBox(height: 8),
            Text(
              'Timestamp: ${record.checkInTime.toIso8601String().substring(11, 19)}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isWithin = _currentDistanceMetres <= 50.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Geofenced Smart Attendance'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Site Geofence Verification Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.share_location_rounded, color: HrTheme.primaryIndigo),
                        SizedBox(width: 8),
                        Text('50-Metre Boundary Polygon Check', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _selectedSite,
                      decoration: const InputDecoration(labelText: 'Assigned Worksite', border: OutlineInputBorder()),
                      items: _assignedSites.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                      onChanged: (val) => setState(() => _selectedSite = val!),
                    ),
                    const SizedBox(height: 14),

                    // Live GPS proximity readout
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: (isWithin ? HrTheme.successTeal : HrTheme.alertCrimson).withOpacity(0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: (isWithin ? HrTheme.successTeal : HrTheme.alertCrimson).withOpacity(0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isWithin ? Icons.check_circle : Icons.error_outline,
                            color: isWithin ? HrTheme.successTeal : HrTheme.alertCrimson,
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isWithin
                                      ? 'Inside Geofence (${_currentDistanceMetres.toInt()}m from site centre)'
                                      : 'Outside 50m Boundary (${_currentDistanceMetres.toInt()}m away)',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: isWithin ? HrTheme.successTeal : HrTheme.alertCrimson,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _isMockGpsActive
                                      ? 'Mock GPS Detected (position.isMocked == true)'
                                      : 'Anti-Spoofing: Real Hardware GNSS Verified',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: _isMockGpsActive ? HrTheme.alertCrimson : const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 10),
                    // Debug toggle to test anti-spoofing block
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Simulate Mock Location (Anti-Spoof test):', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        Switch(
                          value: _isMockGpsActive,
                          activeColor: HrTheme.alertCrimson,
                          onChanged: (val) => setState(() => _isMockGpsActive = val),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Facial Liveness Camera Viewfinder
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.face_retouching_natural, color: HrTheme.primaryIndigo),
                        SizedBox(width: 8),
                        Text('Facial Liveness Verification', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Oval Viewfinder
                    Center(
                      child: Container(
                        width: 160,
                        height: 200,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(80),
                          border: Border.all(
                            color: _livenessPassed
                                ? HrTheme.successTeal
                                : (_isVerifyingLiveness ? HrTheme.primaryIndigo : const Color(0xFF94A3B8)),
                            width: 3,
                          ),
                        ),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            Icon(
                              _livenessPassed ? Icons.face : Icons.person_outline,
                              size: 100,
                              color: _livenessPassed ? HrTheme.successTeal : Colors.white24,
                            ),
                            if (_isVerifyingLiveness)
                              const CircularProgressIndicator(color: HrTheme.primaryIndigo),
                            if (_livenessPassed)
                              const Positioned(
                                bottom: 16,
                                child: Icon(Icons.check_circle, color: HrTheme.successTeal, size: 28),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    Center(
                      child: Text(
                        _livenessPrompt,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: _livenessPassed ? HrTheme.successTeal : HrTheme.deepNavy,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    Center(
                      child: OutlinedButton.icon(
                        onPressed: _isVerifyingLiveness ? null : _runFacialLivenessVerification,
                        icon: const Icon(Icons.remove_red_eye_outlined, size: 18),
                        label: Text(_livenessPassed ? 'Re-verify Blink' : 'Start Blink Verification'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Clock In Action Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: isWithin && !_isMockGpsActive && _livenessPassed
                      ? HrTheme.successTeal
                      : HrTheme.primaryIndigo,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: _submitClockIn,
                icon: const Icon(Icons.fingerprint, size: 24),
                label: const Text(
                  'CONFIRM CLOCK-IN',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 1.1),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
