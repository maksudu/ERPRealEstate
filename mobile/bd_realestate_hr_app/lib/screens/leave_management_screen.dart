import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme/hr_theme.dart';
import '../models/leave_application.dart';

class LeaveManagementScreen extends StatefulWidget {
  const LeaveManagementScreen({super.key});

  @override
  State<LeaveManagementScreen> createState() => _LeaveManagementScreenState();
}

class _LeaveManagementScreenState extends State<LeaveManagementScreen> {
  final _formKey = GlobalKey<FormState>();
  final LeaveBalance _balance = const LeaveBalance();

  LeaveType _selectedType = LeaveType.casual;
  DateTime _startDate = DateTime.now().add(const Duration(days: 2));
  DateTime _endDate = DateTime.now().add(const Duration(days: 3));
  final _reasonCtrl = TextEditingController(text: 'Attending family program in Mymensingh.');
  bool _medicalDocAttached = false;

  final List<LeaveApplication> _history = [
    LeaveApplication(
      id: 'LV-2026-081',
      leaveType: LeaveType.casual,
      startDate: DateTime(2026, 9, 10),
      endDate: DateTime(2026, 9, 11),
      daysCount: 2,
      reason: 'Urgent personal work at bank',
      status: 'APPROVED',
    ),
    LeaveApplication(
      id: 'LV-2026-064',
      leaveType: LeaveType.sick,
      startDate: DateTime(2026, 8, 4),
      endDate: DateTime(2026, 8, 5),
      daysCount: 2,
      reason: 'Viral fever and doctor consultation',
      hasMedicalCertificate: true,
      status: 'APPROVED',
    ),
  ];

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  void _applyLeave() {
    if (!_formKey.currentState!.validate()) return;

    final days = _endDate.difference(_startDate).inDays + 1;
    final newApp = LeaveApplication(
      id: 'LV-2026-${DateTime.now().millisecondsSinceEpoch % 1000}',
      leaveType: _selectedType,
      startDate: _startDate,
      endDate: _endDate,
      daysCount: days > 0 ? days : 1,
      reason: _reasonCtrl.text,
      hasMedicalCertificate: _medicalDocAttached,
      status: 'PENDING_HOD',
    );

    setState(() {
      _history.insert(0, newApp);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Leave application submitted for $days day(s). Forwarded to HOD for approval.'),
        backgroundColor: HrTheme.successTeal,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave Management'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Balances Summary Grid
            Row(
              children: [
                Expanded(
                  child: _buildBalanceTile('Casual (CL)', '${_balance.casualRemaining}', '${_balance.casualTotal} Total', const Color(0xFF4F46E5)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildBalanceTile('Sick (SL)', '${_balance.sickRemaining}', '${_balance.sickTotal} Total', const Color(0xFF0D9488)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildBalanceTile('Earned (EL)', '${_balance.earnedRemaining}', '${_balance.earnedTotal} Total', const Color(0xFFD97706)),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Leave Application Form Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.edit_calendar, color: HrTheme.primaryIndigo),
                          SizedBox(width: 8),
                          Text('Apply for Leave', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 14),

                      DropdownButtonFormField<LeaveType>(
                        value: _selectedType,
                        decoration: const InputDecoration(labelText: 'Leave Category', border: OutlineInputBorder()),
                        items: const [
                          DropdownMenuItem(value: LeaveType.casual, child: Text('Casual Leave (CL)')),
                          DropdownMenuItem(value: LeaveType.sick, child: Text('Sick Leave (SL) - Medical Proof')),
                          DropdownMenuItem(value: LeaveType.earned, child: Text('Earned Leave (EL)')),
                        ],
                        onChanged: (val) => setState(() => _selectedType = val!),
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () async {
                                final d = await showDatePicker(
                                  context: context,
                                  initialDate: _startDate,
                                  firstDate: DateTime.now(),
                                  lastDate: DateTime.now().add(const Duration(days: 180)),
                                );
                                if (d != null) setState(() => _startDate = d);
                              },
                              child: InputDecorator(
                                decoration: const InputDecoration(labelText: 'From Date', border: OutlineInputBorder()),
                                child: Text(DateFormat('dd MMM yyyy').format(_startDate), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: InkWell(
                              onTap: () async {
                                final d = await showDatePicker(
                                  context: context,
                                  initialDate: _endDate,
                                  firstDate: _startDate,
                                  lastDate: DateTime.now().add(const Duration(days: 180)),
                                );
                                if (d != null) setState(() => _endDate = d);
                              },
                              child: InputDecorator(
                                decoration: const InputDecoration(labelText: 'To Date', border: OutlineInputBorder()),
                                child: Text(DateFormat('dd MMM yyyy').format(_endDate), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      TextFormField(
                        controller: _reasonCtrl,
                        maxLines: 2,
                        decoration: const InputDecoration(labelText: 'Reason for Leave', border: OutlineInputBorder()),
                        validator: (v) => v!.isEmpty ? 'Reason is required' : null,
                      ),
                      const SizedBox(height: 12),

                      // Medical Certificate Upload if Sick Leave
                      if (_selectedType == LeaveType.sick) ...[
                        InkWell(
                          onTap: () {
                            setState(() => _medicalDocAttached = true);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Doctor prescription/medical certificate attached!')),
                            );
                          },
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFCBD5E1)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.attach_file, color: HrTheme.deepNavy),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    _medicalDocAttached ? 'Medical_Prescription.pdf Attached' : 'Attach Medical Certificate / Prescription',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: _medicalDocAttached ? FontWeight.bold : FontWeight.normal,
                                      color: _medicalDocAttached ? HrTheme.successTeal : const Color(0xFF64748B),
                                    ),
                                  ),
                                ),
                                Icon(
                                  _medicalDocAttached ? Icons.check_circle : Icons.upload_file,
                                  color: _medicalDocAttached ? HrTheme.successTeal : Colors.grey,
                                  size: 20,
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _applyLeave,
                          child: const Text('Submit Leave Application'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // History
            const Text(
              'LEAVE APPLICATION HISTORY',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.1,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 10),

            ..._history.map((app) {
              final isApproved = app.status == 'APPROVED';
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: (isApproved ? HrTheme.successTeal : HrTheme.amberWarning).withOpacity(0.12),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          isApproved ? Icons.check_circle : Icons.hourglass_top,
                          color: isApproved ? HrTheme.successTeal : HrTheme.amberWarning,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(app.typeTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text(
                              '${DateFormat('dd MMM').format(app.startDate)} - ${DateFormat('dd MMM yyyy').format(app.endDate)} (${app.daysCount} days)',
                              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                            Text(app.reason, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: (isApproved ? HrTheme.successTeal : HrTheme.amberWarning).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          app.status,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isApproved ? HrTheme.successTeal : HrTheme.amberWarning,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildBalanceTile(String title, String rem, String total, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: HrTheme.slateBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
          const SizedBox(height: 4),
          Text(rem, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(total, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
        ],
      ),
    );
  }
}
