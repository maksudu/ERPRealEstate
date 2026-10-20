import 'package:flutter/material.dart';
import '../core/theme/hr_theme.dart';
import '../core/network/api_client.dart';

class HrLoginScreen extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const HrLoginScreen({super.key, required this.onLoginSuccess});

  @override
  State<HrLoginScreen> createState() => _HrLoginScreenState();
}

class _HrLoginScreenState extends State<HrLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _api = HrApiClient();
  final _usernameCtrl = TextEditingController(text: 'employee');
  final _passwordCtrl = TextEditingController(text: 'Employee123!');
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _api.login(
        _usernameCtrl.text.trim(),
        _passwordCtrl.text.trim(),
      );

      if (res['success'] == true || res['token'] != null) {
        final name = res['user']?['full_name'] ?? _usernameCtrl.text.trim();
        final role = res['user']?['role'] ?? 'EMPLOYEE';
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: HrTheme.successTeal,
              content: Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Expanded(child: Text('Welcome $name! ($role Workspace)')),
                ],
              ),
              duration: const Duration(seconds: 2),
            ),
          );
          widget.onLoginSuccess();
        }
      } else {
        setState(() {
          _errorMessage = res['message'] ?? 'Authentication failed. Please verify credentials.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Indigo HR Brand Icon
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: HrTheme.primaryIndigo.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.people_alt_rounded, color: HrTheme.primaryIndigo, size: 48),
                ),
                const SizedBox(height: 18),
                const Text(
                  'BlueOceans HR & Payroll',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: HrTheme.deepNavy,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Workforce Self-Service & Manager Portal',
                  style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 32),

                // Card Container with Form
                Card(
                  color: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: const BorderSide(color: HrTheme.slateBorder),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'Sign In to Your Workspace',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: HrTheme.deepNavy),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Enter your Employee ID or HR Manager credentials',
                            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 18),

                          // Error Banner
                          if (_errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.error_outline, color: HrTheme.alertCrimson, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: const TextStyle(
                                        color: HrTheme.alertCrimson,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Username
                          TextFormField(
                            controller: _usernameCtrl,
                            style: const TextStyle(color: HrTheme.deepNavy),
                            decoration: InputDecoration(
                              labelText: 'Employee ID or Username',
                              prefixIcon: const Icon(Icons.badge_outlined, color: Color(0xFF64748B)),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: HrTheme.slateBorder),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: HrTheme.slateBorder),
                              ),
                            ),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return 'Please enter employee ID';
                              if (v.trim().length < 3) return 'Must be at least 3 characters';
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),

                          // Password
                          TextFormField(
                            controller: _passwordCtrl,
                            obscureText: _obscurePassword,
                            style: const TextStyle(color: HrTheme.deepNavy),
                            decoration: InputDecoration(
                              labelText: 'Password',
                              prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF64748B)),
                              suffixIcon: IconButton(
                                icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: const Color(0xFF64748B)),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: HrTheme.slateBorder),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: HrTheme.slateBorder),
                              ),
                            ),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return 'Please enter password';
                              if (v.trim().length < 4) return 'Password must be at least 4 characters';
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // Login Submit
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: HrTheme.primaryIndigo,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _isLoading ? null : _handleLogin,
                            child: _isLoading
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Text('Access HR Workspace', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Persona Presets
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _roleChip('Employee Self-Service', 'employee', 'Employee123!'),
                    const SizedBox(width: 8),
                    _roleChip('HR Manager Mode', 'hr_manager', 'HrAdmin123!'),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _roleChip(String label, String username, String password) {
    return ActionChip(
      backgroundColor: Colors.white,
      side: const BorderSide(color: HrTheme.slateBorder),
      label: Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
      onPressed: () {
        setState(() {
          _usernameCtrl.text = username;
          _passwordCtrl.text = password;
          _errorMessage = null;
        });
      },
    );
  }
}
