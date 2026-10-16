import 'dart:convert';
import 'package:http/http.dart' as http;

class ConstructionApiClient {
  final String baseUrl;
  final http.Client _client;

  ConstructionApiClient({
    this.baseUrl = 'http://127.0.0.1:8000/api/v1/construction',
    http.Client? client,
  }) : _client = client ?? http.Client();

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  /// POST /api/v1/construction/dpr
  Future<Map<String, dynamic>> postDpr(Map<String, dynamic> dprPayload) async {
    final uri = Uri.parse('$baseUrl/dpr');
    final response = await _client
        .post(uri, headers: _headers, body: jsonEncode(dprPayload))
        .timeout(const Duration(seconds: 4));

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception('Server rejected DPR with status ${response.statusCode}');
    }
  }

  /// GET /api/v1/construction/dpr
  Future<List<dynamic>> getDprList({int? projectId}) async {
    final uri = Uri.parse('$baseUrl/dpr${projectId != null ? "?project_id=$projectId" : ""}');
    final response = await _client
        .get(uri, headers: _headers)
        .timeout(const Duration(seconds: 4));

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception('Failed to fetch DPR list: ${response.statusCode}');
    }
  }
}
