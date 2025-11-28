import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  User? _currentUser;
  bool _isAuthenticated = false;
  bool _isLoading = false;
  String? _error;

  // Login flow state
  bool _requires2FASetup = false;
  bool _requires2FA = false;
  String? _tempToken;
  int? _pendingUserId;

  User? get currentUser => _currentUser;
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get requires2FASetup => _requires2FASetup;
  bool get requires2FA => _requires2FA;

  // Initialize authentication state
  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    await _apiService.init();

    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('currentUser');

    if (userJson != null) {
      try {
        final Map<String, dynamic> userMap =
            jsonDecode(userJson) as Map<String, dynamic>;
        _currentUser = User.fromJson(userMap);
        _isAuthenticated = true;
      } catch (e) {
        await prefs.remove('currentUser');
      }
    }

    _isLoading = false;
    notifyListeners();
  }

  // Step 1: Login with username/password
  Future<bool> login(String username, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _apiService.post('/auth/login', {
        'username': username,
        'password': password,
      }, requiresAuth: false);

      if (result['success'] == true) {
        if (result['requires2FASetup'] == true) {
          _requires2FASetup = true;
          _tempToken = result['tempToken'];
          _pendingUserId = result['userId'];
        } else if (result['requires2FA'] == true) {
          _requires2FA = true;
          _tempToken = result['tempToken'];
          _pendingUserId = result['userId'];
        }

        _isLoading = false;
        notifyListeners();
        return true;
      }

      _error = result['message'] ?? 'Login failed';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Step 2a: Setup 2FA (first time)
  Future<Map<String, dynamic>?> setup2FA() async {
    if (_pendingUserId == null) {
      _error = 'No pending user ID';
      notifyListeners();
      return null;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _apiService.post('/auth/setup-2fa', {
        'userId': _pendingUserId,
      }, requiresAuth: false);

      if (result['success'] == true) {
        _isLoading = false;
        notifyListeners();
        return {
          'qrCode': result['qrCode'],
          'secret': result['secret'],
          'manualEntryKey': result['manualEntryKey'],
        };
      }

      _error = result['message'] ?? '2FA setup failed';
      _isLoading = false;
      notifyListeners();
      return null;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  // Step 2b/3: Verify 2FA code
  Future<bool> verify2FA(String code) async {
    if (_pendingUserId == null) {
      _error = 'No pending user ID';
      notifyListeners();
      return false;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _apiService.post('/auth/verify-2fa', {
        'userId': _pendingUserId,
        'token': code,
      }, requiresAuth: false);

      if (result['success'] == true && result['user'] != null) {
        await _apiService.saveTokens(
          result['accessToken'],
          result['refreshToken'],
        );

        _currentUser = User.fromJson(result['user'] as Map<String, dynamic>);
        _isAuthenticated = true;
        _requires2FA = false;
        _requires2FASetup = false;
        _tempToken = null;
        _pendingUserId = null;

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('currentUser', jsonEncode(result['user']));

        _isLoading = false;
        notifyListeners();
        return true;
      }

      _error = result['message'] ?? '2FA verification failed';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Confirm unit (Station Commander)
  Future<bool> confirmUnit() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _apiService.post('/users/confirm-unit', {
        'confirmed': true,
      });

      if (result['success'] == true && _currentUser != null) {
        // Update user state
        _currentUser = User(
          id: _currentUser!.id,
          username: _currentUser!.username,
          fullName: _currentUser!.fullName,
          role: _currentUser!.role,
          email: _currentUser!.email,
          phone: _currentUser!.phone,
          unitId: _currentUser!.unitId,
          unitName: _currentUser!.unitName,
          unitConfirmed: true,
          isActive: _currentUser!.isActive,
        );

        _isLoading = false;
        notifyListeners();
        return true;
      }

      _error = result['message'] ?? 'Unit confirmation failed';
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Logout
  Future<void> logout() async {
    try {
      await _apiService.post('/auth/logout', {});
    } catch (e) {
      // Ignore errors, logout anyway
    }

    await _apiService.clearTokens();

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('currentUser');

    _currentUser = null;
    _isAuthenticated = false;
    _requires2FA = false;
    _requires2FASetup = false;
    _tempToken = null;
    _pendingUserId = null;
    _error = null;

    notifyListeners();
  }

  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
