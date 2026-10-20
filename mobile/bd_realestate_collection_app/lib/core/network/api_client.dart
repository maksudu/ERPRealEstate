import 'dart:convert';
import 'package:http/http.dart' as http;

class CollectionApiClient {
  final String baseUrl;
  final http.Client _client;
  String? authToken;

  CollectionApiClient({
    this.baseUrl = 'http://127.0.0.1:8000/api/v1/mobile-collection',
    this.authToken,
    http.Client? client,
  }) : _client = client ?? http.Client();

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      };

  // Auth Session
  Future<Map<String, dynamic>> getSession() async {
    final res = await _client.get(Uri.parse('$baseUrl/auth/session'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Dashboard Metrics
  Future<Map<String, dynamic>> getDashboardMetrics() async {
    final res = await _client.get(Uri.parse('$baseUrl/dashboard/metrics'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Customers
  Future<Map<String, dynamic>> getCustomers({String? search, int limit = 20, int offset = 0}) async {
    final q = 'limit=$limit&offset=$offset${search != null ? "&search=$search" : ""}';
    final res = await _client.get(Uri.parse('$baseUrl/customers?$q'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Schedules
  Future<Map<String, dynamic>> getSchedules({String? status, String? bookingNumber, int limit = 20, int offset = 0}) async {
    final q = 'limit=$limit&offset=$offset${status != null ? "&status=$status" : ""}${bookingNumber != null ? "&booking_number=$bookingNumber" : ""}';
    final res = await _client.get(Uri.parse('$baseUrl/schedules?$q'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Due & Overdue
  Future<Map<String, dynamic>> getDueOverdue({String? search, int limit = 20, int offset = 0}) async {
    final q = 'limit=$limit&offset=$offset${search != null ? "&search=$search" : ""}';
    final res = await _client.get(Uri.parse('$baseUrl/due-overdue?$q'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> sendReminder(int scheduleId) async {
    final res = await _client.post(Uri.parse('$baseUrl/due-overdue/$scheduleId/send-reminder'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Payments (Financial control workflow)
  Future<Map<String, dynamic>> getPayments({String? search, String? postingStatus, int limit = 20, int offset = 0}) async {
    final q = 'limit=$limit&offset=$offset${search != null ? "&search=$search" : ""}${postingStatus != null ? "&posting_status=$postingStatus" : ""}';
    final res = await _client.get(Uri.parse('$baseUrl/payments?$q'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> recordPayment(Map<String, dynamic> payload) async {
    final res = await _client.post(Uri.parse('$baseUrl/payments'), headers: _headers, body: jsonEncode(payload));
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Receipts
  Future<Map<String, dynamic>> getReceiptDetails(int receiptId) async {
    final res = await _client.get(Uri.parse('$baseUrl/receipts/$receiptId'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Customer Ledger
  Future<Map<String, dynamic>> getLedger({String? bookingNumber, int limit = 20, int offset = 0}) async {
    final q = 'limit=$limit&offset=$offset${bookingNumber != null ? "&booking_number=$bookingNumber" : ""}';
    final res = await _client.get(Uri.parse('$baseUrl/ledger?$q'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Bank Loans
  Future<Map<String, dynamic>> getBankLoans({String? status, int limit = 20, int offset = 0}) async {
    final q = 'limit=$limit&offset=$offset${status != null ? "&status=$status" : ""}';
    final res = await _client.get(Uri.parse('$baseUrl/bank-loans?$q'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Approval Workflows
  Future<Map<String, dynamic>> getWorkflows({String? status, int limit = 20, int offset = 0}) async {
    final q = 'limit=$limit&offset=$offset${status != null ? "&status=$status" : ""}';
    final res = await _client.get(Uri.parse('$baseUrl/workflows?$q'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> submitWorkflow(Map<String, dynamic> payload) async {
    final res = await _client.post(Uri.parse('$baseUrl/workflows'), headers: _headers, body: jsonEncode(payload));
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Reports
  Future<Map<String, dynamic>> getReportsSummary() async {
    final res = await _client.get(Uri.parse('$baseUrl/reports/summary'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
