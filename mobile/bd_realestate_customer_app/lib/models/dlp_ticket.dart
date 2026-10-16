class DlpTicket {
  final String id;
  final String category; // 'Plumbing', 'Electrical', 'Waterproofing', 'Doors'
  final String issueDescription;
  final DateTime reportedDate;
  final DateTime rectificationDeadline;
  final String status;
  final String? siteEngineerAssigned;

  const DlpTicket({
    required this.id,
    required this.category,
    required this.issueDescription,
    required this.reportedDate,
    required this.rectificationDeadline,
    required this.status,
    this.siteEngineerAssigned,
  });
}

class AssociationNotice {
  final String title;
  final String date;
  final String content;
  final String category;

  const AssociationNotice({
    required this.title,
    required this.date,
    required this.content,
    required this.category,
  });
}
