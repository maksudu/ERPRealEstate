import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../models/cash_flow_forecast.dart';

class CashFlowForecastScreen extends StatelessWidget {
  const CashFlowForecastScreen({super.key});

  final NinetyDayForecast _forecast = const NinetyDayForecast(
    liquidCashBalanceBdt: 382000000.0, // 38.20 Cr
    buckets: [
      CashFlowBucket(
        periodName: 'Next 30 Days (M1)',
        projectedInflowsBdt: 84000000.0, // 8.40 Cr
        contractorLiabilitiesBdt: 32000000.0, // 3.20 Cr
        materialProcurementBdt: 18000000.0, // 1.80 Cr
        debtRepaymentsBdt: 12000000.0, // 1.20 Cr
      ),
      CashFlowBucket(
        periodName: 'Day 31 - 60 (M2)',
        projectedInflowsBdt: 91000000.0, // 9.10 Cr
        contractorLiabilitiesBdt: 38000000.0, // 3.80 Cr
        materialProcurementBdt: 22000000.0, // 2.20 Cr
        debtRepaymentsBdt: 18000000.0, // 1.80 Cr
      ),
      CashFlowBucket(
        periodName: 'Day 61 - 90 (M3)',
        projectedInflowsBdt: 115000000.0, // 11.50 Cr
        contractorLiabilitiesBdt: 42000000.0, // 4.20 Cr
        materialProcurementBdt: 29000000.0, // 2.90 Cr
        debtRepaymentsBdt: 18000000.0, // 1.80 Cr
      ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('90-Day Cash Flow Forecast'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ending Liquidity Projection Header
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: ManagementTheme.luxuryGold.withOpacity(0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'PROJECTED DAY-90 LIQUIDITY',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: ManagementTheme.luxuryGold,
                        ),
                      ),
                      Icon(Icons.auto_graph_rounded, color: ManagementTheme.luxuryGold, size: 20),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '৳ ${(_forecast.projectedEndingLiquidity / 10000000).toStringAsFixed(2)} Crore',
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: ManagementTheme.brightGold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Opening Cash: ৳ ${(_forecast.liquidCashBalanceBdt / 10000000).toStringAsFixed(2)} Cr • Total Net Surplus: +৳ ${((_forecast.total90DayInflow - _forecast.total90DayOutflow) / 10000000).toStringAsFixed(2)} Cr',
                    style: const TextStyle(fontSize: 11, color: ManagementTheme.textMuted),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Inflow vs Outflow Summary Grid
            Row(
              children: [
                Expanded(
                  child: _buildSummaryBox(
                    '90-Day Collections',
                    '৳ ${(_forecast.total90DayInflow / 10000000).toStringAsFixed(2)} Cr',
                    'Installments & Bookings',
                    ManagementTheme.successEmerald,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildSummaryBox(
                    '90-Day Liabilities',
                    '৳ ${(_forecast.total90DayOutflow / 10000000).toStringAsFixed(2)} Cr',
                    'RA Bills, Steel & Loans',
                    ManagementTheme.alertCrimson,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Monthly Period Breakdown Cards
            const Text(
              '3-MONTH ROLLING LIQUIDITY BREAKDOWN',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
                color: ManagementTheme.textMuted,
              ),
            ),
            const SizedBox(height: 12),

            ..._forecast.buckets.map((b) => _buildBucketCard(b)),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryBox(String title, String val, String subtitle, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ManagementTheme.cardDark,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 11, color: ManagementTheme.textMuted)),
          const SizedBox(height: 6),
          Text(val, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(fontSize: 10, color: ManagementTheme.textMuted)),
        ],
      ),
    );
  }

  Widget _buildBucketCard(CashFlowBucket bucket) {
    final netSurplus = bucket.netSurplusBdt;
    final isPositive = netSurplus >= 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  bucket.periodName,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: (isPositive ? ManagementTheme.successEmerald : ManagementTheme.alertCrimson).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isPositive
                        ? '+৳ ${(netSurplus / 10000000).toStringAsFixed(2)} Cr'
                        : '-৳ ${(-netSurplus / 10000000).toStringAsFixed(2)} Cr',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isPositive ? ManagementTheme.successEmerald : ManagementTheme.alertCrimson,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildFlowLine(
              'Customer Installments & Down Payments',
              '৳ ${(bucket.projectedInflowsBdt / 10000000).toStringAsFixed(2)} Cr',
              ManagementTheme.successEmerald,
            ),
            const Divider(color: Color(0xFF334155), height: 16),
            _buildFlowLine(
              'Subcontractor RA Bills & Advance',
              '৳ ${(bucket.contractorLiabilitiesBdt / 10000000).toStringAsFixed(2)} Cr',
              ManagementTheme.textMuted,
            ),
            const SizedBox(height: 6),
            _buildFlowLine(
              'Material Procurement (Steel/Cement)',
              '৳ ${(bucket.materialProcurementBdt / 10000000).toStringAsFixed(2)} Cr',
              ManagementTheme.textMuted,
            ),
            const SizedBox(height: 6),
            _buildFlowLine(
              'Bank Debt & Project Finance Servicing',
              '৳ ${(bucket.debtRepaymentsBdt / 10000000).toStringAsFixed(2)} Cr',
              ManagementTheme.textMuted,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFlowLine(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFFCBD5E1))),
        ),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }
}
