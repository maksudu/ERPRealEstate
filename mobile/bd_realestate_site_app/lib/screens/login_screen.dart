import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/network/api_client.dart';

class SiteLoginScreen extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const SiteLoginScreen({super.key, required this.onLoginSuccess});

  @override
  State<SiteLoginScreen> createState() => _SiteLoginScreenState();
}

class _SiteLoginScreenState extends State<SiteLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _api = ConstructionApiClient();
  final _usernameCtrl = TextEditingController(text: 'site_eng');
  final _passwordCtrl = TextEditingController(text: 'SiteAdmin123!');
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
    // 1. Form Validation
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // 2. Backend API Call
      final res = await _api.login(
        _usernameCtrl.text.trim(),
        _passwordCtrl.text.trim(),
      );

      // 3. Validation on Backend Result
      if (res['success'] == true || res['token'] != null) {
        final userName = res['user']?['full_name'] ?? _usernameCtrl.text.trim();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: const Color(0xFF10B981),
              content: Row(
                children: [
                  const Icon(Icons.check_circle_outline, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Expanded(child: Text('Welcome $userName! Entering Site Workspace...')),
                ],
              ),
              duration: const Duration(seconds: 2),
            ),
          );
          // 4. Proceed to Dashboard
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
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Site Safety Icon Badge
                Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: SiteAppTheme.primarySafetyOrange.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.construction, color: SiteAppTheme.primarySafetyOrange, size: 48),
                ),
                const SizedBox(height: 16),
                const Text(
                  'BlueOceans Site Ops',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: SiteAppTheme.darkNavy,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Construction Field Engineering & DPR Portal',
                  style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 28),

                // Card Container with Form
                Card(
                  color: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(22),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'Site Engineer Sign In',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: SiteAppTheme.darkNavy),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Enter your credentials to access site operations & DPR',
                            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                          const SizedBox(height: 16),

                          // Error Banner if validation or backend fails
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
                                  const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: const TextStyle(
                                        color: Color(0xFFDC2626),
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

                          // Username Field
                          TextFormField(
                            controller: _usernameCtrl,
                            style: const TextStyle(color: SiteAppTheme.darkNavy),
                            decoration: InputDecoration(
                              labelText: 'Username or Employee ID',
                              prefixIcon: const Icon(Icons.person_outline, color: Color(0xFF64748B)),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Please enter username or employee ID';
                              }
                              if (val.trim().length < 3) {
                                return 'Username must be at least 3 characters';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),

                          // Password Field
                          TextFormField(
                            controller: _passwordCtrl,
                            obscureText: _obscurePassword,
                            style: const TextStyle(color: SiteAppTheme.darkNavy),
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
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Please enter password';
                              }
                              if (val.trim().length < 4) {
                                return 'Password must be at least 4 characters';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // Login Submit Button
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: SiteAppTheme.primarySafetyOrange,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _isLoading ? null : _handleLogin,
                            child: _isLoading
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Text('Access Site Workspace', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Quick Role Presets
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _roleChip('Project Engineer', 'site_eng'),
                    const SizedBox(width: 8),
                    _roleChip('Quality Inspector', 'qa_inspector'),
                    const SizedBox(width: 8),
                    _roleChip('Store Officer', 'store_mgr'),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _roleChip(String label, String username) {
    return ActionChip(
      backgroundColor: Colors.white,
      side: const BorderSide(color: Color(0xFFE2E8F0)),
      label: Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
      onPressed: () {
        setState(() {
          _usernameCtrl.text = username;
          _passwordCtrl.text = 'SiteAdmin123!';
          _errorMessage = null;
        });
      },
    );
  }
}

