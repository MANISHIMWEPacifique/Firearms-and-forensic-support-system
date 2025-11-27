import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/two_fa_screen.dart';
import 'screens/auth/unit_confirmation_screen.dart';
import 'screens/dashboards/admin_dashboard.dart';
import 'screens/dashboards/hq_commander_dashboard.dart';
import 'screens/dashboards/station_commander_dashboard.dart';
import 'screens/dashboards/forensic_analyst_dashboard.dart';
import 'screens/dashboards/auditor_dashboard.dart';
import 'models/user.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final authProvider = AuthProvider();
  await authProvider.init();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: authProvider),
      ],
      child: const SafeArmsApp(),
    ),
  );
}

class SafeArmsApp extends StatelessWidget {
  const SafeArmsApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SafeArms - Firearm Management System',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1565C0), // Police blue
          brightness: Brightness.light,
        ),
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 0,
        ),
        cardTheme: CardTheme(
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          filled: true,
          fillColor: Colors.grey[50],
        ),
      ),
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        // Show loading indicator while initializing
        if (authProvider.isLoading) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        // Check if user is authenticated
        if (!authProvider.isAuthenticated) {
          // Check 2FA flow states
          if (authProvider.requires2FASetup || authProvider.requires2FA) {
            return const TwoFAScreen();
          }
          
          // Default to login screen
          return const LoginScreen();
        }

        // User is authenticated
        final user = authProvider.currentUser!;

        // Station Commander must confirm unit
        if (user.role == UserRole.stationCommander && !user.unitConfirmed) {
          return const UnitConfirmationScreen();
        }

        // Navigate to role-specific dashboard
        return _getDashboardForRole(user.role);
      },
    );
  }

  Widget _getDashboardForRole(UserRole role) {
    switch (role) {
      case UserRole.admin:
        return const AdminDashboard();
      case UserRole.hqFirearmCommander:
        return const HQCommanderDashboard();
      case UserRole.stationCommander:
        return const StationCommanderDashboard();
      case UserRole.forensicAnalyst:
        return const ForensicAnalystDashboard();
      case UserRole.auditor:
        return const AuditorDashboard();
    }
  }
}
