import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../providers/auth_provider.dart';

class TwoFAScreen extends StatefulWidget {
  const TwoFAScreen({Key? key}) : super(key: key);

  @override
  State<TwoFAScreen> createState() => _TwoFAScreenState();
}

class _TwoFAScreenState extends State<TwoFAScreen> {
  final _codeController = TextEditingController();
  String? _qrCodeData;
  String? _manualEntryKey;
  bool _isSetupComplete = false;

  @override
  void initState() {
    super.initState();
    
    // If setup required, fetch QR code
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      if (authProvider.requires2FASetup && !_isSetupComplete) {
        _setup2FA();
      }
    });
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _setup2FA() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    final result = await authProvider.setup2FA();
    
    if (result != null && mounted) {
      setState(() {
        _qrCodeData = result['qrCode'];
        _manualEntryKey = result['manualEntryKey'];
        _isSetupComplete = true;
      });
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.error ?? '2FA setup failed'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _verify2FA() async {
    if (_codeController.text.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a 6-digit code'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    final success = await authProvider.verify2FA(_codeController.text);
    
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.error ?? 'Invalid code'),
          backgroundColor: Colors.red,
        ),
      );
      _codeController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Two-Factor Authentication'),
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Card(
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 500),
              padding: const EdgeInsets.all(32.0),
              child: Consumer<AuthProvider>(
                builder: (context, authProvider, child) {
                  if (authProvider.requires2FASetup) {
                    return _buildSetupView();
                  } else {
                    return _buildVerifyView();
                  }
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSetupView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(
          Icons.qr_code_2,
          size: 60,
          color: Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(height: 16),
        Text(
          'Setup Two-Factor Authentication',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        const Text(
          'Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),

        if (_qrCodeData != null) ...[
          // QR Code
          Center(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: QrImageView(
                data: _qrCodeData!,
                version: QrVersions.auto,
                size: 200,
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Manual entry key
          if (_manualEntryKey != null) ...[
            const Text(
              'Or enter this key manually:',
              style: TextStyle(fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            SelectableText(
              _manualEntryKey!,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
          ],
          const SizedBox(height: 24),

          // Code input field
          TextField(
            controller: _codeController,
            decoration: const InputDecoration(
              labelText: 'Enter 6-digit code',
              prefixIcon: Icon(Icons.pin),
            ),
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 24,
              letterSpacing: 8,
            ),
            onSubmitted: (_) => _verify2FA(),
          ),
          const SizedBox(height: 16),

          // Verify button
          Consumer<AuthProvider>(
            builder: (context, authProvider, child) {
              return ElevatedButton(
                onPressed: authProvider.isLoading ? null : _verify2FA,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: authProvider.isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text('VERIFY & COMPLETE SETUP'),
              );
            },
          ),
        ] else ...[
          const Center(child: CircularProgressIndicator()),
        ],
      ],
    );
  }

  Widget _buildVerifyView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(
          Icons.verified_user,
          size: 60,
          color: Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(height: 16),
        Text(
          'Enter Verification Code',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        const Text(
          'Open your authenticator app and enter the 6-digit code',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),

        // Code input field
        TextField(
          controller: _codeController,
          decoration: const InputDecoration(
            labelText: '6-digit code',
            prefixIcon: Icon(Icons.pin),
          ),
          keyboardType: TextInputType.number,
          maxLength: 6,
          autofocus: true,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 24,
            letterSpacing: 8,
          ),
          onSubmitted: (_) => _verify2FA(),
        ),
        const SizedBox(height: 16),

        // Verify button
        Consumer<AuthProvider>(
          builder: (context, authProvider, child) {
            return ElevatedButton(
              onPressed: authProvider.isLoading ? null : _verify2FA,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: authProvider.isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text('VERIFY'),
            );
          },
        ),
      ],
    );
  }
}
