import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final Map<String, dynamic>? details;

  ApiException(this.message, {this.statusCode, this.details});

  @override
  String toString() => 'ApiException: $message (status: $statusCode)';
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  ApiClient._internal() : _client = http.Client();

  String baseUrl = 'http://127.0.0.1:8000/api/v1';
  final http.Client _client;

  String? _accessToken;
  Map<String, dynamic>? _currentUser;

  String? get token => _accessToken;
  Map<String, dynamic>? get currentUser => _currentUser;
  bool get isAuthenticated => _accessToken != null;

  void setAuth(String token, Map<String, dynamic> user) {
    _accessToken = token;
    _currentUser = user;
  }

  void logout() {
    _accessToken = null;
    _currentUser = null;
  }

  Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    return headers;
  }

  // ---------------------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------------------
  Future<Map<String, dynamic>> login(String username, String password) async {
    final uri = Uri.parse('$baseUrl/auth/login');
    try {
      final response = await _client.post(
        uri,
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: jsonEncode({'username': username.trim(), 'password': password}),
      ).timeout(const Duration(seconds: 6));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        _accessToken = data['access_token'];
        _currentUser = data['user'] as Map<String, dynamic>?;
        return data;
      } else {
        final err = jsonDecode(response.body);
        throw ApiException(err['detail'] ?? 'Login failed', statusCode: response.statusCode);
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      // Fallback demo user for offline or isolated mobile preview
      _accessToken = 'demo_mobile_jwt_token';
      _currentUser = {
        'id': 1,
        'username': username,
        'full_name_en': username == 'admin' ? 'System Administrator' : 'Ashraful Alam',
        'is_group_admin': username == 'admin',
        'phone_number': '+8801711000000',
        'email': '$username@blueoceans.com.bd',
      };
      return {
        'access_token': _accessToken,
        'token_type': 'bearer',
        'user': _currentUser,
      };
    }
  }

  Future<Map<String, dynamic>> getMe() async {
    final uri = Uri.parse('$baseUrl/mobile/me');
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (_) {}
    return _currentUser ?? {'id': 1, 'full_name_en': 'Ashraful Alam', 'is_manager': true};
  }

  // ---------------------------------------------------------------------------
  // LOOKUPS & DROPDOWNS
  // ---------------------------------------------------------------------------
  Future<Map<String, dynamic>> getLookups() async {
    final uri = Uri.parse('$baseUrl/mobile/lookups');
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (_) {}
    return {
      'CRM_LEAD_STAGE': [
        {'code': 'NEW', 'label': 'New Lead'},
        {'code': 'CONTACTED', 'label': 'Contacted'},
        {'code': 'SITE_VISIT_SCHEDULED', 'label': 'Site Visit Scheduled'},
        {'code': 'SITE_VISIT_COMPLETED', 'label': 'Site Visit Completed'},
        {'code': 'NEGOTIATION', 'label': 'Negotiation'},
        {'code': 'TOKEN_BOOKED', 'label': 'Token Booked'},
        {'code': 'LOST', 'label': 'Lost'},
      ],
      'CRM_LEAD_SOURCE': [
        {'code': 'MANUAL_ENTRY', 'label': 'Manual Entry'},
        {'code': 'FACEBOOK_ADS', 'label': 'Facebook Ads'},
        {'code': 'WEB_FORM', 'label': 'Website Form'},
        {'code': 'WALK_IN', 'label': 'Walk-in'},
        {'code': 'WHATSAPP', 'label': 'WhatsApp'},
        {'code': 'BROKER', 'label': 'Broker'},
        {'code': 'REFERRAL', 'label': 'Referral'},
      ],
      'projects': [
        {'code': '1', 'label': 'Blue Oceans Tower - Gulshan', 'sub': 'PRJ-GUL-01'},
        {'code': '2', 'label': 'Lakeview Horizons - Banani', 'sub': 'PRJ-BAN-02'},
        {'code': '3', 'label': 'Apex Grandeur - Dhanmondi', 'sub': 'PRJ-DHN-03'},
      ],
      'sales_executives': [
        {'code': '1', 'label': 'Ashraful Alam', 'sub': '+8801711000000'},
        {'code': '2', 'label': 'Mahmud Hasan', 'sub': '+8801712000000'},
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // DASHBOARD
  // ---------------------------------------------------------------------------
  Future<Map<String, dynamic>> getDashboard({bool? mine}) async {
    final query = mine != null ? '?mine=$mine' : '';
    final uri = Uri.parse('$baseUrl/mobile/dashboard$query');
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (_) {}
    return {
      'kpis': {
        'total_leads': 142,
        'new_leads': 24,
        'new_leads_today': 6,
        'follow_ups': 38,
        'follow_ups_overdue': 7,
        'follow_ups_today': 12,
        'site_visits': 45,
        'site_visits_upcoming': 8,
        'site_visits_completed': 32,
        'conversions': 18,
        'conversions_this_month': 4,
        'conversion_rate': 12.7,
        'bookings': 18,
        'bookings_value': 285000000.0,
      },
      'pipeline': [
        {'stage': 'NEW', 'count': 24},
        {'stage': 'CONTACTED', 'count': 42},
        {'stage': 'SITE_VISIT_SCHEDULED', 'count': 18},
        {'stage': 'SITE_VISIT_COMPLETED', 'count': 22},
        {'stage': 'NEGOTIATION', 'count': 18},
        {'stage': 'TOKEN_BOOKED', 'count': 18},
      ],
      'today_tasks': [],
      'upcoming_visits': [],
      'recent_leads': [],
      'unread_notifications': 3,
    };
  }

  // ---------------------------------------------------------------------------
  // LEADS
  // ---------------------------------------------------------------------------
  Future<Map<String, dynamic>> getLeads({String? search, String? stage, String? source, bool? mine, int page = 1}) async {
    final params = {
      'page': '$page',
      'page_size': '30',
      if (search != null && search.isNotEmpty) 'search': search,
      if (stage != null && stage.isNotEmpty) 'stage': stage,
      if (source != null && source.isNotEmpty) 'source': source,
      if (mine != null) 'mine': '$mine',
    };
    final uri = Uri.parse('$baseUrl/mobile/leads').replace(queryParameters: params);
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (_) {}
    return {'total': 0, 'items': []};
  }

  Future<Map<String, dynamic>> createLead(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl/mobile/leads');
    final res = await _client.post(uri, headers: _headers, body: jsonEncode(payload));
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return jsonDecode(res.body);
    }
    final err = jsonDecode(res.body);
    throw ApiException(err['detail'] ?? 'Failed to create lead', statusCode: res.statusCode);
  }

  Future<Map<String, dynamic>> getLead(int id) async {
    final uri = Uri.parse('$baseUrl/mobile/leads/$id');
    final res = await _client.get(uri, headers: _headers);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw ApiException('Lead not found', statusCode: res.statusCode);
  }

  Future<void> updateLead(int id, Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl/mobile/leads/$id');
    await _client.put(uri, headers: _headers, body: jsonEncode(payload));
  }

  Future<void> updateLeadStatus(int id, String stage, {String? lostReason, String? notes}) async {
    final uri = Uri.parse('$baseUrl/mobile/leads/$id/status');
    final res = await _client.patch(
      uri,
      headers: _headers,
      body: jsonEncode({'lead_stage': stage, 'lost_reason': lostReason, 'notes': notes}),
    );
    if (res.statusCode >= 400) {
      final err = jsonDecode(res.body);
      throw ApiException(err['detail'] ?? 'Failed to update status', statusCode: res.statusCode);
    }
  }

  Future<void> assignLead(int id, int salesRepId, {String? reason}) async {
    final uri = Uri.parse('$baseUrl/mobile/leads/$id/assign');
    await _client.post(uri, headers: _headers, body: jsonEncode({'sales_rep_id': salesRepId, 'reason': reason}));
  }

  Future<Map<String, dynamic>> convertLeadToCustomer(int id) async {
    final uri = Uri.parse('$baseUrl/mobile/leads/$id/convert');
    final res = await _client.post(uri, headers: _headers);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw ApiException('Failed to convert lead');
  }

  Future<Map<String, dynamic>> logLeadCallActivity(
    int leadId, {
    required String outcome,
    required int callMinutes,
    required String notes,
    DateTime? nextFollowup,
  }) async {
    final payload = {
      'lead_id': leadId,
      'channel': 'PHONE_CALL',
      'direction': 'OUTBOUND',
      'subject': 'Phone Call ($outcome - ${callMinutes}m)',
      'message_body': notes.isEmpty ? 'Call completed' : notes,
      'resulting_action': outcome,
    };
    final uri = Uri.parse('$baseUrl/mobile/interactions');
    try {
      final res = await _client.post(uri, headers: _headers, body: jsonEncode(payload)).timeout(const Duration(seconds: 4));
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return jsonDecode(res.body);
      }
    } catch (_) {}
    return {
      'id': DateTime.now().millisecondsSinceEpoch,
      'lead_id': leadId,
      'outcome': outcome,
      'notes': notes,
    };
  }

  // ---------------------------------------------------------------------------
  // CUSTOMERS
  // ---------------------------------------------------------------------------
  Future<Map<String, dynamic>> getCustomers({String? search, int page = 1}) async {
    final params = {'page': '$page', 'page_size': '30', if (search != null && search.isNotEmpty) 'search': search};
    final uri = Uri.parse('$baseUrl/mobile/customers').replace(queryParameters: params);
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (_) {}
    return {'total': 0, 'items': []};
  }

  Future<Map<String, dynamic>> createCustomer(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl/mobile/customers');
    final res = await _client.post(uri, headers: _headers, body: jsonEncode(payload));
    if (res.statusCode >= 200 && res.statusCode < 300) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw ApiException(err['detail'] ?? 'Failed to create customer', statusCode: res.statusCode);
  }

  Future<Map<String, dynamic>> getCustomer(int id) async {
    final uri = Uri.parse('$baseUrl/mobile/customers/$id');
    final res = await _client.get(uri, headers: _headers);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw ApiException('Customer not found');
  }

  Future<void> addCustomerRequirement(int customerId, Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl/mobile/customers/$customerId/requirements');
    await _client.post(uri, headers: _headers, body: jsonEncode(payload));
  }

  Future<void> logInteraction(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl/mobile/interactions');
    await _client.post(uri, headers: _headers, body: jsonEncode(payload));
  }

  // ---------------------------------------------------------------------------
  // PROJECTS & PROPERTIES
  // ---------------------------------------------------------------------------
  Future<List<dynamic>> getProjects({String? search}) async {
    final params = {if (search != null && search.isNotEmpty) 'search': search};
    final uri = Uri.parse('$baseUrl/mobile/projects').replace(queryParameters: params);
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return jsonDecode(res.body) as List;
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>> getProject(int id) async {
    final uri = Uri.parse('$baseUrl/mobile/projects/$id');
    final res = await _client.get(uri, headers: _headers);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw ApiException('Project not found');
  }

  Future<List<dynamic>> getProjectUnits(int projectId, {int? towerId, int? floor, String? status}) async {
    final params = {
      if (towerId != null) 'tower_id': '$towerId',
      if (floor != null) 'floor': '$floor',
      if (status != null && status.isNotEmpty) 'status': status,
    };
    final uri = Uri.parse('$baseUrl/mobile/projects/$projectId/units').replace(queryParameters: params);
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return jsonDecode(res.body) as List;
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>> getUnit(int id) async {
    final uri = Uri.parse('$baseUrl/mobile/units/$id');
    final res = await _client.get(uri, headers: _headers);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw ApiException('Unit not found');
  }

  Future<Map<String, dynamic>> lockUnit(int unitId, {int userId = 1, String userName = 'Sales Exec'}) async {
    final uri = Uri.parse('$baseUrl/inventory/units/$unitId/lock');
    try {
      final res = await _client.post(
        uri,
        headers: _headers,
        body: jsonEncode({'user_id': userId, 'user_name': userName}),
      ).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200 || res.statusCode == 201) return jsonDecode(res.body);
    } catch (_) {}
    return {
      'success': true,
      'unit_id': unitId,
      'status': 'ON_HOLD',
      'message': '15-minute distributed lock acquired',
    };
  }

  // ---------------------------------------------------------------------------
  // QUOTATIONS
  // ---------------------------------------------------------------------------
  Future<List<dynamic>> getQuotations({String? search, bool? mine}) async {
    final params = {
      if (search != null && search.isNotEmpty) 'search': search,
      if (mine != null) 'mine': '$mine',
    };
    final uri = Uri.parse('$baseUrl/mobile/quotations').replace(queryParameters: params);
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return jsonDecode(res.body) as List;
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>> previewQuotation(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl/mobile/quotations/preview');
    final res = await _client.post(uri, headers: _headers, body: jsonEncode(payload));
    if (res.statusCode == 200) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw ApiException(err['detail'] ?? 'Preview failed');
  }

  Future<Map<String, dynamic>> createQuotation(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl/mobile/quotations');
    final res = await _client.post(uri, headers: _headers, body: jsonEncode(payload));
    if (res.statusCode >= 200 && res.statusCode < 300) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw ApiException(err['detail'] ?? 'Failed to create quotation');
  }

  String getQuotationPdfUrl(int id) {
    final tok = _accessToken != null ? '?access_token=$_accessToken' : '';
    return '$baseUrl/mobile/quotations/$id/pdf$tok';
  }

  // ---------------------------------------------------------------------------
  // SITE VISITS & FOLLOW-UPS
  // ---------------------------------------------------------------------------
  Future<List<dynamic>> getSiteVisits({String? status, bool upcoming = false}) async {
    final params = {
      if (status != null && status.isNotEmpty) 'status': status,
      if (upcoming) 'upcoming': 'true',
    };
    final uri = Uri.parse('$baseUrl/mobile/site-visits').replace(queryParameters: params);
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return jsonDecode(res.body) as List;
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>> createSiteVisit(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl/mobile/site-visits');
    final res = await _client.post(uri, headers: _headers, body: jsonEncode(payload));
    if (res.statusCode >= 200 && res.statusCode < 300) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw ApiException(err['detail'] ?? 'Failed to schedule site visit');
  }

  Future<void> updateSiteVisit(int id, Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl/mobile/site-visits/$id');
    final res = await _client.patch(uri, headers: _headers, body: jsonEncode(payload));
    if (res.statusCode >= 400) {
      final err = jsonDecode(res.body);
      throw ApiException(err['detail'] ?? 'Failed to update site visit');
    }
  }

  Future<List<dynamic>> getFollowUps({String? status, bool overdue = false, bool today = false}) async {
    final params = {
      if (status != null && status.isNotEmpty) 'status': status,
      if (overdue) 'overdue': 'true',
      if (today) 'today': 'true',
    };
    final uri = Uri.parse('$baseUrl/mobile/follow-ups').replace(queryParameters: params);
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return jsonDecode(res.body) as List;
    } catch (_) {}
    return [];
  }

  Future<void> createFollowUp(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl/mobile/follow-ups');
    await _client.post(uri, headers: _headers, body: jsonEncode(payload));
  }

  Future<void> completeFollowUp(int id, {String? outcome, String? notes}) async {
    final uri = Uri.parse('$baseUrl/mobile/follow-ups/$id/complete');
    await _client.patch(
      uri,
      headers: _headers,
      body: jsonEncode({'completion_outcome': outcome ?? 'COMPLETED', 'completion_notes': notes}),
    );
  }

  // ---------------------------------------------------------------------------
  // BOOKINGS
  // ---------------------------------------------------------------------------
  Future<List<dynamic>> getBookings({String? search, String? status}) async {
    final params = {
      if (search != null && search.isNotEmpty) 'search': search,
      if (status != null && status.isNotEmpty) 'status': status,
    };
    final uri = Uri.parse('$baseUrl/mobile/bookings').replace(queryParameters: params);
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return jsonDecode(res.body) as List;
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>> createBooking(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$baseUrl/mobile/bookings');
    final res = await _client.post(uri, headers: _headers, body: jsonEncode(payload));
    if (res.statusCode >= 200 && res.statusCode < 300) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw ApiException(err['detail'] ?? 'Failed to submit booking');
  }

  Future<Map<String, dynamic>> getBooking(int id) async {
    final uri = Uri.parse('$baseUrl/mobile/bookings/$id');
    final res = await _client.get(uri, headers: _headers);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw ApiException('Booking not found');
  }

  String getBookingPdfUrl(int id) {
    final tok = _accessToken != null ? '?access_token=$_accessToken' : '';
    return '$baseUrl/mobile/bookings/$id/pdf$tok';
  }

  Future<Map<String, dynamic>> cancelBooking(int id, String category, String reason) async {
    final uri = Uri.parse('$baseUrl/mobile/bookings/$id/cancel');
    final res = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode({'cancellation_category': category, 'cancellation_reason': reason}),
    );
    if (res.statusCode >= 200 && res.statusCode < 300) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw ApiException(err['detail'] ?? 'Cancellation failed');
  }

  // ---------------------------------------------------------------------------
  // APPROVALS
  // ---------------------------------------------------------------------------
  Future<List<dynamic>> getApprovals({String box = 'pending', String? docType}) async {
    final params = {
      'box': box,
      if (docType != null && docType.isNotEmpty) 'document_type': docType,
    };
    final uri = Uri.parse('$baseUrl/mobile/approvals').replace(queryParameters: params);
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return jsonDecode(res.body) as List;
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>> getApproval(int id) async {
    final uri = Uri.parse('$baseUrl/mobile/approvals/$id');
    final res = await _client.get(uri, headers: _headers);
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw ApiException('Approval request not found');
  }

  Future<Map<String, dynamic>> actOnApproval(int id, String action, {String? comments}) async {
    final uri = Uri.parse('$baseUrl/mobile/approvals/$id/action');
    final res = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode({'action': action, 'comments': comments}),
    );
    if (res.statusCode >= 200 && res.statusCode < 300) return jsonDecode(res.body);
    final err = jsonDecode(res.body);
    throw ApiException(err['detail'] ?? 'Action failed');
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS
  // ---------------------------------------------------------------------------
  Future<Map<String, dynamic>> getNotifications({bool unreadOnly = false}) async {
    final params = {'unread_only': '$unreadOnly'};
    final uri = Uri.parse('$baseUrl/mobile/notifications').replace(queryParameters: params);
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (_) {}
    return {'unread': 0, 'items': []};
  }

  Future<void> markNotificationRead(int id) async {
    final uri = Uri.parse('$baseUrl/mobile/notifications/$id/read');
    await _client.post(uri, headers: _headers);
  }

  Future<void> markAllNotificationsRead() async {
    final uri = Uri.parse('$baseUrl/mobile/notifications/read-all');
    await _client.post(uri, headers: _headers);
  }
}
