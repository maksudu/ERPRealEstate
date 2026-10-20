import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _api = ApiClient();
  bool _isLoading = false;
  List<dynamic> _items = [];
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.getNotifications();
      setState(() {
        _unreadCount = res['unread'] ?? 0;
        _items = res['items'] ?? [];
      });
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  IconData _iconForType(String? type) {
    switch (type) {
      case 'LEAD_ASSIGNED':
        return Icons.person_add_alt_1;
      case 'OVERDUE_FOLLOW_UP':
        return Icons.warning_amber_rounded;
      case 'APPROVAL_RESULT':
        return Icons.verified;
      case 'APPROVAL_PENDING':
        return Icons.pending_actions;
      default:
        return Icons.notifications;
    }
  }

  Color _colorForType(String? type) {
    switch (type) {
      case 'LEAD_ASSIGNED':
        return const Color(0xFF3B82F6);
      case 'OVERDUE_FOLLOW_UP':
        return Colors.redAccent;
      case 'APPROVAL_RESULT':
        return const Color(0xFF10B981);
      case 'APPROVAL_PENDING':
        return const Color(0xFFF59E0B);
      default:
        return AppTheme.primaryTeal;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        title: Text(
          _unreadCount > 0 ? 'Notifications ($_unreadCount unread)' : 'Notifications',
          style: const TextStyle(color: Color(0xFF0F172A), fontSize: 18, fontWeight: FontWeight.bold),
        ),
        actions: [
          if (_items.isNotEmpty)
            TextButton.icon(
              icon: const Icon(Icons.done_all, size: 16, color: AppTheme.primaryTeal),
              label: const Text('Mark all read', style: TextStyle(color: AppTheme.primaryTeal, fontSize: 12, fontWeight: FontWeight.bold)),
              onPressed: () async {
                await _api.markAllNotificationsRead();
                _loadNotifications();
              },
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryTeal))
          : _items.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none, color: Color(0xFF94A3B8), size: 48),
                      SizedBox(height: 12),
                      Text('All caught up! No notifications.', style: TextStyle(color: Color(0xFF64748B))),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _items.length,
                    itemBuilder: (ctx, i) {
                      final n = _items[i];
                      final isRead = n['is_read'] == true;
                      final type = n['type'] as String?;
                      final color = _colorForType(type);

                      return Card(
                        color: Colors.white,
                        elevation: 0,
                        margin: const EdgeInsets.only(bottom: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(
                            color: isRead ? const Color(0xFFE2E8F0) : color.withOpacity(0.5),
                            width: isRead ? 1 : 1.5,
                          ),
                        ),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: color.withOpacity(0.12),
                            child: Icon(_iconForType(type), color: color, size: 20),
                          ),
                          title: Text(
                            n['title'] ?? 'Notification',
                            style: TextStyle(
                              color: const Color(0xFF0F172A),
                              fontSize: 13,
                              fontWeight: isRead ? FontWeight.w500 : FontWeight.bold,
                            ),
                          ),
                          subtitle: Text(
                            n['body'] ?? '',
                            style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                          ),
                          trailing: isRead
                              ? null
                              : Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(shape: BoxShape.circle, color: color),
                                ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
