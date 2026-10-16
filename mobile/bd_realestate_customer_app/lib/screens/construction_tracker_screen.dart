import 'package:flutter/material.dart';
import '../core/theme/customer_theme.dart';
import '../models/construction_milestone.dart';

class ConstructionTrackerScreen extends StatefulWidget {
  const ConstructionTrackerScreen({super.key});

  @override
  State<ConstructionTrackerScreen> createState() => _ConstructionTrackerScreenState();
}

class _ConstructionTrackerScreenState extends State<ConstructionTrackerScreen> {
  final List<ConstructionMilestone> _milestones = const [
    ConstructionMilestone(milestoneName: 'Deep Foundation & Cast-in-situ Piling', progressPercent: 1.0, isCompleted: true, targetCompletion: 'Completed Jan 2026'),
    ConstructionMilestone(milestoneName: 'Basement 1 & 2 Retaining Wall RCC', progressPercent: 1.0, isCompleted: true, targetCompletion: 'Completed Mar 2026'),
    ConstructionMilestone(milestoneName: 'Ground Floor to 7th Floor Superstructure', progressPercent: 1.0, isCompleted: true, targetCompletion: 'Completed Aug 2026'),
    ConstructionMilestone(milestoneName: '8th Floor to 14th Floor Rebar & RCC Casting', progressPercent: 0.65, isCompleted: false, targetCompletion: 'Target: Oct 2026'),
    ConstructionMilestone(milestoneName: 'Internal Brickwork, Plumbing & Conduit', progressPercent: 0.30, isCompleted: false, targetCompletion: 'Target: Nov 2026'),
    ConstructionMilestone(milestoneName: 'Luxury Exterior Glazing & Pre-Handover', progressPercent: 0.10, isCompleted: false, targetCompletion: 'Target: Dec 2026'),
  ];

  final List<SitePhoto> _photos = const [
    SitePhoto(
      title: '7th Floor Slab RCC Casting',
      monthYear: 'September 2026',
      date: '14 Sep 2026',
      description: 'Completed 320 CFT structural casting with ready-mix concrete pump.',
    ),
    SitePhoto(
      title: 'Floor 5-7 Brick Masonry & Plaster',
      monthYear: 'August 2026',
      date: '28 Aug 2026',
      description: 'First class brick laying and conduit fixing underway in North Tower.',
    ),
    SitePhoto(
      title: 'Basement Mechanical & Lift Shaft',
      monthYear: 'July 2026',
      date: '15 Jul 2026',
      description: 'Schindler high-speed elevator structural hoistway inspection passed.',
    ),
  ];

  void _launch360Tour() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.threed_rotation, color: CustomerTheme.midnightNavy),
            SizedBox(width: 8),
            Text('360° Virtual Site Tour'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 180,
              width: double.infinity,
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.panorama_photosphere, color: CustomerTheme.brightGold, size: 48),
                    SizedBox(height: 8),
                    Text('Interactive 360° Sphere Loaded', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                    SizedBox(height: 2),
                    Text('Drag to pan around 7th Floor Slab & Lake View', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                  ],
                ),
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close Tour'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Construction Progress'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Overall Construction Progress Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0A1128), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'OVERALL CONSTRUCTION PROGRESS',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.1,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                      Text(
                        'ON TRACK (ON TIME)',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF34D399)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Green Horizon Tower',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      Text(
                        '68%',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: CustomerTheme.brightGold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  LinearProgressIndicator(
                    value: 0.68,
                    backgroundColor: Colors.white12,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF34D399)),
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // 360-Degree Virtual Tour Card
            InkWell(
              onTap: _launch360Tour,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: CustomerTheme.luxuryGold.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.threed_rotation, color: Color(0xFF854D0E), size: 28),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '360° Virtual Site Experience',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: CustomerTheme.midnightNavy),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Step inside Unit A-7 and experience live panoramic lake view',
                            style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.play_circle_fill, color: CustomerTheme.midnightNavy, size: 28),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Milestone Tracker List
            const Text(
              'CONSTRUCTION MILESTONES',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 10),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: _milestones.map((m) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  m.milestoneName,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: m.isCompleted ? FontWeight.bold : FontWeight.w500,
                                    color: CustomerTheme.midnightNavy,
                                  ),
                                ),
                              ),
                              Text(
                                '${(m.progressPercent * 100).toInt()}%',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: m.isCompleted ? CustomerTheme.successGreen : const Color(0xFFD97706),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(m.targetCompletion, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                          const SizedBox(height: 6),
                          LinearProgressIndicator(
                            value: m.progressPercent,
                            backgroundColor: const Color(0xFFF1F5F9),
                            valueColor: AlwaysStoppedAnimation<Color>(
                              m.isCompleted ? CustomerTheme.successGreen : const Color(0xFFD97706),
                            ),
                            minHeight: 4,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Monthly High-Resolution Photo Gallery
            const Text(
              'MONTHLY SITE PHOTO GALLERY',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 10),

            ..._photos.map((p) => _buildPhotoCard(p)),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildPhotoCard(SitePhoto photo) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 140,
            width: double.infinity,
            color: const Color(0xFF1E293B),
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Icon(Icons.photo_size_select_actual_outlined, size: 54, color: Colors.white24),
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      photo.date,
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(photo.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 3),
                Text(photo.description, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
