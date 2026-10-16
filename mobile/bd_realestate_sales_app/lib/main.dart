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
import 'presentation/screens/home_dashboard_screen.dart';
import 'presentation/screens/unit_matrix_screen.dart';
import 'presentation/screens/lead_manager_screen.dart';
import 'presentation/screens/emi_calculator_screen.dart';

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
    // Default Clean Architecture wiring if not injected
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
        title: 'Real Estate Sales & CRM',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.light,
        home: const MainNavigationShell(),
      ),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeDashboardScreen(
        onNavigateToMatrix: () => setState(() => _currentIndex = 1),
        onNavigateToLeads: () => setState(() => _currentIndex = 2),
        onNavigateToCalculator: () => setState(() => _currentIndex = 3),
      ),
      const UnitMatrixScreen(),
      const LeadManagerScreen(),
      const EmiCalculatorScreen(),
    ];

    return Scaffold(
      body: screens[_currentIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppTheme.primaryTeal,
          unselectedItemColor: Colors.grey.shade500,
          selectedFontSize: 12,
          unselectedFontSize: 12,
          backgroundColor: Colors.white,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard),
              label: 'Dashboard',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.grid_view_outlined),
              activeIcon: Icon(Icons.grid_view_rounded),
              label: 'Flat Matrix',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.people_outline),
              activeIcon: Icon(Icons.people),
              label: 'Leads CRM',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.calculate_outlined),
              activeIcon: Icon(Icons.calculate),
              label: 'Calculator',
            ),
          ],
        ),
      ),
    );
  }
}
