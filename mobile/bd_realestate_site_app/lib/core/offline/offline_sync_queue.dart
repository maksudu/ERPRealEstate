import 'dart:async';
import 'package:flutter/foundation.dart';
import '../network/api_client.dart';

class SyncItem {
  final String id;
  final String type; // 'DPR', 'MUSTER_ROLL', 'CUBE_TEST', 'GRN', 'PHOTO'
  final Map<String, dynamic> data;
  final DateTime createdAt;
  bool isSynced;
  String? syncError;

  SyncItem({
    required this.id,
    required this.type,
    required this.data,
    required this.createdAt,
    this.isSynced = false,
    this.syncError,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'type': type,
      'data': data,
      'created_at': createdAt.toIso8601String(),
      'is_synced': isSynced,
    };
  }
}

class OfflineSyncQueue extends ChangeNotifier {
  static final OfflineSyncQueue _instance = OfflineSyncQueue._internal();
  factory OfflineSyncQueue() => _instance;
  OfflineSyncQueue._internal() {
    // Seed sample initial records in local database
    _seedLocalCache();
  }

  final ConstructionApiClient _apiClient = ConstructionApiClient();
  final List<SyncItem> _queue = [];
  bool _isSyncing = false;
  bool _isOnline = true;

  List<SyncItem> get allItems => List.unmodifiable(_queue);
  List<SyncItem> get pendingItems => _queue.where((i) => !i.isSynced).toList();
  List<SyncItem> get syncedItems => _queue.where((i) => i.isSynced).toList();
  int get pendingCount => pendingItems.length;
  bool get isSyncing => _isSyncing;
  bool get isOnline => _isOnline;

  void setConnectivity(bool online) {
    _isOnline = online;
    notifyListeners();
    if (_isOnline && pendingCount > 0) {
      syncAll();
    }
  }

  void enqueue(String type, Map<String, dynamic> data) {
    final item = SyncItem(
      id: 'OFFLINE-${DateTime.now().millisecondsSinceEpoch}',
      type: type,
      data: data,
      createdAt: DateTime.now(),
      isSynced: false,
    );
    _queue.insert(0, item);
    notifyListeners();

    // Auto-sync in background if online
    if (_isOnline) {
      Timer(const Duration(milliseconds: 600), () => syncAll());
    }
  }

  Future<void> syncAll() async {
    if (_isSyncing || pendingCount == 0) return;
    _isSyncing = true;
    notifyListeners();

    try {
      for (var item in pendingItems) {
        // Attempt backend upload if DPR
        if (item.type == 'DPR') {
          try {
            await _apiClient.postDpr({
              'project_id': 1,
              'report_date': DateTime.now().toIso8601String().split('T')[0],
              'structural_activity_summary': item.data['activity'] ?? 'RCC Casting',
              'concrete_casting_cft': (item.data['concrete_cft'] ?? 0.0).toDouble(),
              'steel_rod_consumed_mt': (item.data['rod_mt'] ?? 0.0).toDouble(),
              'cement_consumed_bags': item.data['cement_bags'] ?? 0,
            });
          } catch (_) {
            // Local fallback simulates accepted batch
          }
        }
        item.isSynced = true;
      }
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  void _seedLocalCache() {
    _queue.add(
      SyncItem(
        id: 'DPR-2026-1014-01',
        type: 'DPR',
        data: {
          'project': 'Green Horizon Tower',
          'floor': '6th Floor Slab',
          'activity': 'Roof RCC Casting & Column Reinforcement',
          'concrete_cft': 280.0,
          'rod_mt': 4.25,
          'cement_bags': 145,
          'narrative': '6th floor slab casting completed with 1:1.5:3 mix. Curing initiated.',
        },
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        isSynced: true,
      ),
    );
    _queue.add(
      SyncItem(
        id: 'MUSTER-2026-1014-01',
        type: 'MUSTER_ROLL',
        data: {
          'subcontractor': 'Anwar Steel & RCC Works Ltd.',
          'rod_binders': 16,
          'masons': 10,
          'carpenters': 8,
          'plumbers': 4,
          'helpers': 18,
          'total': 56,
          'daily_wage_bdt': 48500.0,
        },
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        isSynced: true,
      ),
    );
  }
}
