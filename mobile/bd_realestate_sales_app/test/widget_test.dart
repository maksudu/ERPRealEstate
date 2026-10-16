import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:bd_realestate_sales_app/presentation/bloc/calculator/emi_calculator_bloc.dart';
import 'package:bd_realestate_sales_app/presentation/bloc/calculator/emi_calculator_event.dart';
import 'package:bd_realestate_sales_app/presentation/bloc/booking/booking_bloc.dart';
import 'package:bd_realestate_sales_app/presentation/bloc/booking/booking_event.dart';
import 'package:bd_realestate_sales_app/presentation/bloc/booking/booking_state.dart';
import 'package:bd_realestate_sales_app/domain/entities/booking_entity.dart';
import 'package:bd_realestate_sales_app/domain/usecases/submit_booking_usecase.dart';
import 'package:bd_realestate_sales_app/data/repositories/booking_repository_impl.dart';
import 'package:bd_realestate_sales_app/presentation/bloc/unit_matrix/unit_matrix_bloc.dart';
import 'package:bd_realestate_sales_app/presentation/bloc/unit_matrix/unit_matrix_event.dart';
import 'package:bd_realestate_sales_app/presentation/bloc/unit_matrix/unit_matrix_state.dart';
import 'package:bd_realestate_sales_app/domain/entities/unit_entity.dart';
import 'package:bd_realestate_sales_app/core/network/api_client.dart';
import 'package:bd_realestate_sales_app/core/network/websocket_client.dart';
import 'package:bd_realestate_sales_app/data/datasources/inventory_remote_datasource.dart';
import 'package:bd_realestate_sales_app/data/repositories/inventory_repository_impl.dart';
import 'package:bd_realestate_sales_app/domain/usecases/get_units_usecase.dart';
import 'package:bd_realestate_sales_app/domain/usecases/lock_unit_usecase.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('BD Real Estate Sales App Clean Architecture Tests', () {
    test('UnitMatrixBloc loads units and executes 15-minute distributed mutex lock', () async {
      final apiClient = ApiClient();
      final webSocketClient = InventoryWebSocketClient();
      final invDs = InventoryRemoteDataSourceImpl(apiClient: apiClient, webSocketClient: webSocketClient);
      final invRepo = InventoryRepositoryImpl(remoteDataSource: invDs);

      final bloc = UnitMatrixBloc(
        getUnitsUseCase: GetUnitsUseCase(invRepo),
        lockUnitUseCase: LockUnitUseCase(invRepo),
        inventoryRepository: invRepo,
        enableCountdownTimer: false,
      );

      bloc.add(LoadUnitsEvent(towerName: 'Tower A'));
      await Future.delayed(const Duration(milliseconds: 100));

      expect(bloc.state.status, UnitMatrixStatus.loaded);
      expect(bloc.state.units.isNotEmpty, isTrue);

      final availableUnit = bloc.state.units.firstWhere((u) => u.status == UnitGridStatus.available);
      bloc.add(LockUnitEvent(unit: availableUnit, userName: 'Field Rep Test'));
      await Future.delayed(const Duration(milliseconds: 100));

      final lockedUnit = bloc.state.units.firstWhere((u) => u.id == availableUnit.id);
      expect(lockedUnit.status, UnitGridStatus.onHold);
      expect(lockedUnit.isLockActive, isTrue);

      await bloc.close();
      webSocketClient.dispose();
    });

    test('EMI Calculator BLoC computes 30% down payment and 36 months tenure correctly', () async {
      final bloc = EmiCalculatorBloc();
      bloc.add(InitializeEmiCalculatorEvent(flatPrice: 10000000.0, unitNumber: '4B'));
      await Future.delayed(Duration.zero);

      bloc.add(UpdateDownPaymentPercentEvent(30.0));
      await Future.delayed(Duration.zero);

      bloc.add(UpdateTenureMonthsEvent(36.0));
      await Future.delayed(Duration.zero);

      expect(bloc.state.flatPrice, 10000000.0);
      expect(bloc.state.downPaymentTotal, 3000000.0);
      expect(bloc.state.netDownPaymentPayable, 2500000.0);
      expect(bloc.state.remainingBalance, 7000000.0);
      expect(bloc.state.monthlyInstallment, closeTo(194444.44, 0.1));
      await bloc.close();
    });

    test('Booking BLoC captures NID and executes digital booking', () async {
      final repo = BookingRepositoryImpl();
      final useCase = SubmitBookingUseCase(repo);
      final bloc = BookingBloc(submitBookingUseCase: useCase);

      bloc.add(InitializeBookingEvent(
        unitId: 102,
        unitNumber: '1B',
        towerName: 'Tower A',
        totalContractValue: 12500000.0,
      ));
      bloc.add(CaptureNidFrontEvent());
      bloc.add(CaptureNidBackEvent());
      bloc.add(AddSignaturePointEvent(DigitalSignaturePoint(50.0, 50.0)));
      bloc.add(AddSignaturePointEvent(DigitalSignaturePoint(60.0, 60.0)));
      bloc.add(EndSignatureStrokeEvent());

      await Future.delayed(Duration.zero);

      expect(bloc.state.frontNidCaptured, isTrue);
      expect(bloc.state.backNidCaptured, isTrue);
      expect(bloc.state.hasValidSignature, isTrue);

      bloc.add(SubmitBookingFormEvent(
        clientFullName: 'Engr. Mahbubur Rahman',
        clientPhone: '+8801711223344',
        clientNid: '19852691234567890',
        clientAddress: 'Gulshan-2, Dhaka',
        nomineeName: 'Nusrat Rahman',
        nomineeRelation: 'Spouse',
        nomineeNid: '19892699876543210',
        earnestMoneyBdt: 500000.0,
        paymentMode: 'Pay Order',
      ));

      await Future.delayed(const Duration(milliseconds: 700));

      expect(bloc.state.status, BookingSubmissionStatus.success);
      expect(bloc.state.confirmedBooking, isNotNull);
      expect(bloc.state.confirmedBooking?.unitNumber, '1B');
      expect(bloc.state.allotmentLetterPdfText, contains('PROVISIONAL ALLOTMENT LETTER'));

      await bloc.close();
    });
  });
}
