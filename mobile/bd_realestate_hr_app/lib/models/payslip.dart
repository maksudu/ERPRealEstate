class Payslip {
  final String id;
  final String monthYear;
  final String designation;
  final String department;
  final String tinNumber;
  final String bankAccount;
  final double basicSalary;
  final double houseRent;
  final double medicalAllowance;
  final double conveyance;
  final double providentFund;
  final double tdsTax;
  final double advanceDeduction;

  const Payslip({
    required this.id,
    required this.monthYear,
    required this.designation,
    required this.department,
    required this.tinNumber,
    required this.bankAccount,
    required this.basicSalary,
    required this.houseRent,
    required this.medicalAllowance,
    required this.conveyance,
    required this.providentFund,
    required this.tdsTax,
    required this.advanceDeduction,
  });

  double get grossEarnings => basicSalary + houseRent + medicalAllowance + conveyance;
  double get totalDeductions => providentFund + tdsTax + advanceDeduction;
  double get netPayable => grossEarnings - totalDeductions;
}
