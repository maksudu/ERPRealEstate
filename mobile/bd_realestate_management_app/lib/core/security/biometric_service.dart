import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/management_theme.dart';

class BiometricService extends ChangeNotifier {
  static final BiometricService _instance = BiometricService._internal();
  factory BiometricService() => _instance;
  BiometricService._internal();

  bool _isAuthenticated = false;
  bool get isAuthenticated => _isAuthenticated;

  void lock() {
    _isAuthenticated = false;
    notifyListeners();
  }

  void unlock() {
    _isAuthenticated = true;
    notifyListeners();
  }

  Future<bool> promptBiometricApproval(
    BuildContext context, {
    required String title,
    required String reason,
    required String amountBdt,
  }) async {
    final completer = Completer<bool>();

    showModalBottomSheet(
      context: context,
      isDismissible: false,
      enableDrag: false,
      isScrollControlled: true,
      backgroundColor: ManagementTheme.royalNavy,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => _BiometricPromptSheet(
        title: title,
        reason: reason,
        amountBdt: amountBdt,
        onApproved: () {
          Navigator.pop(ctx);
          completer.complete(true);
        },
        onCancelled: () {
          Navigator.pop(ctx);
          completer.complete(false);
        },
      ),
    );

    return completer.future;
  }
}

class _BiometricPromptSheet extends StatefulWidget {
  final String title;
  final String reason;
  final String amountBdt;
  final VoidCallback onApproved;
  final VoidCallback onCancelled;

  const _BiometricPromptSheet({
    required this.title,
    required this.reason,
    required this.amountBdt,
    required this.onApproved,
    required this.onCancelled,
  });

  @override
  State<_BiometricPromptSheet> createState() => _BiometricPromptSheetState();
}

class _BiometricPromptSheetState extends State<_BiometricPromptSheet> {
  bool _isScanning = false;
  bool _scanSuccess = false;

  void _triggerScan() async {
    setState(() => _isScanning = true);
    await Future.delayed(const Duration(milliseconds: 1200));
    if (mounted) {
      setState(() {
        _isScanning = false;
        _scanSuccess = true;
      });
      await Future.delayed(const Duration(milliseconds: 400));
      widget.onApproved();
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.shield_outlined, color: ManagementTheme.luxuryGold, size: 22),
              const SizedBox(width: 8),
              Text(
                widget.title.toUpperCase(),
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                  color: ManagementTheme.luxuryGold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            widget.reason,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, color: Colors.white),
          ),
          if (widget.amountBdt.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              widget.amountBdt,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: ManagementTheme.brightGold,
              ),
            ),
          ],
          const SizedBox(height: 24),

          // Sensor Touch / Face ID Scanner target
          GestureDetector(
            onTap: _triggerScan,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _scanSuccess
                    ? ManagementTheme.successEmerald.withOpacity(0.2)
                    : ManagementTheme.luxuryGold.withOpacity(0.15),
                border: Border.all(
                  color: _scanSuccess
                      ? ManagementTheme.successEmerald
                      : (_isScanning ? ManagementTheme.brightGold : ManagementTheme.luxuryGold),
                  width: 2.5,
                ),
                boxShadow: [
                  if (_isScanning)
                    BoxShadow(
                      color: ManagementTheme.luxuryGold.withOpacity(0.4),
                      blurRadius: 20,
                      spreadRadius: 4,
                    ),
                ],
              ),
              child: Center(
                child: _scanSuccess
                    ? const Icon(Icons.check, color: ManagementTheme.successEmerald, size: 44)
                    : (_isScanning
                        ? const CircularProgressIndicator(color: ManagementTheme.luxuryGold)
                        : const Icon(Icons.fingerprint, color: ManagementTheme.luxuryGold, size: 46)),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _scanSuccess
                ? 'Biometric Verified!'
                : (_isScanning ? 'Verifying Face ID / Fingerprint...' : 'Tap sensor to authorize with Face ID'),
            style: TextStyle(
              fontSize: 12,
              color: _scanSuccess ? ManagementTheme.successEmerald : ManagementTheme.textMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 24),

          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: widget.onCancelled,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.white24),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('Cancel', style: TextStyle(color: Colors.white70)),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: ElevatedButton(
                  onPressed: _triggerScan,
                  child: const Text('Authorize'),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
}
