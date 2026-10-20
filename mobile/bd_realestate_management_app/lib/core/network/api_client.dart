import 'dart:convert';
import 'package:http/http.dart' as http;

class ManagementApiClient {
  static const String baseUrl = 'http://10.0.2.2:8000/api/v1/mobile-mgmt';
  // Use http://localhost:8000/api/v1/mobile-mgmt for iOS / Web

  String? _authToken;

  void setAuthToken(String token) {
    _authToken = token;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      };

  // 1. Executive Dashboard KPIs
  Future<Map<String, dynamic>> getDashboardKpis() async {
    final response = await http.get(Uri.parse('$baseUrl/dashboard/kpis'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Executive Dashboard KPIs: ${response.statusCode}');
  }

  // 2. Project Performance
  Future<Map<String, dynamic>> getProjects({int limit = 10, int offset = 0, String? search}) async {
    var url = '$baseUrl/projects?limit=$limit&offset=$offset';
    if (search != null && search.isNotEmpty) url += '&search=${Uri.encodeComponent(search)}';
    final response = await http.get(Uri.parse(url), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Projects: ${response.statusCode}');
  }

  // 3. Sales Analytics
  Future<Map<String, dynamic>> getSalesAnalytics({int limit = 10, int offset = 0}) async {
    final response = await http.get(Uri.parse('$baseUrl/sales-analytics?limit=$limit&offset=$offset'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Sales Analytics: ${response.statusCode}');
  }

  // 4. Cash Flow Monitoring
  Future<Map<String, dynamic>> getCashflow({int limit = 10, int offset = 0}) async {
    final response = await http.get(Uri.parse('$baseUrl/cashflow?limit=$limit&offset=$offset'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Cash Flow: ${response.statusCode}');
  }

  // 5. Approval Center
  Future<Map<String, dynamic>> getApprovals({int limit = 10, int offset = 0, String? status}) async {
    var url = '$baseUrl/approvals?limit=$limit&offset=$offset';
    if (status != null && status.isNotEmpty) url += '&status=${Uri.encodeComponent(status)}';
    final response = await http.get(Uri.parse(url), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Approvals: ${response.statusCode}');
  }

  Future<void> actionApproval(int id, String action, {String remarks = ''}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/approvals/$id/action'),
      headers: _headers,
      body: jsonEncode({'action': action, 'remarks': remarks}),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to $action approval: ${response.statusCode}');
    }
  }

  // 6. Procurement Monitoring
  Future<Map<String, dynamic>> getProcurement({int limit = 10, int offset = 0}) async {
    final response = await http.get(Uri.parse('$baseUrl/procurement?limit=$limit&offset=$offset'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Procurement: ${response.statusCode}');
  }

  // 7. Construction Monitoring
  Future<Map<String, dynamic>> getConstruction({int limit = 10, int offset = 0}) async {
    final response = await http.get(Uri.parse('$baseUrl/construction?limit=$limit&offset=$offset'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Construction: ${response.statusCode}');
  }

  // 8. HR Overview
  Future<Map<String, dynamic>> getHrOverview({int limit = 10, int offset = 0}) async {
    final response = await http.get(Uri.parse('$baseUrl/hr-overview?limit=$limit&offset=$offset'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load HR Overview: ${response.statusCode}');
  }

  // 9. Compliance Alerts
  Future<Map<String, dynamic>> getCompliance({int limit = 10, int offset = 0}) async {
    final response = await http.get(Uri.parse('$baseUrl/compliance?limit=$limit&offset=$offset'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Compliance: ${response.statusCode}');
  }

  // 10. Reports & Summaries
  Future<Map<String, dynamic>> getReports({int limit = 10, int offset = 0}) async {
    final response = await http.get(Uri.parse('$baseUrl/reports?limit=$limit&offset=$offset'), headers: _headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load Reports: ${response.statusCode}');
  }
}
