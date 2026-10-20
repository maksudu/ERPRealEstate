import 'dart:convert';
import 'package:http/http.dart' as http;

class ConstructionApiClient {
  final String baseUrl;
  final http.Client _client;
  String? authToken;

  ConstructionApiClient({
    this.baseUrl = 'http://127.0.0.1:8000/api/v1/mobile-site',
    this.authToken,
    http.Client? client,
  }) : _client = client ?? http.Client();

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      };

  // Auth Session
  Future<Map<String, dynamic>> login(String username, String password) async {
    final uri = Uri.parse('$baseUrl/auth/login');
    final res = await _client.post(uri, headers: _headers, body: jsonEncode({
      'username': username,
      'password': password,
    }));
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Dashboard
  Future<Map<String, dynamic>> getDashboardMetrics({int? projectId}) async {
    final uri = Uri.parse('$baseUrl/dashboard/metrics${projectId != null ? "?project_id=$projectId" : ""}');
    final res = await _client.get(uri, headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // DPR
  Future<Map<String, dynamic>> getDprList({int limit = 20, int offset = 0, String? search}) async {
    final q = 'limit=$limit&offset=$offset${search != null ? "&search=$search" : ""}';
    final res = await _client.get(Uri.parse('$baseUrl/dpr?$q'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> postDpr(Map<String, dynamic> payload) async {
    final res = await _client.post(Uri.parse('$baseUrl/dpr'), headers: _headers, body: jsonEncode(payload));
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Tasks & Milestones
  Future<Map<String, dynamic>> getTasks({int limit = 20, int offset = 0, String? status}) async {
    final q = 'limit=$limit&offset=$offset${status != null ? "&status=$status" : ""}';
    final res = await _client.get(Uri.parse('$baseUrl/tasks?$q'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Material Requisition
  Future<Map<String, dynamic>> getRequisitions({int limit = 20, int offset = 0, String? status}) async {
    final q = 'limit=$limit&offset=$offset${status != null ? "&status=$status" : ""}';
    final res = await _client.get(Uri.parse('$baseUrl/requisitions?$q'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Material Transactions
  Future<Map<String, dynamic>> getTransactions({int limit = 20, int offset = 0, String? txType}) async {
    final q = 'limit=$limit&offset=$offset${txType != null ? "&tx_type=$txType" : ""}';
    final res = await _client.get(Uri.parse('$baseUrl/transactions?$q'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Photos
  Future<Map<String, dynamic>> getPhotos({int limit = 20, int offset = 0}) async {
    final res = await _client.get(Uri.parse('$baseUrl/photos?limit=$limit&offset=$offset'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Quality
  Future<Map<String, dynamic>> getQuality({int limit = 20, int offset = 0}) async {
    final res = await _client.get(Uri.parse('$baseUrl/quality?limit=$limit&offset=$offset'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Contractors
  Future<Map<String, dynamic>> getContractors({int limit = 20, int offset = 0}) async {
    final res = await _client.get(Uri.parse('$baseUrl/contractors?limit=$limit&offset=$offset'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Safety
  Future<Map<String, dynamic>> getSafety({int limit = 20, int offset = 0}) async {
    final res = await _client.get(Uri.parse('$baseUrl/safety?limit=$limit&offset=$offset'), headers: _headers);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // Offline Sync
  Future<Map<String, dynamic>> syncOfflineBatch(List<Map<String, dynamic>> batch) async {
    final res = await _client.post(Uri.parse('$baseUrl/sync/batch'), headers: _headers, body: jsonEncode(batch));
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}
