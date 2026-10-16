import 'dart:async';
import 'dart:math';

enum WebSocketStatus { connected, disconnected, connecting }

class InventoryWebSocketClient {
  final _eventController = StreamController<Map<String, dynamic>>.broadcast();
  Timer? _mockHeartbeatTimer;
  WebSocketStatus _status = WebSocketStatus.disconnected;

  Stream<Map<String, dynamic>> get stream => _eventController.stream;
  WebSocketStatus get status => _status;

  void connect({bool enableMockBroadcast = false}) {
    _status = WebSocketStatus.connected;
    // Broadcast connection established
    _eventController.add({
      'event': 'WS_CONNECTED',
      'message': 'Connected to ERP Realtime Lock Cluster (Redis Mutex)',
      'timestamp': DateTime.now().toIso8601String(),
    });

    if (enableMockBroadcast) {
      _mockHeartbeatTimer?.cancel();
      _mockHeartbeatTimer = Timer.periodic(const Duration(seconds: 45), (timer) {
        if (_status == WebSocketStatus.connected) {
          _simulateExternalBroadcast();
        }
      });
    }
  }

  void _simulateExternalBroadcast() {
    final random = Random();
    final events = [
      {
        'event': 'UNIT_LOCKED',
        'unit_id': 202,
        'unit_number': '2B',
        'locked_by': 'Asif (Gulshan Sales Gallery)',
        'lock_duration_seconds': 900,
        'expires_at': DateTime.now().add(const Duration(minutes: 15)).toIso8601String(),
      },
      {
        'event': 'NEW_LEAD',
        'lead_name': 'Engr. Shafiul Alam',
        'source': 'Facebook Ads',
        'phone': '+8801755667788',
        'requirement': '3 Bed South Facing (2100 sqft)',
        'budget': 28500000,
      }
    ];

    final chosen = events[random.nextInt(events.length)];
    _eventController.add(chosen);
  }

  void broadcastLockEvent({
    required int unitId,
    required String unitNumber,
    required String lockedBy,
    required int lockSeconds,
  }) {
    _eventController.add({
      'event': 'UNIT_LOCKED',
      'unit_id': unitId,
      'unit_number': unitNumber,
      'locked_by': lockedBy,
      'lock_duration_seconds': lockSeconds,
      'expires_at': DateTime.now().add(Duration(seconds: lockSeconds)).toIso8601String(),
    });
  }

  void dispose() {
    _mockHeartbeatTimer?.cancel();
    _eventController.close();
    _status = WebSocketStatus.disconnected;
  }
}
