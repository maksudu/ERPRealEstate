import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/lead_entity.dart';
import '../bloc/lead/lead_bloc.dart';
import '../bloc/lead/lead_event.dart';
import '../bloc/lead/lead_state.dart';
import '../widgets/simulated_push_notification_banner.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/theme/app_theme.dart';

class LeadManagerScreen extends StatelessWidget {
  const LeadManagerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<LeadBloc, LeadState>(
      listener: (context, state) {
        if (state.bannerMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.bannerMessage!),
              backgroundColor: AppTheme.primaryTeal,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Omnichannel CRM & Leads'),
            actions: [
              IconButton(
                icon: const Icon(Icons.flash_on, color: AppTheme.accentAmber),
                tooltip: 'Simulate Facebook Lead Alert',
                onPressed: () {
                  context.read<LeadBloc>().add(
                        SimulateIncomingPushLeadEvent(
                          fullName: 'Engr. Shafiul Alam',
                          source: 'Facebook Ads',
                          phone: '+8801755667788',
                          bedroomRequirement: '3 Bed South-East Corner (2050 sqft)',
                          budgetBdt: 27500000,
                        ),
                      );
                },
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                tooltip: 'Refresh Leads',
                onPressed: () => context.read<LeadBloc>().add(LoadLeadsEvent()),
              ),
            ],
          ),
          body: Column(
            children: [
              // Real-time Push Notification Banner (If received)
              if (state.activeNotification != null)
                SimulatedPushNotificationBanner(
                  notification: state.activeNotification!,
                  onCallNow: () {
                    final lead = state.allLeads.firstWhere(
                      (l) => l.fullName == state.activeNotification!.fullName,
                      orElse: () => state.allLeads.first,
                    );
                    context.read<LeadBloc>().add(DismissIncomingLeadNotificationEvent());
                    _triggerAutoCallLogger(context, lead);
                  },
                  onDismiss: () {
                    context.read<LeadBloc>().add(DismissIncomingLeadNotificationEvent());
                  },
                ),

              // Search Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search leads by name, phone, or location...',
                    hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                    prefixIcon: const Icon(Icons.search, size: 20),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                  ),
                  onChanged: (q) => context.read<LeadBloc>().add(SearchLeadsEvent(q)),
                ),
              ),

              // Stage Filter Horizontal Chips
              Container(
                height: 46,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _buildStageChip(context, 'All Leads', null, state.selectedStage == null),
                    _buildStageChip(context, 'New', LeadStageEnum.newLead, state.selectedStage == LeadStageEnum.newLead),
                    _buildStageChip(context, 'Contacted', LeadStageEnum.contacted, state.selectedStage == LeadStageEnum.contacted),
                    _buildStageChip(context, 'Site Visit', LeadStageEnum.siteVisitScheduled, state.selectedStage == LeadStageEnum.siteVisitScheduled),
                    _buildStageChip(context, 'Negotiation', LeadStageEnum.negotiation, state.selectedStage == LeadStageEnum.negotiation),
                    _buildStageChip(context, 'Booked', LeadStageEnum.booked, state.selectedStage == LeadStageEnum.booked),
                  ],
                ),
              ),

              const SizedBox(height: 8),

              // Leads List
              Expanded(
                child: state.status == LeadStatus.loading
                    ? const Center(child: CircularProgressIndicator())
                    : state.filteredLeads.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.people_outline, size: 48, color: Colors.grey.shade400),
                                const SizedBox(height: 8),
                                Text(
                                  'No leads found matching current criteria.',
                                  style: TextStyle(color: Colors.grey.shade600),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            itemCount: state.filteredLeads.length,
                            itemBuilder: (context, index) {
                              final lead = state.filteredLeads[index];
                              return _buildLeadCard(context, lead);
                            },
                          ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStageChip(
    BuildContext context,
    String label,
    LeadStageEnum? stage,
    bool isSelected,
  ) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : Colors.black87)),
        selected: isSelected,
        selectedColor: AppTheme.primaryTeal,
        checkmarkColor: Colors.white,
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: isSelected ? AppTheme.primaryTeal : const Color(0xFFCBD5E1)),
        ),
        onSelected: (_) {
          context.read<LeadBloc>().add(FilterLeadsByStageEvent(stage));
        },
      ),
    );
  }

  Widget _buildLeadCard(BuildContext context, LeadEntity lead) {
    Color sourceColor;
    IconData sourceIcon;

    switch (lead.source) {
      case LeadSourceEnum.facebookAds:
        sourceColor = const Color(0xFF1877F2);
        sourceIcon = Icons.facebook;
        break;
      case LeadSourceEnum.websiteForm:
        sourceColor = AppTheme.primaryTeal;
        sourceIcon = Icons.language;
        break;
      case LeadSourceEnum.whatsApp:
        sourceColor = const Color(0xFF25D366);
        sourceIcon = Icons.chat;
        break;
      case LeadSourceEnum.walkIn:
        sourceColor = AppTheme.accentAmber;
        sourceIcon = Icons.directions_walk;
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: sourceColor.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(sourceIcon, color: sourceColor, size: 16),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          lead.fullName,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _getStageBadgeColor(lead.stage).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    lead.stageLabel,
                    style: TextStyle(
                      color: _getStageBadgeColor(lead.stage),
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            // Requirements & Budget
            Row(
              children: [
                Icon(Icons.apartment, size: 14, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Text(lead.bedroomRequirement, style: const TextStyle(fontSize: 12)),
                const SizedBox(width: 12),
                Icon(Icons.place, size: 14, color: Colors.grey.shade500),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    lead.preferredLocation,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 6),

            Row(
              children: [
                const Text('Budget: ', style: TextStyle(fontSize: 11, color: Colors.grey)),
                Text(
                  BdtCurrencyFormatter.format(lead.budgetBdt),
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primaryTeal),
                ),
              ],
            ),

            // Last call outcome
            if (lead.lastCallOutcome != null) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.history, size: 14, color: Colors.grey),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Last Call: ${lead.lastCallOutcome}',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade800),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 8),

            // Call Action Button
            Row(
              children: [
                Text(
                  lead.phone,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontFamily: 'monospace'),
                ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: () => _triggerAutoCallLogger(context, lead),
                  icon: const Icon(Icons.phone, size: 15),
                  label: const Text('Call Lead'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.successGreen,
                    foregroundColor: Colors.white,
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getStageBadgeColor(LeadStageEnum stage) {
    switch (stage) {
      case LeadStageEnum.newLead:
        return AppTheme.accentAmber;
      case LeadStageEnum.contacted:
        return AppTheme.primaryTeal;
      case LeadStageEnum.siteVisitScheduled:
        return Colors.indigo;
      case LeadStageEnum.negotiation:
        return AppTheme.warningOrange;
      case LeadStageEnum.booked:
        return AppTheme.successGreen;
      case LeadStageEnum.lost:
        return AppTheme.dangerRed;
    }
  }

  void _triggerAutoCallLogger(BuildContext context, LeadEntity lead) {
    // Simulates an outgoing call, then presents the auto-logger dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _AutoCallLoggerDialog(
        lead: lead,
        onSaveLog: (outcome, minutes, notes, followupDate) {
          context.read<LeadBloc>().add(
                LogCallActivityEvent(
                  leadId: lead.id,
                  outcome: outcome,
                  durationMinutes: minutes,
                  notes: notes,
                  nextFollowup: followupDate,
                ),
              );
        },
      ),
    );
  }
}

class _AutoCallLoggerDialog extends StatefulWidget {
  final LeadEntity lead;
  final Function(String outcome, int minutes, String notes, DateTime? followup) onSaveLog;

  const _AutoCallLoggerDialog({
    required this.lead,
    required this.onSaveLog,
  });

  @override
  State<_AutoCallLoggerDialog> createState() => _AutoCallLoggerDialogState();
}

class _AutoCallLoggerDialogState extends State<_AutoCallLoggerDialog> {
  String _selectedOutcome = 'Interested — Scheduled Site Visit';
  int _callMinutes = 4;
  final _notesCtrl = TextEditingController(text: 'Client requested floor plan for 4th floor and brochure on WhatsApp.');
  DateTime? _nextFollowup = DateTime.now().add(const Duration(days: 2));

  final List<String> _outcomes = [
    'Interested — Scheduled Site Visit',
    'Follow-up Needed (Negotiating Price)',
    'Callback Requested Later',
    'Call Disconnected / Busy',
    'Not Interested (Budget Mismatch)',
  ];

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: AppTheme.dangerRed.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.call_end, color: AppTheme.dangerRed, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Automatic Call Logger', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Text(
                  'Call with ${widget.lead.fullName}',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Call Duration Slider
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Call Duration:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text('$_callMinutes Minutes', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryTeal)),
              ],
            ),
            Slider(
              value: _callMinutes.toDouble(),
              min: 1,
              max: 30,
              divisions: 29,
              activeColor: AppTheme.primaryTeal,
              onChanged: (val) => setState(() => _callMinutes = val.toInt()),
            ),
            const SizedBox(height: 10),

            // Discussion Outcome Dropdown
            const Text('Discussion Outcome:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 6),
            DropdownButtonFormField<String>(
              value: _selectedOutcome,
              isExpanded: true,
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
              items: _outcomes
                  .map((o) => DropdownMenuItem(value: o, child: Text(o, style: const TextStyle(fontSize: 12))))
                  .toList(),
              onChanged: (val) => setState(() => _selectedOutcome = val!),
            ),
            const SizedBox(height: 12),

            // Follow-up Notes
            const Text('Call Notes & Client Preferences:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 6),
            TextField(
              controller: _notesCtrl,
              maxLines: 2,
              style: const TextStyle(fontSize: 12),
              decoration: InputDecoration(
                hintText: 'Enter specific requirements, concerns, next steps...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
            const SizedBox(height: 12),

            // Next Follow-up Date Chip
            Row(
              children: [
                const Icon(Icons.calendar_month, size: 16, color: AppTheme.primaryTeal),
                const SizedBox(width: 6),
                const Text('Next Follow-up:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                const Spacer(),
                TextButton(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: _nextFollowup ?? DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (picked != null) {
                      setState(() => _nextFollowup = picked);
                    }
                  },
                  child: Text(
                    _nextFollowup != null ? '${_nextFollowup!.day}/${_nextFollowup!.month}/${_nextFollowup!.year}' : 'Select Date',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Discard'),
        ),
        ElevatedButton.icon(
          icon: const Icon(Icons.check),
          label: const Text('Save to CRM Activity'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryTeal,
            foregroundColor: Colors.white,
          ),
          onPressed: () {
            widget.onSaveLog(
              _selectedOutcome,
              _callMinutes,
              _notesCtrl.text,
              _nextFollowup,
            );
            Navigator.pop(context);
          },
        ),
      ],
    );
  }
}
