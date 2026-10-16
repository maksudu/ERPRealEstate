class TimesheetEntry {
  final String id;
  final DateTime date;
  final String projectName;
  final String taskCategory;
  final double hoursWorked;
  final String remarks;

  const TimesheetEntry({
    required this.id,
    required this.date,
    required this.projectName,
    required this.taskCategory,
    required this.hoursWorked,
    required this.remarks,
  });
}
