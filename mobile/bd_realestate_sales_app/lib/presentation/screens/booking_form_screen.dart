import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/unit_entity.dart';
import '../../data/repositories/booking_repository_impl.dart';
import '../../domain/usecases/submit_booking_usecase.dart';
import '../bloc/booking/booking_bloc.dart';
import '../bloc/booking/booking_event.dart';
import '../bloc/booking/booking_state.dart';
import '../widgets/digital_signature_pad.dart';
import '../widgets/nid_camera_capture_card.dart';
import '../../core/utils/currency_formatter.dart';
import '../../core/theme/app_theme.dart';

class BookingFormScreen extends StatelessWidget {
  final UnitEntity unit;

  const BookingFormScreen({super.key, required this.unit});

  @override
  Widget build(BuildContext context) {
    final bookingRepo = BookingRepositoryImpl();
    final submitUseCase = SubmitBookingUseCase(bookingRepo);

    return BlocProvider(
      create: (_) => BookingBloc(submitBookingUseCase: submitUseCase)
        ..add(
          InitializeBookingEvent(
            unitId: unit.id,
            unitNumber: unit.unitNumber,
            towerName: unit.towerName,
            totalContractValue: unit.grossPriceBdt,
          ),
        ),
      child: _BookingFormView(unit: unit),
    );
  }
}

class _BookingFormView extends StatefulWidget {
  final UnitEntity unit;

  const _BookingFormView({required this.unit});

  @override
  State<_BookingFormView> createState() => _BookingFormViewState();
}

class _BookingFormViewState extends State<_BookingFormView> {
  final _formKey = GlobalKey<FormState>();

  final _clientNameCtrl = TextEditingController(text: 'Engr. Tanvir Ahmed');
  final _clientPhoneCtrl = TextEditingController(text: '+8801711998877');
  final _clientNidCtrl = TextEditingController(text: '19852691234567890');
  final _clientAddressCtrl = TextEditingController(text: 'House 24, Road 11, Banani, Dhaka');

  final _nomineeNameCtrl = TextEditingController(text: 'Farhana Ahmed');
  final _nomineeRelationCtrl = TextEditingController(text: 'Spouse');
  final _nomineeNidCtrl = TextEditingController(text: '19892699876543210');

  final _earnestMoneyCtrl = TextEditingController(text: '500000');
  String _paymentMode = 'Pay Order';
  final _chequeCtrl = TextEditingController(text: 'PO-9823412');
  final _bankCtrl = TextEditingController(text: 'Eastern Bank Ltd (EBL)');

  @override
  void dispose() {
    _clientNameCtrl.dispose();
    _clientPhoneCtrl.dispose();
    _clientNidCtrl.dispose();
    _clientAddressCtrl.dispose();
    _nomineeNameCtrl.dispose();
    _nomineeRelationCtrl.dispose();
    _nomineeNidCtrl.dispose();
    _earnestMoneyCtrl.dispose();
    _chequeCtrl.dispose();
    _bankCtrl.dispose();
    super.dispose();
  }

  void _submit(BuildContext context) {
    if (!_formKey.currentState!.validate()) return;

    final state = context.read<BookingBloc>().state;
    if (!state.hasValidSignature) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please capture customer on-glass digital signature before submission.'),
          backgroundColor: AppTheme.dangerRed,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    context.read<BookingBloc>().add(
          SubmitBookingFormEvent(
            clientFullName: _clientNameCtrl.text,
            clientPhone: _clientPhoneCtrl.text,
            clientNid: _clientNidCtrl.text,
            clientAddress: _clientAddressCtrl.text,
            nomineeName: _nomineeNameCtrl.text,
            nomineeRelation: _nomineeRelationCtrl.text,
            nomineeNid: _nomineeNidCtrl.text,
            earnestMoneyBdt: double.tryParse(_earnestMoneyCtrl.text) ?? 500000.0,
            paymentMode: _paymentMode,
            chequeNumber: _chequeCtrl.text,
            bankName: _bankCtrl.text,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<BookingBloc, BookingState>(
      listener: (context, state) {
        if (state.status == BookingSubmissionStatus.success) {
          _showAllotmentConfirmationDialog(context, state);
        } else if (state.errorMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.errorMessage!),
              backgroundColor: AppTheme.dangerRed,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            title: Text('Digital Booking · Unit ${widget.unit.unitNumber}'),
          ),
          body: Form(
            key: _formKey,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Unit Summary Header Banner
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primaryTeal, Color(0xFF0F766E)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Unit ${widget.unit.unitNumber} · ${widget.unit.towerName}',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Level ${widget.unit.floorNumber} · ${widget.unit.carpetAreaSqft.toInt()} sqft carpet area',
                              style: const TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ],
                        ),
                        Text(
                          BdtCurrencyFormatter.format(widget.unit.grossPriceBdt),
                          style: const TextStyle(
                            color: AppTheme.accentAmber,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Section 1: Client Information
                  _buildSectionTitle('1. Allottee / Client Information', Icons.person_outline),
                  const SizedBox(height: 10),
                  _buildTextField(_clientNameCtrl, 'Full Name (as per NID)', Icons.person),
                  const SizedBox(height: 10),
                  _buildTextField(_clientPhoneCtrl, 'Mobile Phone Number', Icons.phone, keyboardType: TextInputType.phone),
                  const SizedBox(height: 10),
                  _buildTextField(_clientNidCtrl, 'National ID (NID / Smart Card Number)', Icons.badge, keyboardType: TextInputType.number),
                  const SizedBox(height: 10),
                  _buildTextField(_clientAddressCtrl, 'Present / Mailing Address', Icons.home),

                  const SizedBox(height: 24),

                  // Section 2: NID Camera Photo Capture (Front & Back)
                  _buildSectionTitle('2. NID Camera Photo Capture (Front & Back)', Icons.camera_alt_outlined),
                  const SizedBox(height: 6),
                  const Text(
                    'Capture real-time photos of client national identity card for digital audit.',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  NidCameraCaptureCard(
                    title: 'NID Card — Front Side',
                    subtitle: 'Align front side with photo and Bengali/English text.',
                    isCaptured: state.frontNidCaptured,
                    onCapture: () => context.read<BookingBloc>().add(CaptureNidFrontEvent()),
                  ),
                  const SizedBox(height: 10),
                  NidCameraCaptureCard(
                    title: 'NID Card — Back Side',
                    subtitle: 'Align back side with address and barcode/hologram.',
                    isCaptured: state.backNidCaptured,
                    onCapture: () => context.read<BookingBloc>().add(CaptureNidBackEvent()),
                  ),

                  const SizedBox(height: 24),

                  // Section 3: Nominee Details
                  _buildSectionTitle('3. Nominee Particulars', Icons.family_restroom),
                  const SizedBox(height: 10),
                  _buildTextField(_nomineeNameCtrl, 'Nominee Full Name', Icons.person_pin),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(_nomineeRelationCtrl, 'Relationship', Icons.favorite_border),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildTextField(_nomineeNidCtrl, 'Nominee NID', Icons.badge_outlined, keyboardType: TextInputType.number),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Section 4: Earnest Money & Payment Details
                  _buildSectionTitle('4. Earnest Money & Mode of Payment', Icons.payments_outlined),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(
                          _earnestMoneyCtrl,
                          'Earnest Money (BDT)',
                          Icons.currency_lira,
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          value: _paymentMode,
                          decoration: InputDecoration(
                            labelText: 'Payment Mode',
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            filled: true,
                            fillColor: Colors.white,
                          ),
                          items: ['Pay Order', 'Cheque', 'Bank Transfer', 'bKash Merchant']
                              .map((m) => DropdownMenuItem(value: m, child: Text(m, style: const TextStyle(fontSize: 12))))
                              .toList(),
                          onChanged: (val) => setState(() => _paymentMode = val!),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(_chequeCtrl, 'Instrument / PO No.', Icons.numbers),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildTextField(_bankCtrl, 'Bank & Branch', Icons.account_balance),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Section 5: On-Glass Digital Signature Canvas
                  _buildSectionTitle('5. On-Glass Customer Digital Signature', Icons.gesture),
                  const SizedBox(height: 6),
                  const Text(
                    'Customer must execute digital signature directly on device screen.',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                  const SizedBox(height: 12),

                  DigitalSignaturePad(
                    strokes: state.signatureStrokes,
                    currentStroke: state.currentStroke,
                    onAddPoint: (pt) => context.read<BookingBloc>().add(AddSignaturePointEvent(pt)),
                    onStrokeEnd: () => context.read<BookingBloc>().add(EndSignatureStrokeEvent()),
                    onClear: () => context.read<BookingBloc>().add(ClearSignatureEvent()),
                  ),

                  const SizedBox(height: 30),

                  // Submit Booking Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      icon: state.status == BookingSubmissionStatus.submitting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.verified_outlined),
                      label: Text(
                        state.status == BookingSubmissionStatus.submitting
                            ? 'Generating Official Allotment...'
                            : 'Generate Provisional Allotment Letter',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryTeal,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: state.status == BookingSubmissionStatus.submitting ? null : () => _submit(context),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.primaryTeal),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primaryDark),
        ),
      ],
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label,
    IconData icon, {
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(fontSize: 13),
      validator: (val) {
        if (val == null || val.trim().isEmpty) return 'This field is required';
        return null;
      },
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        prefixIcon: Icon(icon, size: 18, color: Colors.grey.shade500),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
        ),
      ),
    );
  }

  void _showAllotmentConfirmationDialog(BuildContext context, BookingState state) {
    final booking = state.confirmedBooking;
    if (booking == null) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: AppTheme.successGreen, size: 28),
            SizedBox(width: 10),
            Text('Provisional Allotment Issued!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.primaryTeal.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.primaryTeal.withOpacity(0.2)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Reference: ${booking.bookingReferenceNo}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text('Allottee: ${booking.clientFullName}'),
                    Text('Unit: ${booking.unitNumber} (${booking.towerName})'),
                    Text('Total Value: ${BdtCurrencyFormatter.format(booking.totalContractValue)}'),
                    Text('Earnest Paid: ${BdtCurrencyFormatter.format(booking.earnestMoneyBdt)} via ${booking.paymentMode}'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              const Text('Compliance Checklist:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
              const SizedBox(height: 4),
              const Text('✔ NID Front & Back OCR Verified', style: TextStyle(fontSize: 11, color: AppTheme.successGreen)),
              const Text('✔ On-Glass Digital Signature Attached', style: TextStyle(fontSize: 11, color: AppTheme.successGreen)),
              const Text('✔ Mutex Unit Converted to SOLD Inventory', style: TextStyle(fontSize: 11, color: AppTheme.successGreen)),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context); // back to matrix
            },
            child: const Text('Back to Matrix'),
          ),
          ElevatedButton.icon(
            icon: const Icon(Icons.picture_as_pdf),
            label: const Text('View Allotment Letter'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryTeal,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _viewAllotmentPdfText(context, state.allotmentLetterPdfText ?? '');
            },
          ),
        ],
      ),
    );
  }

  void _viewAllotmentPdfText(BuildContext context, String pdfText) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        height: MediaQuery.of(context).size.height * 0.85,
        padding: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Official Allotment Certificate', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const Divider(),
            Expanded(
              child: SingleChildScrollView(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Text(
                    pdfText,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 11, height: 1.4),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.download),
                label: const Text('Download Official PDF Allotment Letter'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryTeal,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Allotment Certificate downloaded & stored locally!'),
                      backgroundColor: AppTheme.successGreen,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
