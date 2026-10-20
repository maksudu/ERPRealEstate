import 'dart:convert';
import 'package:http/http.dart' as http;

class ManagementApiClient {
  static final ManagementApiClient _instance = ManagementApiClient._internal();
  factory ManagementApiClient() => _instance;
  ManagementApiClient._internal() : _client = http.Client();

  final http.Client _client;
  String baseUrl = 'http://127.0.0.1:8000/api/v1/mobile-management';
  String? _authToken;
  Map<String, dynamic>? currentUser;

  bool get isAuthenticated => _authToken != null;

  void setAuth(String token, Map<String, dynamic> user) {
    _authToken = token;
    currentUser = user;
  }

  void logout() {
    _authToken = null;
    currentUser = null;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      };

  // 1. Executive Login
  Future<Map<String, dynamic>> login(String username, String password) async {
    final uri = Uri.parse('$baseUrl/auth/login');
    final response = await _client.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'username': username,
        'password': password,
      }),
    );
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (body['token'] != null) {
        setAuth(body['token'].toString(), body['user'] ?? {});
      }
      return body;
    } else {
      final msg = body['detail'] ?? body['message'] ?? 'Authentication failed (Code ${response.statusCode})';
      throw Exception(msg.toString());
    }
  }

  // 2. Executive Dashboard KPIs & Trends
  Future<Map<String, dynamic>> getExecutiveDashboard() async {
    final response = await _client.get(Uri.parse('$baseUrl/executive/dashboard'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Executive Dashboard (${response.statusCode})');
  }

  // 3. Project Performance & S-Curve
  Future<Map<String, dynamic>> getProjectsPerformance() async {
    final response = await _client.get(Uri.parse('$baseUrl/projects/performance'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Projects Performance (${response.statusCode})');
  }

  // 4. Sales Analytics & Inventory
  Future<Map<String, dynamic>> getSalesAnalytics() async {
    final response = await _client.get(Uri.parse('$baseUrl/sales/analytics'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Sales Analytics (${response.statusCode})');
  }

  // 5. Cash Flow & Liquidity Monitoring
  Future<Map<String, dynamic>> getCashflowMonitoring() async {
    final response = await _client.get(Uri.parse('$baseUrl/cashflow/monitoring'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Cash Flow (${response.statusCode})');
  }

  // 6. Approval Center
  Future<Map<String, dynamic>> getPendingApprovals() async {
    final response = await _client.get(Uri.parse('$baseUrl/approvals/pending'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Pending Approvals (${response.statusCode})');
  }

  Future<Map<String, dynamic>> executeApprovalAction(int id, String action, {String remarks = ''}) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/approvals/$id/action'),
      headers: _headers,
      body: jsonEncode({'action': action, 'remarks': remarks}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to execute approval action (${response.statusCode})');
  }

  // 7. Procurement Monitoring
  Future<Map<String, dynamic>> getProcurementMonitoring() async {
    final response = await _client.get(Uri.parse('$baseUrl/procurement/monitoring'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Procurement Monitoring (${response.statusCode})');
  }

  // 8. Construction Monitoring
  Future<Map<String, dynamic>> getConstructionMonitoring() async {
    final response = await _client.get(Uri.parse('$baseUrl/construction/monitoring'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Construction Monitoring (${response.statusCode})');
  }

  // 9. HR Overview
  Future<Map<String, dynamic>> getHrOverview() async {
    final response = await _client.get(Uri.parse('$baseUrl/hrms/overview'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load HR Overview (${response.statusCode})');
  }

  // 10. Compliance Alerts
  Future<Map<String, dynamic>> getComplianceAlerts() async {
    final response = await _client.get(Uri.parse('$baseUrl/compliance/alerts'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Compliance Alerts (${response.statusCode})');
  }

  // 11. Reports & Summaries
  Future<Map<String, dynamic>> getReportsSummaries() async {
    final response = await _client.get(Uri.parse('$baseUrl/reports/summaries'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Reports (${response.statusCode})');
  }
}
