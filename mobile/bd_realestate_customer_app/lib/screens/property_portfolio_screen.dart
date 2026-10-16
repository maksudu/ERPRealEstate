import 'package:flutter/material.dart';
import '../core/theme/customer_theme.dart';
import '../models/property_portfolio.dart';

class PropertyPortfolioScreen extends StatelessWidget {
  const PropertyPortfolioScreen({super.key});

  final CustomerProperty _property = const CustomerProperty(
    projectName: 'Green Horizon Tower',
    projectAddress: 'Plot 41, Road 103, Gulshan-2, Dhaka',
    unitNumber: 'A-7',
    tower: 'Tower North',
    floor: '7th Floor',
    carpetAreaSqft: 1850.0,
    facing: 'North-East Facing (Open Lake View)',
    allottedParkingBay: 'Bay P-14 (Basement 1, Dedicated RFID)',
    deedNumber: 'DEED-GHT-2026-089',
    allotmentDate: '10 Jan 2026',
    handoverTargetDate: '31 Dec 2026',
    documents: [
      PropertyDoc(
        title: 'Official Allotment Letter',
        fileName: 'Allotment_Letter_A7_Signed.pdf',
        fileSize: '2.4 MB',
        date: '10 Jan 2026',
      ),
      PropertyDoc(
        title: 'Bilingual Deed of Agreement',
        fileName: 'Bilingual_Deed_Agreement_Registered.pdf',
        fileSize: '5.8 MB',
        date: '01 Feb 2026',
      ),
      PropertyDoc(
        title: 'Architectural Blueprint & Floor Plan',
        fileName: 'Unit_A7_Architectural_Layout.pdf',
        fileSize: '8.1 MB',
        date: '15 Mar 2026',
      ),
      PropertyDoc(
        title: 'Electrical & Sanitary Schematics',
        fileName: 'MEP_Sanitary_Conduit_Schematics.pdf',
        fileSize: '3.6 MB',
        date: '20 Apr 2026',
      ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Property Portfolio'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Property Showcase Banner
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0A1128), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: CustomerTheme.luxuryGold.withOpacity(0.25),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: CustomerTheme.luxuryGold),
                        ),
                        child: const Text(
                          'PREMIUM RESIDENCE',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.1,
                            color: CustomerTheme.brightGold,
                          ),
                        ),
                      ),
                      const Text(
                        'Deed # DEED-089',
                        style: TextStyle(fontSize: 11, color: Colors.white60),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    _property.projectName,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _property.projectAddress,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _buildHeaderTag('Unit ${_property.unitNumber}'),
                      const SizedBox(width: 8),
                      _buildHeaderTag(_property.floor),
                      const SizedBox(width: 8),
                      _buildHeaderTag('${_property.carpetAreaSqft.toInt()} sft'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Flat Specs Details Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.apartment, color: CustomerTheme.midnightNavy),
                        SizedBox(width: 8),
                        Text('Unit Specifications', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      ],
                    ),
                    const SizedBox(height: 14),
                    _buildSpecRow('Tower', _property.tower),
                    _buildSpecRow('Floor Level', _property.floor),
                    _buildSpecRow('Gross Super Area', '${_property.carpetAreaSqft.toInt()} Sq. Ft.'),
                    _buildSpecRow('Unit Orientation', _property.facing),
                    _buildSpecRow('Handover Target', 'December 2026'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Allotted Parking Bay
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: CustomerTheme.luxuryGold.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.directions_car, color: Color(0xFF854D0E), size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Allotted Parking Bay', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          const SizedBox(height: 2),
                          Text(_property.allottedParkingBay, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: CustomerTheme.successGreen.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text('RFID ACTIVE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: CustomerTheme.successGreen)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Digital Document Vault
            const Text(
              'SIGNED LEGAL DOCUMENTS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 10),

            ..._property.documents.map((doc) => _buildDocCard(context, doc)),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderTag(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white12,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }

  Widget _buildSpecRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: CustomerTheme.midnightNavy)),
        ],
      ),
    );
  }

  Widget _buildDocCard(BuildContext context, PropertyDoc doc) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: CustomerTheme.midnightNavy.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.picture_as_pdf, color: CustomerTheme.midnightNavy, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(doc.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  Text('${doc.fileName} (${doc.fileSize})', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.download_rounded, color: CustomerTheme.midnightNavy),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Downloading official signed document: ${doc.fileName}...'),
                    backgroundColor: CustomerTheme.successGreen,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
