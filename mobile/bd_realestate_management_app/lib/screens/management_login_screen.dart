import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../core/network/api_client.dart';

class ManagementLoginScreen extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const ManagementLoginScreen({super.key, required this.onLoginSuccess});

  @override
  State<ManagementLoginScreen> createState() => _ManagementLoginScreenState();
}

class _ManagementLoginScreenState extends State<ManagementLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _api = ManagementApiClient();
  final _usernameCtrl = TextEditingController(text: 'director');
  final _passwordCtrl = TextEditingController(text: 'Director123!');
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
        final userName = res['user']?['full_name'] ?? 'Director';
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: ManagementTheme.successEmerald,
              content: Row(
                children: [
                  const Icon(Icons.verified_user, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Expanded(child: Text('Welcome, $userName! Entering Executive Cockpit...')),
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
                // Executive Gold Seal
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: ManagementTheme.softGoldBg,
                    shape: BoxShape.circle,
                    border: Border.all(color: ManagementTheme.luxuryGold.withOpacity(0.3), width: 2),
                  ),
                  child: const Icon(Icons.shield_outlined, color: ManagementTheme.luxuryGold, size: 48),
                ),
                const SizedBox(height: 18),
                const Text(
                  'BlueOceans Executive',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                    color: ManagementTheme.royalNavy,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Directors & Senior Management BI Gateway',
                  style: TextStyle(fontSize: 13, color: ManagementTheme.textMuted),
                ),
                const SizedBox(height: 32),

                // Card Container with Form
                Card(
                  color: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: const BorderSide(color: ManagementTheme.borderSubtle),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                            'Management Sign In',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: ManagementTheme.royalNavy),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Authorized board members & executive leadership only',
                            style: TextStyle(fontSize: 12, color: ManagementTheme.textMuted),
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
                                  const Icon(Icons.error_outline, color: ManagementTheme.alertCrimson, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: const TextStyle(
                                        color: ManagementTheme.alertCrimson,
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
                            style: const TextStyle(color: ManagementTheme.royalNavy),
                            decoration: InputDecoration(
                              labelText: 'Executive Username or Corporate Email',
                              prefixIcon: const Icon(Icons.badge_outlined, color: ManagementTheme.textMuted),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: ManagementTheme.borderSubtle),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: ManagementTheme.borderSubtle),
                              ),
                            ),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return 'Please enter username';
                              if (v.trim().length < 3) return 'Username must be at least 3 characters';
                              return null;
                            },
                          ),
                          const SizedBox(height: 14),

                          // Password
                          TextFormField(
                            controller: _passwordCtrl,
                            obscureText: _obscurePassword,
                            style: const TextStyle(color: ManagementTheme.royalNavy),
                            decoration: InputDecoration(
                              labelText: 'Security Password',
                              prefixIcon: const Icon(Icons.lock_outline, color: ManagementTheme.textMuted),
                              suffixIcon: IconButton(
                                icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, color: ManagementTheme.textMuted),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                              filled: true,
                              fillColor: const Color(0xFFF8FAFC),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: ManagementTheme.borderSubtle),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: ManagementTheme.borderSubtle),
                              ),
                            ),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return 'Please enter password';
                              if (v.trim().length < 4) return 'Password must be at least 4 characters';
                              return null;
                            },
                          ),
                          const SizedBox(height: 20),

                          // Sign In Button
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: ManagementTheme.royalNavy,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            onPressed: _isLoading ? null : _handleLogin,
                            child: _isLoading
                                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Text('Access Executive Cockpit', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
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
                    _roleChip('Managing Director', 'director'),
                    const SizedBox(width: 8),
                    _roleChip('Chief Financial Officer', 'cfo'),
                    const SizedBox(width: 8),
                    _roleChip('Chief Exec Officer', 'ceo'),
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
      side: const BorderSide(color: ManagementTheme.borderSubtle),
      label: Text(label, style: const TextStyle(color: ManagementTheme.textMuted, fontSize: 11)),
      onPressed: () {
        setState(() {
          _usernameCtrl.text = username;
          _passwordCtrl.text = 'Director123!';
          _errorMessage = null;
        });
      },
    );
  }
}
