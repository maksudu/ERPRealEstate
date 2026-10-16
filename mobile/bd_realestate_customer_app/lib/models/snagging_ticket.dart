enum SnagStatus {
  reported,
  underRectification,
  rectifiedVerified,
}

class SnaggingTicket {
  final String id;
  final String room; // 'Master Bedroom', 'Balcony', 'Guest Toilet', 'Kitchen'
  final String category; // 'Paint & Finish', 'Tiles & Marble', 'Plumbing', 'Electrical'
  final String description;
  final DateTime reportedDate;
  final SnagStatus status;
  final String? engineerNotes;
  final String? photoUrl;

  const SnaggingTicket({
    required this.id,
    required this.room,
    required this.category,
    required this.description,
    required this.reportedDate,
    required this.status,
    this.engineerNotes,
    this.photoUrl,
  });

  String get statusLabel {
    switch (status) {
      case SnagStatus.reported:
        return 'REPORTED';
      case SnagStatus.underRectification:
        return 'IN RECTIFICATION';
      case SnagStatus.rectifiedVerified:
        return 'RESOLVED & VERIFIED';
    }
  }
}
