import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/lead_entity.dart';
import '../../../domain/usecases/crm_usecases.dart';
import '../../../domain/repositories/crm_repository.dart';
import 'lead_event.dart';
import 'lead_state.dart';

class LeadBloc extends Bloc<LeadEvent, LeadState> {
  final GetLeadsUseCase getLeadsUseCase;
  final LogCallActivityUseCase logCallActivityUseCase;
  final CrmRepository crmRepository;
  StreamSubscription? _socketSubscription;

  LeadBloc({
    required this.getLeadsUseCase,
    required this.logCallActivityUseCase,
    required this.crmRepository,
  }) : super(const LeadState()) {
    on<LoadLeadsEvent>(_onLoadLeads);
    on<FilterLeadsByStageEvent>(_onFilterByStage);
    on<SearchLeadsEvent>(_onSearchLeads);
    on<LogCallActivityEvent>(_onLogCallActivity);
    on<SimulateIncomingPushLeadEvent>(_onSimulateIncomingPushLead);
    on<DismissIncomingLeadNotificationEvent>(_onDismissNotification);

    _listenToIncomingSocketAlerts();
  }

  void _listenToIncomingSocketAlerts() {
    _socketSubscription?.cancel();
    _socketSubscription = crmRepository.listenToLeadAlerts().listen((event) {
      if (event['event'] == 'NEW_LEAD') {
        add(SimulateIncomingPushLeadEvent(
          fullName: event['lead_name'] ?? 'Inbound Prospect',
          source: event['source'] ?? 'Facebook Ads',
          phone: event['phone'] ?? '+8801700000000',
          bedroomRequirement: event['requirement'] ?? '3 Bed Lake View',
          budgetBdt: (event['budget'] ?? 25000000).toDouble(),
        ));
      }
    });
  }

  Future<void> _onLoadLeads(LoadLeadsEvent event, Emitter<LeadState> emit) async {
    emit(state.copyWith(status: LeadStatus.loading));
    try {
      final leads = await getLeadsUseCase.execute();
      emit(state.copyWith(
        status: LeadStatus.loaded,
        allLeads: leads,
        filteredLeads: _applyFilters(leads, state.selectedStage, state.searchQuery),
      ));
    } catch (e) {
      emit(state.copyWith(
        status: LeadStatus.error,
        errorMessage: e.toString(),
      ));
    }
  }

  void _onFilterByStage(FilterLeadsByStageEvent event, Emitter<LeadState> emit) {
    emit(state.copyWith(
      selectedStage: event.stage,
      clearSelectedStage: event.stage == null,
      filteredLeads: _applyFilters(state.allLeads, event.stage, state.searchQuery),
    ));
  }

  void _onSearchLeads(SearchLeadsEvent event, Emitter<LeadState> emit) {
    emit(state.copyWith(
      searchQuery: event.query,
      filteredLeads: _applyFilters(state.allLeads, state.selectedStage, event.query),
    ));
  }

  Future<void> _onLogCallActivity(LogCallActivityEvent event, Emitter<LeadState> emit) async {
    try {
      final activity = await logCallActivityUseCase.execute(
        leadId: event.leadId,
        outcome: event.outcome,
        durationMinutes: event.durationMinutes,
        notes: event.notes,
        nextFollowup: event.nextFollowup,
      );

      final updatedLeads = state.allLeads.map((lead) {
        if (lead.id == event.leadId) {
          lead.lastCallOutcome = event.outcome;
          lead.nextFollowupDate = event.nextFollowup;
          lead.activities.insert(0, activity);
          if (lead.stage == LeadStageEnum.newLead) {
            lead.stage = LeadStageEnum.contacted;
          }
        }
        return lead;
      }).toList();

      emit(state.copyWith(
        allLeads: updatedLeads,
        filteredLeads: _applyFilters(updatedLeads, state.selectedStage, state.searchQuery),
        bannerMessage: 'Call log saved (${event.durationMinutes} min): "${event.outcome}"',
      ));
    } catch (e) {
      emit(state.copyWith(
        errorMessage: 'Failed to record call activity: $e',
      ));
    }
  }

  void _onSimulateIncomingPushLead(
    SimulateIncomingPushLeadEvent event,
    Emitter<LeadState> emit,
  ) {
    final newLead = LeadEntity(
      id: DateTime.now().millisecondsSinceEpoch % 100000,
      fullName: event.fullName,
      phone: event.phone,
      email: '${event.fullName.toLowerCase().replaceAll(' ', '.')}@gmail.com',
      source: event.source.contains('Facebook')
          ? LeadSourceEnum.facebookAds
          : LeadSourceEnum.websiteForm,
      stage: LeadStageEnum.newLead,
      preferredLocation: 'Prime Dhaka Location',
      bedroomRequirement: event.bedroomRequirement,
      budgetBdt: event.budgetBdt,
      createdAt: DateTime.now(),
    );

    final updatedAll = [newLead, ...state.allLeads];

    emit(state.copyWith(
      allLeads: updatedAll,
      filteredLeads: _applyFilters(updatedAll, state.selectedStage, state.searchQuery),
      activeNotification: IncomingLeadNotification(
        fullName: event.fullName,
        source: event.source,
        phone: event.phone,
        bedroomRequirement: event.bedroomRequirement,
        budgetBdt: event.budgetBdt,
        receivedAt: DateTime.now(),
      ),
      bannerMessage: '⚡ Push Alert: Inbound lead captured from ${event.source}',
    ));
  }

  void _onDismissNotification(
    DismissIncomingLeadNotificationEvent event,
    Emitter<LeadState> emit,
  ) {
    emit(state.copyWith(clearActiveNotification: true));
  }

  List<LeadEntity> _applyFilters(
    List<LeadEntity> leads,
    LeadStageEnum? stage,
    String query,
  ) {
    return leads.where((l) {
      final matchesStage = stage == null || l.stage == stage;
      final q = query.trim().toLowerCase();
      final matchesQuery = q.isEmpty ||
          l.fullName.toLowerCase().contains(q) ||
          l.phone.contains(q) ||
          l.preferredLocation.toLowerCase().contains(q);
      return matchesStage && matchesQuery;
    }).toList();
  }

  @override
  Future<void> close() {
    _socketSubscription?.cancel();
    return super.close();
  }
}
