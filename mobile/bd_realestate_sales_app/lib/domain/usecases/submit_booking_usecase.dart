import '../entities/booking_entity.dart';
import '../repositories/booking_repository.dart';

class SubmitBookingUseCase {
  final BookingRepository repository;

  SubmitBookingUseCase(this.repository);

  Future<BookingEntity> execute(BookingEntity booking) {
    return repository.submitBooking(booking);
  }

  Future<String> generateAllotmentPdf(BookingEntity booking) {
    return repository.generateProvisionalAllotmentLetter(booking);
  }
}
