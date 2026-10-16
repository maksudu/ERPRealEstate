import 'package:flutter/material.dart';
import '../core/theme/management_theme.dart';
import '../core/security/biometric_service.dart';

class BiometricGateScreen extends StatefulWidget {
  final VoidCallback onAuthenticated;

  const BiometricGateScreen({super.key, required this.onAuthenticated});

  @override
  State<BiometricGateScreen> createState() => _BiometricGateScreenState();
}

class _BiometricGateScreenState extends State<BiometricGateScreen> {
  bool _isAuthenticating = false;

  void _authenticate() async {
    setState(() => _isAuthenticating = true);
    await Future.delayed(const Duration(milliseconds: 1000));
    if (mounted) {
      setState(() => _isAuthenticating = false);
      BiometricService().unlock();
      widget.onAuthenticated();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ManagementTheme.obsidianBlack,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Luxury Crest / Monogram
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const RadialGradient(
                    colors: [Color(0xFF334155), Color(0xFF0F172A)],
                  ),
                  border: Border.all(color: ManagementTheme.luxuryGold, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: ManagementTheme.luxuryGold.withOpacity(0.25),
                      blurRadius: 24,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(Icons.shield_rounded, color: ManagementTheme.luxuryGold, size: 48),
                ),
              ),
              const SizedBox(height: 24),

              const Text(
                'EXECUTIVE BI COCKPIT',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 2.2,
                  color: ManagementTheme.luxuryGold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Managing Director & Board Portal',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Strict Biometric Security Enforced\nHardware Face ID / Secure Enclave Required',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: ManagementTheme.textMuted, height: 1.5),
              ),
              const Spacer(),

              // Biometric Scanner Button
              GestureDetector(
                onTap: _authenticate,
                child: Container(
                  width: 84,
                  height: 84,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: ManagementTheme.cardDark,
                    border: Border.all(color: ManagementTheme.luxuryGold, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: ManagementTheme.luxuryGold.withOpacity(0.3),
                        blurRadius: 18,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Center(
                    child: _isAuthenticating
                        ? const CircularProgressIndicator(color: ManagementTheme.luxuryGold)
                        : const Icon(Icons.fingerprint, color: ManagementTheme.luxuryGold, size: 44),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Tap sensor to unlock with Face ID',
                style: TextStyle(
                  fontSize: 12,
                  color: ManagementTheme.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _authenticate,
                  icon: const Icon(Icons.lock_open_rounded, size: 20),
                  label: const Text('Unlock with Biometrics'),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: _authenticate,
                child: const Text(
                  'Use Executive Master PIN',
                  style: TextStyle(color: ManagementTheme.textMuted, fontSize: 12),
                ),
              ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
