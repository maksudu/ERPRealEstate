import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/offline/offline_sync_queue.dart';
import 'anti_tamper_camera_screen.dart';

class DprEntryScreen extends StatefulWidget {
  const DprEntryScreen({super.key});

  @override
  State<DprEntryScreen> createState() => _DprEntryScreenState();
}

class _DprEntryScreenState extends State<DprEntryScreen> {
  final _formKey = GlobalKey<FormState>();

  String _selectedProject = 'Green Horizon Tower (Gulshan-2)';
  String _selectedFloor = '7th Floor Slab';
  String _selectedActivity = 'Roof Slab RCC Casting';
  String _selectedWeather = 'Sunny (32°C)';

  final _concreteCftCtrl = TextEditingController(text: '320.0');
  final _rodMtCtrl = TextEditingController(text: '4.85');
  final _cementBagsCtrl = TextEditingController(text: '165');
  final _craneHoursCtrl = TextEditingController(text: '7.5');
  final _mixerHoursCtrl = TextEditingController(text: '8.0');
  final _narrativeCtrl = TextEditingController(
    text: 'Completed 7th floor slab rebar checking with structural consultant. Commenced casting at 11:30 AM with standard mix 1:1.5:3. Vibrators operated continuously.',
  );

  bool _photoAttached = false;
  Map<String, dynamic>? _capturedPhotoData;

  @override
  void dispose() {
    _concreteCftCtrl.dispose();
    _rodMtCtrl.dispose();
    _cementBagsCtrl.dispose();
    _craneHoursCtrl.dispose();
    _mixerHoursCtrl.dispose();
    _narrativeCtrl.dispose();
    super.dispose();
  }

  void _openCamera() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AntiTamperCameraScreen(
          projectName: _selectedProject,
          floorLevel: _selectedFloor,
          onPhotoCaptured: (data) {
            setState(() {
              _photoAttached = true;
              _capturedPhotoData = data;
            });
          },
        ),
      ),
    );
  }

  void _saveDpr() {
    if (!_formKey.currentState!.validate()) return;

    final data = {
      'project': _selectedProject,
      'floor': _selectedFloor,
      'activity': _selectedActivity,
      'weather': _selectedWeather,
      'concrete_cft': double.tryParse(_concreteCftCtrl.text) ?? 0.0,
      'rod_mt': double.tryParse(_rodMtCtrl.text) ?? 0.0,
      'cement_bags': int.tryParse(_cementBagsCtrl.text) ?? 0,
      'narrative': _narrativeCtrl.text,
      'crane_hours': double.tryParse(_craneHoursCtrl.text) ?? 0.0,
      'mixer_hours': double.tryParse(_mixerHoursCtrl.text) ?? 0.0,
      'photo_attached': _photoAttached,
      'photo_metadata': _capturedPhotoData,
    };

    OfflineSyncQueue().enqueue('DPR', data);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.cloud_done, color: SiteAppTheme.successGreen, size: 28),
            SizedBox(width: 8),
            Text('DPR Queued Offline!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Daily Progress Report has been encrypted and saved to local offline database (Isar).',
              style: TextStyle(fontSize: 13),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: SiteAppTheme.primarySafetyOrange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Project: $_selectedProject', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                  Text('Concrete Cast: ${_concreteCftCtrl.text} CFT', style: const TextStyle(fontSize: 11)),
                  Text('Rebar Consumed: ${_rodMtCtrl.text} MT', style: const TextStyle(fontSize: 11)),
                  Text('Watermarked Photo: ${_photoAttached ? "Attached (Verified GPS)" : "None"}', style: const TextStyle(fontSize: 11)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              '⚡ Auto-sync will trigger automatically upon internet reconnection.',
              style: TextStyle(fontSize: 11, color: Colors.grey, fontStyle: FontStyle.italic),
            ),
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
                const SnackBar(
                  content: Text('DPR recorded in offline storage.'),
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
        title: const Text('Daily Progress Report (DPR)'),
        actions: [
          IconButton(
            icon: const Icon(Icons.camera_alt, color: SiteAppTheme.primarySafetyOrange),
            tooltip: 'Live Anti-Tamper Photo',
            onPressed: _openCamera,
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Project & Structural Level
              DropdownButtonFormField<String>(
                value: _selectedProject,
                decoration: const InputDecoration(labelText: 'Project Site', border: OutlineInputBorder()),
                items: [
                  'Green Horizon Tower (Gulshan-2)',
                  'Lakeview Heights (Dhanmondi)',
                  'Gulshan Elite Residence',
                ].map((p) => DropdownMenuItem(value: p, child: Text(p, style: const TextStyle(fontSize: 13)))).toList(),
                onChanged: (v) => setState(() => _selectedProject = v!),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedFloor,
                      decoration: const InputDecoration(labelText: 'Structural Level', border: OutlineInputBorder()),
                      items: [
                        'Basement-2 Retaining Wall',
                        'Basement-1 Mat Foundation',
                        'Ground Floor Slab',
                        '4th Floor Shear Wall',
                        '7th Floor Slab',
                        '8th Floor Slab',
                      ].map((f) => DropdownMenuItem(value: f, child: Text(f, style: const TextStyle(fontSize: 12)))).toList(),
                      onChanged: (v) => setState(() => _selectedFloor = v!),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedWeather,
                      decoration: const InputDecoration(labelText: 'Site Weather', border: OutlineInputBorder()),
                      items: [
                        'Sunny (32°C)',
                        'Overcast (28°C)',
                        'Light Rain (25°C)',
                        'Heavy Rain / Suspended',
                      ].map((w) => DropdownMenuItem(value: w, child: Text(w, style: const TextStyle(fontSize: 12)))).toList(),
                      onChanged: (v) => setState(() => _selectedWeather = v!),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              DropdownButtonFormField<String>(
                value: _selectedActivity,
                decoration: const InputDecoration(labelText: 'Primary Construction Activity', border: OutlineInputBorder()),
                items: [
                  'Roof Slab RCC Casting',
                  'Column & Shear Wall Concreting',
                  'Rebar Binding & Formwork Shuttering',
                  'Brick Masonry & Lintels',
                  'Substructure Waterproofing Membrane',
                ].map((a) => DropdownMenuItem(value: a, child: Text(a, style: const TextStyle(fontSize: 12)))).toList(),
                onChanged: (v) => setState(() => _selectedActivity = v!),
              ),

              const SizedBox(height: 20),

              // Material Consumption Metrics
              const Text(
                'Materials Consumed Today',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: SiteAppTheme.darkNavy),
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: _buildMetricInput(
                      _concreteCftCtrl,
                      'Concrete (CFT)',
                      Icons.format_paint,
                      suffix: 'CFT',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildMetricInput(
                      _rodMtCtrl,
                      'Steel Rebar (MT)',
                      Icons.architecture,
                      suffix: 'MT',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildMetricInput(
                      _cementBagsCtrl,
                      'Cement',
                      Icons.inventory_2,
                      suffix: 'Bags',
                      isInteger: true,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // Plant & Machinery Operating Hours
              const Text(
                'Plant & Heavy Machinery Utilization',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: SiteAppTheme.darkNavy),
              ),
              const SizedBox(height: 10),

              Row(
                children: [
                  Expanded(
                    child: _buildMetricInput(
                      _craneHoursCtrl,
                      'Tower Crane (Hrs)',
                      Icons.precision_manufacturing,
                      suffix: 'Hrs',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricInput(
                      _mixerHoursCtrl,
                      'Transit Mixer (Hrs)',
                      Icons.fire_truck_outlined,
                      suffix: 'Hrs',
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Anti-Tamper Photo Attachment Card
              const Text(
                'Anti-Tamper Watermarked Photo Proof',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: SiteAppTheme.darkNavy),
              ),
              const SizedBox(height: 10),

              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _photoAttached ? SiteAppTheme.successGreen.withOpacity(0.08) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _photoAttached ? SiteAppTheme.successGreen : const Color(0xFFCBD5E1),
                    width: _photoAttached ? 1.5 : 1.0,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: _photoAttached ? SiteAppTheme.successGreen.withOpacity(0.15) : SiteAppTheme.primarySafetyOrange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        _photoAttached ? Icons.check_circle : Icons.camera_alt,
                        color: _photoAttached ? SiteAppTheme.successGreen : SiteAppTheme.primarySafetyOrange,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _photoAttached ? 'Watermarked Proof Attached' : 'Live Camera Shot Required',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                          Text(
                            _photoAttached
                                ? 'GPS: 23.7925° N, 90.4078° E (Burned into pixels)'
                                : 'Gallery upload disabled. Live on-site shot only.',
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _photoAttached ? Colors.grey.shade200 : SiteAppTheme.primarySafetyOrange,
                        foregroundColor: _photoAttached ? Colors.black87 : Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      onPressed: _openCamera,
                      child: Text(_photoAttached ? 'Retake' : 'Capture', style: const TextStyle(fontSize: 11)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Daily Narrative & Engineering Notes
              const Text(
                'Daily Engineering Narrative & Quality Observations',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: SiteAppTheme.darkNavy),
              ),
              const SizedBox(height: 10),

              TextFormField(
                controller: _narrativeCtrl,
                maxLines: 4,
                style: const TextStyle(fontSize: 13),
                decoration: const InputDecoration(
                  hintText: 'Record concrete slump check, cube casting samples, safety incidents, weather delays...',
                  border: OutlineInputBorder(),
                  filled: true,
                  fillColor: Colors.white,
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Please enter daily narrative';
                  return null;
                },
              ),

              const SizedBox(height: 24),

              // Save to Offline Queue Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.cloud_upload_outlined),
                  label: const Text('Save DPR to Offline Database', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: SiteAppTheme.primarySafetyOrange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  onPressed: _saveDpr,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricInput(
    TextEditingController controller,
    String label,
    IconData icon, {
    required String suffix,
    bool isInteger = false,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(fontSize: 11, color: Colors.grey.shade600),
        suffixText: suffix,
        suffixStyle: const TextStyle(fontSize: 10, color: Colors.grey),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      validator: (val) {
        if (val == null || val.trim().isEmpty) return 'Required';
        if (double.tryParse(val) == null) return 'Invalid';
        return null;
      },
    );
  }
}
