import '../entities/booking_entity.dart';

abstract class BookingRepository {
  Future<BookingEntity> submitBooking(BookingEntity booking);
  Future<String> generateProvisionalAllotmentLetter(BookingEntity booking);
}
