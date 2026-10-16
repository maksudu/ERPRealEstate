import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/unit_entity.dart';
import '../bloc/unit_matrix/unit_matrix_bloc.dart';
import '../bloc/unit_matrix/unit_matrix_event.dart';
import '../bloc/unit_matrix/unit_matrix_state.dart';
import '../widgets/unit_detail_bottom_sheet.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/theme/app_theme.dart';
import 'emi_calculator_screen.dart';
import 'booking_form_screen.dart';

class UnitMatrixScreen extends StatelessWidget {
  const UnitMatrixScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<UnitMatrixBloc, UnitMatrixState>(
      listener: (context, state) {
        if (state.errorMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage!),
              backgroundColor: AppTheme.dangerRed,
              behavior: SnackBarBehavior.floating,
            ),
          );
        } else if (state.bannerNotification != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.bannerNotification!),
              backgroundColor: AppTheme.accentAmber,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Interactive Flat Availability Matrix'),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh),
                tooltip: 'Refresh Matrix',
                onPressed: () => context.read<UnitMatrixBloc>().add(
                      LoadUnitsEvent(towerName: state.selectedTower),
                    ),
              ),
            ],
          ),
          body: Column(
            children: [
              // Tower Selector Tabs
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: state.availableTowers.map((tower) {
                    final isSelected = tower == state.selectedTower;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(tower),
                        selected: isSelected,
                        selectedColor: AppTheme.primaryTeal,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : Colors.black87,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                        onSelected: (selected) {
                          if (selected) {
                            context.read<UnitMatrixBloc>().add(ChangeTowerEvent(tower));
                          }
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),

              // Color-coded Status Legend
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(
                    bottom: BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildLegendItem('Available', AppTheme.successGreen, state.availableCount),
                    _buildLegendItem('On Hold (15m)', AppTheme.accentAmber, state.onHoldCount),
                    _buildLegendItem('Sold', AppTheme.dangerRed, state.soldCount),
                    _buildLegendItem('Landowner', AppTheme.landownerPurple, state.landownerCount),
                  ],
                ),
              ),

              // Mutex Live Status Bar
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                color: const Color(0xFF0F172A),
                child: Row(
                  children: [
                    const Icon(Icons.shield_outlined, color: AppTheme.accentAmber, size: 14),
                    const SizedBox(width: 6),
                    const Text(
                      'Distributed Mutex Locking (Redis nx=True, ex=900) Active',
                      style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.accentAmber.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${state.activeLockedCount} Locked',
                        style: const TextStyle(color: AppTheme.accentAmber, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),

              // Matrix Grid
              Expanded(
                child: state.status == UnitMatrixStatus.loading
                    ? const Center(child: CircularProgressIndicator())
                    : _buildUnitMatrixGrid(context, state.units),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLegendItem(String label, Color color, int count) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(
          '$label ($count)',
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildUnitMatrixGrid(BuildContext context, List<UnitEntity> units) {
    final Map<int, List<UnitEntity>> floors = {};
    for (var u in units) {
      floors.putIfAbsent(u.floorNumber, () => []).add(u);
    }

    final floorKeys = floors.keys.toList()..sort((a, b) => b.compareTo(a));

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: floorKeys.length,
      itemBuilder: (context, index) {
        final floorNum = floorKeys[index];
        final floorUnits = floors[floorNum]!;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 8,
                offset: const Offset(0, 2),
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
                    'Floor $floorNum',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primaryDark),
                  ),
                  Text(
                    '+৳${floorNum * 50}/sqft escalation',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: floorUnits.map((unit) {
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: _buildUnitCard(context, unit),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildUnitCard(BuildContext context, UnitEntity unit) {
    Color cardColor;
    Color borderColor;
    IconData statusIcon;

    switch (unit.status) {
      case UnitGridStatus.available:
        cardColor = AppTheme.successGreen.withOpacity(0.08);
        borderColor = AppTheme.successGreen;
        statusIcon = Icons.check_circle_outline;
        break;
      case UnitGridStatus.onHold:
        cardColor = AppTheme.accentAmber.withOpacity(0.12);
        borderColor = AppTheme.accentAmber;
        statusIcon = Icons.timer;
        break;
      case UnitGridStatus.sold:
        cardColor = AppTheme.dangerRed.withOpacity(0.06);
        borderColor = AppTheme.dangerRed.withOpacity(0.4);
        statusIcon = Icons.cancel_outlined;
        break;
      case UnitGridStatus.landownerShare:
        cardColor = AppTheme.landownerPurple.withOpacity(0.08);
        borderColor = AppTheme.landownerPurple;
        statusIcon = Icons.lock_outline;
        break;
    }

    String countdown = '';
    if (unit.status == UnitGridStatus.onHold) {
      final s = unit.remainingLockSeconds;
      final m = s ~/ 60;
      final remSec = s % 60;
      countdown = '${m.toString().padLeft(2, '0')}:${remSec.toString().padLeft(2, '0')}';
    }

    return InkWell(
      onTap: () => _showUnitDetailsSheet(context, unit),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor, width: 1.5),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  unit.unitNumber,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                Icon(statusIcon, size: 14, color: borderColor),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${unit.carpetAreaSqft.toInt()} sft',
              style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
            ),
            const SizedBox(height: 2),
            Text(
              BdtCurrencyFormatter.format(unit.grossPriceBdt),
              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            if (unit.status == UnitGridStatus.onHold) ...[
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                decoration: BoxDecoration(
                  color: AppTheme.accentAmber,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  countdown,
                  style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF78350F),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showUnitDetailsSheet(BuildContext context, UnitEntity unit) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (bottomSheetContext) {
        return UnitDetailBottomSheet(
          unit: unit,
          onLockPressed: () {
            Navigator.pop(bottomSheetContext);
            context.read<UnitMatrixBloc>().add(LockUnitEvent(unit: unit));
          },
          onCalculateEmi: () {
            Navigator.pop(bottomSheetContext);
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => EmiCalculatorScreen(
                  flatPrice: unit.grossPriceBdt,
                  unitNumber: unit.unitNumber,
                ),
              ),
            );
          },
          onProceedBooking: () {
            Navigator.pop(bottomSheetContext);
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => BookingFormScreen(unit: unit),
              ),
            );
          },
        );
      },
    );
  }
}
