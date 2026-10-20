import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/calculator/emi_calculator_bloc.dart';
import '../bloc/calculator/emi_calculator_event.dart';
import '../bloc/calculator/emi_calculator_state.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/theme/app_theme.dart';

class EmiCalculatorScreen extends StatelessWidget {
  final double flatPrice;
  final String unitNumber;

  const EmiCalculatorScreen({
    super.key,
    this.flatPrice = 12500000.0,
    this.unitNumber = '3B',
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => EmiCalculatorBloc()
        ..add(InitializeEmiCalculatorEvent(flatPrice: flatPrice, unitNumber: unitNumber)),
      child: const _EmiCalculatorView(),
    );
  }
}

class _EmiCalculatorView extends StatelessWidget {
  const _EmiCalculatorView();

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<EmiCalculatorBloc, EmiCalculatorState>(
      listener: (context, state) {
        if (state.exportPdfStatus != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.exportPdfStatus!),
              backgroundColor: AppTheme.successGreen,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            title: Text('BDT Payment Calculator · ${state.unitNumber}'),
            actions: [
              IconButton(
                icon: const Icon(Icons.picture_as_pdf_outlined),
                tooltip: 'Export PDF',
                onPressed: () => _showPdfScheduleModal(context, state),
              ),
              IconButton(
                icon: const Icon(Icons.share),
                tooltip: 'Share WhatsApp',
                onPressed: () => _shareViaWhatsApp(context, state),
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Price & Monthly EMI Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.primaryTeal, Color(0xFF0F766E)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.12),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Unit ${state.unitNumber} Total Consideration',
                            style: const TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryTeal.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${state.tenureMonths.toInt()} Months',
                              style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        BdtCurrencyFormatter.format(state.flatPrice),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Divider(color: Colors.white24, height: 1),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Down Payment', style: TextStyle(color: Colors.white70, fontSize: 11)),
                              const SizedBox(height: 2),
                              Text(
                                BdtCurrencyFormatter.format(state.downPaymentTotal),
                                style: const TextStyle(color: AppTheme.accentAmber, fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text('Monthly Installment', style: TextStyle(color: Colors.white70, fontSize: 11)),
                              const SizedBox(height: 2),
                              Text(
                                '${BdtCurrencyFormatter.format(state.monthlyInstallment)} / mo',
                                style: const TextStyle(color: AppTheme.successGreen, fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Slider 1: Down Payment (10% to 50%)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Down Payment Ratio',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryTeal.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${state.downPaymentPercent.toInt()}%',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryTeal),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Slider(
                        value: state.downPaymentPercent,
                        min: 10.0,
                        max: 50.0,
                        divisions: 8,
                        activeColor: AppTheme.primaryTeal,
                        inactiveColor: const Color(0xFFE2E8F0),
                        label: '${state.downPaymentPercent.toInt()}%',
                        onChanged: (val) {
                          context.read<EmiCalculatorBloc>().add(UpdateDownPaymentPercentEvent(val));
                        },
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('10% (Minimum)', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                          Text('50% (Standard)', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16),

                // Slider 2: Tenure Months (12 to 60 Months)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Installment Tenure',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.accentAmber.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${state.tenureMonths.toInt()} Months (${(state.tenureMonths / 12).toStringAsFixed(1)} Yrs)',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF78350F)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Slider(
                        value: state.tenureMonths,
                        min: 12.0,
                        max: 60.0,
                        divisions: 8,
                        activeColor: AppTheme.accentAmber,
                        inactiveColor: const Color(0xFFE2E8F0),
                        label: '${state.tenureMonths.toInt()} Months',
                        onChanged: (val) {
                          context.read<EmiCalculatorBloc>().add(UpdateTenureMonthsEvent(val));
                        },
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('12 Months', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                          Text('60 Months (5 Years)', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Milestone Schedule Breakdown Table
                const Text(
                  'Milestone-Linked Payment Schedule',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const SizedBox(height: 10),

                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: state.scheduleItems.length,
                    separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFE2E8F0)),
                    itemBuilder: (context, idx) {
                      final item = state.scheduleItems[idx];
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 12,
                              backgroundColor: AppTheme.primaryTeal.withOpacity(0.12),
                              child: Text(
                                '${item.installmentNo}',
                                style: const TextStyle(color: AppTheme.primaryTeal, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.milestoneName,
                                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                  ),
                                  Text(
                                    'Due by: ${item.dueDate}',
                                    style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              BdtCurrencyFormatter.format(item.amountBdt),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 24),

                // Action Buttons: Generate PDF & WhatsApp
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.picture_as_pdf),
                        label: const Text('Export PDF Schedule'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryTeal,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: () => _showPdfScheduleModal(context, state),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.send),
                        label: const Text('Share WhatsApp'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF25D366),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: () => _shareViaWhatsApp(context, state),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showPdfScheduleModal(BuildContext context, EmiCalculatorState state) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.picture_as_pdf, color: AppTheme.dangerRed),
            const SizedBox(width: 8),
            Text('PDF Schedule Generated · Unit ${state.unitNumber}'),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.primaryTeal.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('OFFICIAL PAYMENT SCHEDULE (BDT)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    const SizedBox(height: 4),
                    Text('Apartment Total: ${BdtCurrencyFormatter.format(state.flatPrice)}'),
                    Text('Down Payment (${state.downPaymentPercent.toInt()}%): ${BdtCurrencyFormatter.format(state.downPaymentTotal)}'),
                    Text('Monthly EMI (${state.tenureMonths.toInt()} Mo): ${BdtCurrencyFormatter.format(state.monthlyInstallment)}'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Text('Installment Milestones Preview:'),
              const SizedBox(height: 6),
              ...state.scheduleItems.take(4).map(
                    (it) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Text(
                        '• ${it.milestoneName} — ${BdtCurrencyFormatter.format(it.amountBdt)} (${it.dueDate})',
                        style: const TextStyle(fontSize: 11),
                      ),
                    ),
                  ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
          ElevatedButton.icon(
            icon: const Icon(Icons.download),
            label: const Text('Save PDF Document'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryTeal,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              context.read<EmiCalculatorBloc>().add(ExportPdfScheduleEvent());
            },
          ),
        ],
      ),
    );
  }

  void _shareViaWhatsApp(BuildContext context, EmiCalculatorState state) {
    final text = '''
*OFFICIAL INSTALLMENT SCHEDULE — PRIME RESIDENCY*
Apartment: Unit ${state.unitNumber}
Total Consideration: ${BdtCurrencyFormatter.format(state.flatPrice)}

*Payment Schedule Breakdown:*
1. Booking Money: ${BdtCurrencyFormatter.format(state.bookingMoney)}
2. Down Payment (${state.downPaymentPercent.toInt()}%): ${BdtCurrencyFormatter.format(state.downPaymentTotal)}
3. Net Down Payment Payable: ${BdtCurrencyFormatter.format(state.netDownPaymentPayable)}
4. Monthly EMI (${state.tenureMonths.toInt()} Months): ${BdtCurrencyFormatter.format(state.monthlyInstallment)} / month

Generated via ERP Real Estate Bangladesh Sales Mobile App.
''';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.send, color: Color(0xFF25D366)),
            SizedBox(width: 8),
            Text('Ready to Dispatch to WhatsApp'),
          ],
        ),
        content: SingleChildScrollView(
          child: Text(text, style: const TextStyle(fontSize: 11, fontFamily: 'monospace')),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton.icon(
            icon: const Icon(Icons.send),
            label: const Text('Send to Client on WhatsApp'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF25D366),
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              context.read<EmiCalculatorBloc>().add(ShareViaWhatsAppEvent());
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Dispatched PDF Payment Schedule directly to WhatsApp!'),
                  backgroundColor: Color(0xFF25D366),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
