import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../models/collection_receipt.dart';

enum PrinterPaperSize {
  mm58,
  mm80,
}

class BluetoothDeviceItem {
  final String name;
  final String macAddress;
  final bool isPaired;

  const BluetoothDeviceItem({
    required this.name,
    required this.macAddress,
    required this.isPaired,
  });
}

class BluetoothPrinterService extends ChangeNotifier {
  static final BluetoothPrinterService _instance = BluetoothPrinterService._internal();
  factory BluetoothPrinterService() => _instance;
  BluetoothPrinterService._internal();

  BluetoothDeviceItem? _connectedDevice = const BluetoothDeviceItem(
    name: 'RPP02N-80mm Belt Printer',
    macAddress: '88:4A:EA:23:41:9C',
    isPaired: true,
  );
  PrinterPaperSize _paperSize = PrinterPaperSize.mm80;
  bool _isPrinting = false;
  String _lastPrintedReceiptText = '';

  BluetoothDeviceItem? get connectedDevice => _connectedDevice;
  bool get isConnected => _connectedDevice != null;
  PrinterPaperSize get paperSize => _paperSize;
  bool get isPrinting => _isPrinting;
  String get lastPrintedReceiptText => _lastPrintedReceiptText;

  final List<BluetoothDeviceItem> availablePrinters = [
    const BluetoothDeviceItem(
      name: 'RPP02N-80mm Belt Printer',
      macAddress: '88:4A:EA:23:41:9C',
      isPaired: true,
    ),
    const BluetoothDeviceItem(
      name: 'MTP-II Portable 58mm',
      macAddress: 'DC:0D:30:77:22:A1',
      isPaired: true,
    ),
    const BluetoothDeviceItem(
      name: 'Zjiang POS-5802LD',
      macAddress: '6C:AB:31:09:5F:88',
      isPaired: false,
    ),
  ];

  void setPaperSize(PrinterPaperSize size) {
    _paperSize = size;
    notifyListeners();
  }

  void connect(BluetoothDeviceItem device) {
    _connectedDevice = device;
    notifyListeners();
  }

  void disconnect() {
    _connectedDevice = null;
    notifyListeners();
  }

  String generateEscPosText(CollectionReceipt receipt) {
    final width = _paperSize == PrinterPaperSize.mm58 ? 32 : 48;
    final divider = '=' * width;
    final subDivider = '-' * width;

    final buffer = StringBuffer();
    buffer.writeln(divider);
    buffer.writeln(_centerText('SHANTA HOLDINGS / ERP REAL ESTATE', width));
    buffer.writeln(_centerText('OFFICIAL MONEY RECEIPT', width));
    buffer.writeln(_centerText('Govt BIN: 001928374-0101', width));
    buffer.writeln(divider);
    buffer.writeln('MR No: ${receipt.receiptNumber}');
    buffer.writeln('Date : ${receipt.date.toIso8601String().substring(0, 16)}');
    buffer.writeln('Agent: ${receipt.collectedBy}');
    buffer.writeln(subDivider);
    buffer.writeln('CLIENT DETAILS:');
    buffer.writeln('Name : ${receipt.clientName}');
    buffer.writeln('Phone: ${receipt.clientPhone}');
    buffer.writeln('Proj : ${receipt.project}');
    buffer.writeln('Unit : ${receipt.unitNumber}');
    buffer.writeln(subDivider);
    buffer.writeln('PAYMENT PARTICULARS:');
    buffer.writeln('Method : ${receipt.paymentMethodTitle}');
    buffer.writeln('Txn Ref: ${receipt.transactionRef}');
    buffer.writeln(divider);
    buffer.writeln(_centerText('TOTAL RECEIVED IN BDT', width));
    buffer.writeln(_centerText('BDT ৳${receipt.amount.toStringAsFixed(2)}', width));
    buffer.writeln(divider);
    buffer.writeln('In Words:');
    buffer.writeln(receipt.amountInWords);
    buffer.writeln(subDivider);
    buffer.writeln('VERIFICATION QR STRING:');
    buffer.writeln('ERP://MR/${receipt.receiptNumber}/${receipt.amount.toInt()}');
    buffer.writeln(divider);
    buffer.writeln(_centerText('Computerized Field Receipt', width));
    buffer.writeln(_centerText('Subject to Realisation of Cheque/PDC', width));
    buffer.writeln(_centerText('Thank You For Your Partnership', width));
    buffer.writeln(divider);
    buffer.writeln('\n\n[PAPER FEED & CUT]');

    return buffer.toString();
  }

  String _centerText(String text, int width) {
    if (text.length >= width) return text;
    final leftPadding = (width - text.length) ~/ 2;
    return ' ' * leftPadding + text;
  }

  Future<bool> printReceipt(CollectionReceipt receipt) async {
    if (!isConnected) return false;
    _isPrinting = true;
    _lastPrintedReceiptText = generateEscPosText(receipt);
    notifyListeners();

    // Fast simulated thermal transmission < 2.5 seconds
    await Future.delayed(const Duration(milliseconds: 1800));

    _isPrinting = false;
    notifyListeners();
    return true;
  }
}
