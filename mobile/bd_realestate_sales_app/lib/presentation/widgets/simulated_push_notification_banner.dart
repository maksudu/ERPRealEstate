import 'package:flutter/material.dart';
import '../bloc/lead/lead_state.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/currency_formatter.dart';

class SimulatedPushNotificationBanner extends StatelessWidget {
  final IncomingLeadNotification notification;
  final VoidCallback onCallNow;
  final VoidCallback onDismiss;

  const SimulatedPushNotificationBanner({
    super.key,
    required this.notification,
    required this.onCallNow,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.25),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
        border: Border.all(color: AppTheme.accentAmber.withOpacity(0.5), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: const Color(0xFF1877F2).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.notifications_active, color: AppTheme.accentAmber, size: 18),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text(
                          'HOT INBOUND LEAD',
                          style: TextStyle(
                            color: AppTheme.accentAmber,
                            fontWeight: FontWeight.bold,
                            fontSize: 10,
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                          decoration: BoxDecoration(
                            color: Colors.white12,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            notification.source,
                            style: const TextStyle(color: Colors.white70, fontSize: 9),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      notification.fullName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white54, size: 18),
                onPressed: onDismiss,
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Requires: ${notification.bedroomRequirement} · Budget: ${BdtCurrencyFormatter.format(notification.budgetBdt)}',
            style: const TextStyle(color: Colors.white70, fontSize: 11),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: onCallNow,
                  icon: const Icon(Icons.phone_forwarded, size: 16),
                  label: const Text('Call Lead Now (Auto-Logger)', style: TextStyle(fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.successGreen,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: onDismiss,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white70,
                  side: const BorderSide(color: Colors.white24),
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                ),
                child: const Text('Later', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
