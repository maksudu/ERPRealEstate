import 'package:flutter/material.dart';
import '../core/theme/collection_theme.dart';
import '../core/bluetooth/bluetooth_printer_service.dart';
import '../models/collection_receipt.dart';

class BluetoothPrinterScreen extends StatefulWidget {
  const BluetoothPrinterScreen({super.key});

  @override
  State<BluetoothPrinterScreen> createState() => _BluetoothPrinterScreenState();
}

class _BluetoothPrinterScreenState extends State<BluetoothPrinterScreen> {
  final _printerService = BluetoothPrinterService();

  late CollectionReceipt _sampleReceipt;

  @override
  void initState() {
    super.initState();
    _printerService.addListener(_onServiceChanged);
    _sampleReceipt = CollectionReceipt(
      receiptNumber: 'MR-2026-78401',
      clientName: 'Engr. Mahbubur Rahman',
      clientPhone: '+880 1712-334455',
      unitNumber: 'A-7 (1,850 sft)',
      project: 'Green Horizon Tower',
      amount: 500000.0,
      paymentMethod: PaymentMethod.bkashQr,
      transactionRef: 'BKH-88910294-G',
      amountInWords: 'Five Lac Taka Only',
      date: DateTime.now(),
      hasSignature: true,
      collectedBy: 'Officer Tarek Aziz (FO-892)',
    );
  }

  @override
  void dispose() {
    _printerService.removeListener(_onServiceChanged);
    super.dispose();
  }

  void _onServiceChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final previewText = _printerService.generateEscPosText(_sampleReceipt);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bluetooth Thermal Printer'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Connection Status Banner
            _buildConnectionBanner(),
            const SizedBox(height: 16),

            // Paper Size Toggle
            _buildPaperSettingsCard(),
            const SizedBox(height: 16),

            // Available Bluetooth Devices Card
            _buildDevicesListCard(),
            const SizedBox(height: 20),

            // Thermal Paper Roll Preview
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'THERMAL RECEIPT PREVIEW',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.1,
                    color: Color(0xFF64748B),
                  ),
                ),
                Text(
                  _printerService.paperSize == PrinterPaperSize.mm58 ? '58mm Format' : '80mm Format',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: CollectionTheme.primaryEmerald),
                ),
              ],
            ),
            const SizedBox(height: 10),
            _buildThermalPaperView(previewText),
            const SizedBox(height: 20),

            // Test Print Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: CollectionTheme.darkSlate,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                onPressed: _printerService.isPrinting
                    ? null
                    : () async {
                        final scaffoldMessenger = ScaffoldMessenger.of(context);
                        if (!_printerService.isConnected) {
                          scaffoldMessenger.showSnackBar(
                            const SnackBar(
                              content: Text('Please connect to a Bluetooth belt printer first!'),
                              backgroundColor: CollectionTheme.alertCrimson,
                            ),
                          );
                          return;
                        }

                        final ok = await _printerService.printReceipt(_sampleReceipt);
                        if (ok && mounted) {
                          scaffoldMessenger.showSnackBar(
                            SnackBar(
                              content: Text('Receipt #${_sampleReceipt.receiptNumber} successfully printed!'),
                              backgroundColor: CollectionTheme.primaryEmerald,
                            ),
                          );
                        }
                      },
                icon: _printerService.isPrinting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Icon(Icons.print_rounded, size: 22),
                label: Text(
                  _printerService.isPrinting ? 'Printing to Belt Device (<3s)...' : 'Test Print Official Money Receipt',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildConnectionBanner() {
    final isConnected = _printerService.isConnected;
    final device = _printerService.connectedDevice;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isConnected ? CollectionTheme.primaryEmerald.withOpacity(0.1) : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isConnected ? CollectionTheme.primaryEmerald : const Color(0xFFCBD5E1),
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isConnected ? CollectionTheme.primaryEmerald : Colors.grey,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.bluetooth, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isConnected ? 'CONNECTED' : 'DISCONNECTED',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.1,
                    color: isConnected ? CollectionTheme.primaryEmerald : Colors.grey,
                  ),
                ),
                Text(
                  isConnected ? device!.name : 'No printer paired',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: CollectionTheme.darkSlate),
                ),
                if (isConnected)
                  Text(
                    'MAC: ${device!.macAddress} • High Speed ESC/POS',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
              ],
            ),
          ),
          if (isConnected)
            TextButton(
              onPressed: () => _printerService.disconnect(),
              child: const Text('Disconnect', style: TextStyle(color: CollectionTheme.alertCrimson)),
            ),
        ],
      ),
    );
  }

  Widget _buildPaperSettingsCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Paper Roll Width', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                SizedBox(height: 2),
                Text('Standard field belt printers', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ],
            ),
            SegmentedButton<PrinterPaperSize>(
              segments: const [
                ButtonSegment(value: PrinterPaperSize.mm58, label: Text('58mm')),
                ButtonSegment(value: PrinterPaperSize.mm80, label: Text('80mm')),
              ],
              selected: {_printerService.paperSize},
              onSelectionChanged: (newSelection) {
                _printerService.setPaperSize(newSelection.first);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDevicesListCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Discovered Belt Printers', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Text('1-Tap Connect', style: TextStyle(fontSize: 11, color: CollectionTheme.primaryEmerald, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            ..._printerService.availablePrinters.map((printer) {
              final isCurrent = _printerService.connectedDevice?.macAddress == printer.macAddress;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isCurrent ? CollectionTheme.primaryEmerald.withOpacity(0.06) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isCurrent ? CollectionTheme.primaryEmerald : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(Icons.print, size: 20, color: isCurrent ? CollectionTheme.primaryEmerald : const Color(0xFF64748B)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(printer.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          Text(printer.macAddress, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isCurrent ? Colors.grey : CollectionTheme.primaryEmerald,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        minimumSize: Size.zero,
                      ),
                      onPressed: isCurrent ? null : () => _printerService.connect(printer),
                      child: Text(isCurrent ? 'Active' : 'Pair & Connect', style: const TextStyle(fontSize: 11)),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildThermalPaperView(String text) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFEFCE8), // Thermal receipt yellow/white paper tint
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Perforated Top
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              16,
              (i) => Container(
                margin: const EdgeInsets.symmetric(horizontal: 2),
                width: 6,
                height: 2,
                color: const Color(0xFFCBD5E1),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            text,
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 11,
              height: 1.35,
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
