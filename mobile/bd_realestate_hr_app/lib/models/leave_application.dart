enum LeaveType {
  casual,
  sick,
  earned,
}

class LeaveBalance {
  final int casualTotal;
  final int casualUsed;
  final int sickTotal;
  final int sickUsed;
  final int earnedTotal;
  final int earnedUsed;

  const LeaveBalance({
    this.casualTotal = 14,
    this.casualUsed = 4,
    this.sickTotal = 14,
    this.sickUsed = 2,
    this.earnedTotal = 18,
    this.earnedUsed = 3,
  });

  int get casualRemaining => casualTotal - casualUsed;
  int get sickRemaining => sickTotal - sickUsed;
  int get earnedRemaining => earnedTotal - earnedUsed;
}

class LeaveApplication {
  final String id;
  final LeaveType leaveType;
  final DateTime startDate;
  final DateTime endDate;
  final int daysCount;
  final String reason;
  final bool hasMedicalCertificate;
  final String status; // 'PENDING_HOD', 'APPROVED', 'REJECTED'

  const LeaveApplication({
    required this.id,
    required this.leaveType,
    required this.startDate,
    required this.endDate,
    required this.daysCount,
    required this.reason,
    this.hasMedicalCertificate = false,
    this.status = 'PENDING_HOD',
  });

  String get typeTitle {
    switch (leaveType) {
      case LeaveType.casual:
        return 'Casual Leave (CL)';
      case LeaveType.sick:
        return 'Sick Leave (SL)';
      case LeaveType.earned:
        return 'Earned Leave (EL)';
    }
  }
}
