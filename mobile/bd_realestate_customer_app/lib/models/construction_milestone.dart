class SitePhoto {
  final String title;
  final String monthYear;
  final String date;
  final String description;

  const SitePhoto({
    required this.title,
    required this.monthYear,
    required this.date,
    required this.description,
  });
}

class ConstructionMilestone {
  final String milestoneName;
  final double progressPercent;
  final bool isCompleted;
  final String targetCompletion;

  const ConstructionMilestone({
    required this.milestoneName,
    required this.progressPercent,
    required this.isCompleted,
    required this.targetCompletion,
  });
}
