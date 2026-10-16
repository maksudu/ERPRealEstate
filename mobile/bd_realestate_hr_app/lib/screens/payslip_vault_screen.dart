import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../models/payslip.dart';

class PayslipVaultScreen extends StatefulWidget {
  const PayslipVaultScreen({super.key});

  @override
  State<PayslipVaultScreen> createState() => _PayslipVaultScreenState();
}

class _PayslipVaultScreenState extends State<PayslipVaultScreen> {
  bool _isUnlocked = false;
  final _pinCtrl = TextEditingController(text: '1234');

  final Payslip _payslip = const Payslip(
    id: 'PAY-2026-09',
    monthYear: 'September 2026',
    designation: 'Senior Project Engineer (Civil)',
    department: 'Engineering & Construction Operations',
    tinNumber: 'TIN: 8819-2049-1120',
    bankAccount: 'Prime Bank A/C: 1102948-0019',
    basicSalary: 70000.0,
    houseRent: 35000.0,
    medicalAllowance: 5000.0,
    conveyance: 5000.0,
    providentFund: 7000.0,
    tdsTax: 4500.0,
    advanceDeduction: 3000.0,
  );

  @override
  void dispose() {
    _pinCtrl.dispose();
    super.dispose();
  }

  void _unlockVault() {
    if (_pinCtrl.text == '1234') {
      setState(() => _isUnlocked = true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invalid Vault PIN! Use 1234.'),
          backgroundColor: HrTheme.alertCrimson,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Encrypted Payslip Vault'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: _isUnlocked ? _buildUnlockedPayslip() : _buildLockedVaultGate(),
      ),
    );
  }

  Widget _buildLockedVaultGate() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: HrTheme.primaryIndigo.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.lock_person_rounded, size: 48, color: HrTheme.primaryIndigo),
            ),
            const SizedBox(height: 16),
            const Text(
              'Encrypted Salary Vault',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: HrTheme.deepNavy),
            ),
            const SizedBox(height: 6),
            const Text(
              'Salary data is 256-bit AES encrypted. Enter your employee security PIN to view payslip breakdown and tax deductions.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _pinCtrl,
              keyboardType: TextInputType.number,
              obscureText: true,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 22, letterSpacing: 8, fontWeight: FontWeight.bold),
              decoration: const InputDecoration(
                labelText: 'Enter 4-Digit Vault PIN (Default: 1234)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _unlockVault,
                icon: const Icon(Icons.lock_open, size: 18),
                label: const Text('Decrypt & View Payslip'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUnlockedPayslip() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Salary Slip Header
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _payslip.monthYear,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: HrTheme.deepNavy),
                        ),
                        Text(_payslip.designation, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      ],
                    ),
                    TextButton.icon(
                      onPressed: () => setState(() => _isUnlocked = false),
                      icon: const Icon(Icons.lock, size: 16),
                      label: const Text('Lock', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
                const Divider(height: 20),
                Text('${_payslip.department} • ${_payslip.bankAccount}', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                Text(_payslip.tinNumber, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Net Payable Highlight
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('NET DISBURSED SALARY', style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8), letterSpacing: 1.1)),
                  SizedBox(height: 4),
                  Text('BDT One Lac Five Hundred Only', style: TextStyle(fontSize: 11, color: Color(0xFFCBD5E1))),
                ],
              ),
              Text(
                '৳ ${(_payslip.netPayable).toStringAsFixed(0)}',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF34D399)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Earnings Breakdown
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('EARNINGS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.primaryIndigo)),
                    Text('AMOUNT (BDT)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF64748B))),
                  ],
                ),
                const SizedBox(height: 12),
                _buildSlipRow('Basic Salary', _payslip.basicSalary),
                _buildSlipRow('House Rent Allowance (50%)', _payslip.houseRent),
                _buildSlipRow('Medical Allowance', _payslip.medicalAllowance),
                _buildSlipRow('Conveyance Allowance', _payslip.conveyance),
                const Divider(height: 20),
                _buildSlipRow('Total Gross Earnings', _payslip.grossEarnings, isBold: true),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Deductions Breakdown
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('DEDUCTIONS & WITHHOLDINGS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: HrTheme.alertCrimson)),
                    Text('AMOUNT (BDT)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF64748B))),
                  ],
                ),
                const SizedBox(height: 12),
                _buildSlipRow('Provident Fund (PF 10%)', _payslip.providentFund),
                _buildSlipRow('Tax Withheld at Source (TDS Sec 50)', _payslip.tdsTax),
                _buildSlipRow('Festival Advance Recovery', _payslip.advanceDeduction),
                const Divider(height: 20),
                _buildSlipRow('Total Deductions', _payslip.totalDeductions, isBold: true, color: HrTheme.alertCrimson),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Download Action
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(backgroundColor: HrTheme.deepNavy),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Downloading encrypted PDF: Payslip_Sep_2026.pdf (Password is your Employee ID)'),
                  backgroundColor: HrTheme.successTeal,
                ),
              );
            },
            icon: const Icon(Icons.picture_as_pdf, size: 18),
            label: const Text('Download Password-Protected PDF Slip'),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildSlipRow(String label, double val, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 12, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
          Text(
            '৳ ${val.toStringAsFixed(0)}',
            style: TextStyle(
              fontSize: 13,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
              color: color ?? HrTheme.deepNavy,
            ),
          ),
        ],
      ),
    );
  }
}
