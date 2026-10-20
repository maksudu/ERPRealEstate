import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/network/api_client.dart';
import 'core/network/websocket_client.dart';
import 'core/theme/app_theme.dart';
import 'data/datasources/inventory_remote_datasource.dart';
import 'data/datasources/crm_remote_datasource.dart';
import 'data/repositories/inventory_repository_impl.dart';
import 'data/repositories/crm_repository_impl.dart';
import 'domain/usecases/get_units_usecase.dart';
import 'domain/usecases/lock_unit_usecase.dart';
import 'domain/usecases/crm_usecases.dart';
import 'presentation/bloc/unit_matrix/unit_matrix_bloc.dart';
import 'presentation/bloc/unit_matrix/unit_matrix_event.dart';
import 'presentation/bloc/lead/lead_bloc.dart';
import 'presentation/bloc/lead/lead_event.dart';
import 'presentation/screens/login_screen.dart';
import 'presentation/screens/main_navigation_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const BdRealEstateSalesApp());
}

class BdRealEstateSalesApp extends StatelessWidget {
  final UnitMatrixBloc? unitMatrixBloc;
  final LeadBloc? leadBloc;

  const BdRealEstateSalesApp({
    super.key,
    this.unitMatrixBloc,
    this.leadBloc,
  });

  @override
  Widget build(BuildContext context) {
    final apiClient = ApiClient();
    final webSocketClient = InventoryWebSocketClient();

    final inventoryRemoteDataSource = InventoryRemoteDataSourceImpl(
      apiClient: apiClient,
      webSocketClient: webSocketClient,
    );
    final crmRemoteDataSource = CrmRemoteDataSourceImpl(
      apiClient: apiClient,
      webSocketClient: webSocketClient,
    );

    final inventoryRepository = InventoryRepositoryImpl(
      remoteDataSource: inventoryRemoteDataSource,
    );
    final crmRepository = CrmRepositoryImpl(
      remoteDataSource: crmRemoteDataSource,
    );

    final getUnitsUseCase = GetUnitsUseCase(inventoryRepository);
    final lockUnitUseCase = LockUnitUseCase(inventoryRepository);
    final getLeadsUseCase = GetLeadsUseCase(crmRepository);
    final logCallActivityUseCase = LogCallActivityUseCase(crmRepository);

    return MultiBlocProvider(
      providers: [
        BlocProvider<UnitMatrixBloc>(
          create: (_) => unitMatrixBloc ??
              (UnitMatrixBloc(
                getUnitsUseCase: getUnitsUseCase,
                lockUnitUseCase: lockUnitUseCase,
                inventoryRepository: inventoryRepository,
              )..add(LoadUnitsEvent())),
        ),
        BlocProvider<LeadBloc>(
          create: (_) => leadBloc ??
              (LeadBloc(
                getLeadsUseCase: getLeadsUseCase,
                logCallActivityUseCase: logCallActivityUseCase,
                crmRepository: crmRepository,
              )..add(LoadLeadsEvent())),
        ),
      ],
      child: MaterialApp(
        title: 'BlueOceans Real Estate Sales & CRM',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final _api = ApiClient();
  bool _isLoggedIn = false;

  @override
  void initState() {
    super.initState();
    _isLoggedIn = _api.isAuthenticated;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoggedIn) {
      return const MainNavigationScreen();
    }
    return LoginScreen(
      onLoginSuccess: () {
        setState(() => _isLoggedIn = true);
      },
    );
  }
}
