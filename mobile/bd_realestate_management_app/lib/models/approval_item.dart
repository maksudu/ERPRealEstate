enum ApprovalCategory {
  discountException,
  purchaseOrderCs,
  contractorRaBill,
  bookingCancellation,
}

class ApprovalItem {
  final String id;
  final String title;
  final ApprovalCategory category;
  final String project;
  final String subject;
  final double amountBdt;
  final double? marginImpactBdt;
  final double? discountPercent;
  final String requestedBy;
  final DateTime submissionDate;
  final String details;
  bool isApproved;

  ApprovalItem({
    required this.id,
    required this.title,
    required this.category,
    required this.project,
    required this.subject,
    required this.amountBdt,
    this.marginImpactBdt,
    this.discountPercent,
    required this.requestedBy,
    required this.submissionDate,
    required this.details,
    this.isApproved = false,
  });

  String get categoryLabel {
    switch (category) {
      case ApprovalCategory.discountException:
        return 'DISCOUNT EXCEPTION';
      case ApprovalCategory.purchaseOrderCs:
        return 'PO & COMPARATIVE STATEMENT';
      case ApprovalCategory.contractorRaBill:
        return 'CONTRACTOR RA BILL';
      case ApprovalCategory.bookingCancellation:
        return 'BOOKING CANCELLATION & REFUND';
    }
  }
}
