import 'dart:convert';
import 'package:http/http.dart' as http;

class HrApiClient {
  static final HrApiClient _instance = HrApiClient._internal();
  factory HrApiClient() => _instance;
  HrApiClient._internal() : _client = http.Client();

  final http.Client _client;
  String baseUrl = 'http://127.0.0.1:8000/api/v1/mobile-hr';
  String? _authToken;
  Map<String, dynamic>? currentUser;

  bool get isAuthenticated => _authToken != null;
  bool get isManager => (currentUser?['role'] ?? '').toString().toUpperCase().contains('MANAGER') || (currentUser?['role'] ?? '').toString().toUpperCase().contains('ADMIN');

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

  // 1. Auth Login
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
      final msg = body['detail'] ?? body['message'] ?? 'Authentication failed (${response.statusCode})';
      throw Exception(msg.toString());
    }
  }

  // 2. ESS Endpoints
  Future<Map<String, dynamic>> getEssDashboard() async {
    final response = await _client.get(Uri.parse('$baseUrl/ess/dashboard'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load ESS Dashboard (${response.statusCode})');
  }

  Future<Map<String, dynamic>> checkInOut({
    required String punchType,
    required double latitude,
    required double longitude,
    String? siteName,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/attendance/check-in-out'),
      headers: _headers,
      body: jsonEncode({
        'punch_type': punchType,
        'latitude': latitude,
        'longitude': longitude,
        'site_name': siteName ?? 'Corporate Head Office (Gulshan)',
      }),
    );
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to record punch (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getAttendanceHistory() async {
    final response = await _client.get(Uri.parse('$baseUrl/attendance/history'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Attendance History (${response.statusCode})');
  }

  Future<Map<String, dynamic>> submitAttendanceCorrection({
    required String date,
    required String inTime,
    required String outTime,
    required String reason,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/attendance/correction'),
      headers: _headers,
      body: jsonEncode({
        'date': date,
        'corrected_clock_in': inTime,
        'corrected_clock_out': outTime,
        'reason': reason,
      }),
    );
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to submit correction (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getLeaveBalances() async {
    final response = await _client.get(Uri.parse('$baseUrl/leave/balances'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Leave Balances (${response.statusCode})');
  }

  Future<Map<String, dynamic>> applyLeave({
    required String leaveType,
    required String startDate,
    required String endDate,
    required int totalDays,
    required String reason,
    String? emergencyContact,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/leave/apply'),
      headers: _headers,
      body: jsonEncode({
        'leave_type': leaveType,
        'start_date': startDate,
        'end_date': endDate,
        'total_days': totalDays,
        'reason': reason,
        'emergency_contact': emergencyContact,
      }),
    );
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to apply leave (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getOvertimeRequests() async {
    final response = await _client.get(Uri.parse('$baseUrl/overtime/requests'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Overtime Requests (${response.statusCode})');
  }

  Future<Map<String, dynamic>> applyOvertime({
    required String date,
    required double hours,
    required String reason,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/overtime/apply'),
      headers: _headers,
      body: jsonEncode({
        'date': date,
        'overtime_hours': hours,
        'reason': reason,
      }),
    );
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to apply overtime (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getPayslips() async {
    final response = await _client.get(Uri.parse('$baseUrl/payroll/payslips'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Payslips (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getLoansAdvances() async {
    final response = await _client.get(Uri.parse('$baseUrl/loans-advances'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Loans & Advances (${response.statusCode})');
  }

  Future<Map<String, dynamic>> applyLoanAdvance({
    required String requestType,
    required double amount,
    required String purpose,
    int installments = 1,
  }) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/loans-advances/apply'),
      headers: _headers,
      body: jsonEncode({
        'request_type': requestType,
        'amount': amount,
        'purpose': purpose,
        'installments': installments,
      }),
    );
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to apply for Loan/Advance (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getProfile() async {
    final response = await _client.get(Uri.parse('$baseUrl/profile'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Profile (${response.statusCode})');
  }

  // 3. MSS (HR & Manager) Endpoints
  Future<Map<String, dynamic>> getManagerDashboard() async {
    final response = await _client.get(Uri.parse('$baseUrl/manager/dashboard'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Manager Dashboard (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getManagerAttendance() async {
    final response = await _client.get(Uri.parse('$baseUrl/manager/attendance'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Manager Attendance (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getManagerLeaveRequests() async {
    final response = await _client.get(Uri.parse('$baseUrl/manager/leave-requests'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Manager Leave Requests (${response.statusCode})');
  }

  Future<Map<String, dynamic>> actionManagerLeave(int id, String action, {String remarks = ''}) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/manager/leave-requests/$id/action'),
      headers: _headers,
      body: jsonEncode({'action': action, 'remarks': remarks}),
    );
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to update leave request (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getManagerOvertimeRequests() async {
    final response = await _client.get(Uri.parse('$baseUrl/manager/overtime-requests'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Manager Overtime Requests (${response.statusCode})');
  }

  Future<Map<String, dynamic>> actionManagerOvertime(int id, String action, {String remarks = ''}) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/manager/overtime-requests/$id/action'),
      headers: _headers,
      body: jsonEncode({'action': action, 'remarks': remarks}),
    );
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to update overtime request (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getSiteWorkforce() async {
    final response = await _client.get(Uri.parse('$baseUrl/manager/site-workforce'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Site Workforce (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getManagerPayrollSummary() async {
    final response = await _client.get(Uri.parse('$baseUrl/manager/payroll-summary'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Manager Payroll Summary (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getEmployeeRequests() async {
    final response = await _client.get(Uri.parse('$baseUrl/manager/employee-requests'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Employee Requests (${response.statusCode})');
  }

  Future<Map<String, dynamic>> actionEmployeeRequest(int id, String action, {String remarks = ''}) async {
    final response = await _client.post(
      Uri.parse('$baseUrl/manager/employee-requests/$id/action'),
      headers: _headers,
      body: jsonEncode({'action': action, 'remarks': remarks}),
    );
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to update employee request (${response.statusCode})');
  }

  Future<Map<String, dynamic>> getManagerReports() async {
    final response = await _client.get(Uri.parse('$baseUrl/manager/reports'), headers: _headers);
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to load Manager Reports (${response.statusCode})');
  }
}
