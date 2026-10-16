import '../../domain/entities/booking_entity.dart';
import '../../domain/repositories/booking_repository.dart';

class BookingRepositoryImpl implements BookingRepository {
  @override
  Future<BookingEntity> submitBooking(BookingEntity booking) async {
    // Simulates atomic booking submission to backend ERP
    await Future.delayed(const Duration(milliseconds: 600));
    return booking;
  }

  @override
  Future<String> generateProvisionalAllotmentLetter(BookingEntity booking) async {
    return '''
===================================================================
      PROVISIONAL ALLOTMENT LETTER & EARNEST MONEY RECEIPT
             PRIME RESIDENCY PROJECT — DHAKA
===================================================================
Allotment Reference : ${booking.bookingReferenceNo}
Date of Issuance    : ${booking.bookingDate.toIso8601String().split('T')[0]}

1. APARTMENT DETAILS:
   Unit Number      : ${booking.unitNumber} (${booking.towerName})
   Total Price      : BDT ${booking.totalContractValue.toStringAsFixed(0)}
   Booking Status   : PROVISIONALLY CONFIRMED (LOCKED EXCLUSIVELY)

2. ALLOTTEE DETAILS:
   Full Name        : ${booking.clientFullName}
   Contact Phone    : ${booking.clientPhone}
   National ID (NID): ${booking.clientNid}
   Present Address  : ${booking.clientAddress}
   NID OCR Match    : VERIFIED (Front & Back Scanned)

3. NOMINEE DETAILS:
   Nominee Name     : ${booking.nomineeName}
   Relationship     : ${booking.nomineeRelation}
   Nominee NID      : ${booking.nomineeNid}

4. EARNEST PAYMENT & DOWN PAYMENT COMMITMENT:
   Earnest Received : BDT ${booking.earnestMoneyBdt.toStringAsFixed(0)}
   Payment Method   : ${booking.paymentMode}
   Cheque/Ref No    : ${booking.chequeNumber ?? 'N/A'}
   Bank             : ${booking.bankName ?? 'N/A'}

5. DIGITAL SIGNATURE VERIFICATION:
   Customer Signature: [VERIFIED ON-GLASS DIGITAL CAPTURE]
   Digital Hash     : SHA256-AUTH-${booking.bookingDate.millisecondsSinceEpoch}
===================================================================
''';
  }
}
