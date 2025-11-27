# SafeArms Flutter Frontend

Frontend application for the SafeArms Firearm Management and Forensic Support System.

## Technology Stack

- **Framework**: Flutter Web
- **State Management**: Provider
- **HTTP Client**: http package
- **Local Storage**: shared_preferences
- **2FA**: QR Flutter
- **Charts**: fl_chart

## Prerequisites

- Flutter SDK 3.0.0+
- Google Chrome or other modern web browser

## Setup Instructions

### 1. Install Flutter

Follow the official Flutter installation guide: https://docs.flutter.dev/get-started/install

### 2. Install Dependencies

```bash
cd frontend
flutter pub get
```

### 3. Configure API Endpoint

Edit `lib/services/api_service.dart` and update the `baseUrl`:

```dart
static const String baseUrl = 'http://your-server-ip:3000/api';
```

### 4. Run the Application

Development mode (hot reload):

```bash
flutter run -d chrome
```

Build for production:

```bash
flutter build web
```

The built files will be in `build/web/` directory.

## Project Structure

```
frontend/
├── lib/
│   ├── main.dart                      # App entry point
│   ├── models/
│   │   ├── user.dart                  # User model with roles
│   │   └── unit.dart                  # Unit model
│   ├── providers/
│   │   └── auth_provider.dart         # Authentication state
│   ├── services/
│   │   └── api_service.dart           # HTTP client wrapper
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── login_screen.dart      # Username/password login
│   │   │   ├── two_fa_screen.dart     # 2FA setup & verification
│   │   │   └── unit_confirmation_screen.dart  # Station Commander unit confirmation
│   │   └── dashboards/
│   │       ├── admin_dashboard.dart
│   │       ├── hq_commander_dashboard.dart
│   │       ├── station_commander_dashboard.dart
│   │       ├── forensic_analyst_dashboard.dart
│   │       └── auditor_dashboard.dart
│   └── widgets/
│       └── (reusable components)
├── pubspec.yaml
└── README.md
```

## Authentication Flow

1. **Login**: User enters username and password
2. **2FA Setup** (first time): Scan QR code with authenticator app
3. **2FA Verification**: Enter 6-digit TOTP code
4. **Unit Confirmation** (Station Commanders only): Confirm assigned unit
5. **Dashboard**: Redirected to role-specific dashboard

## User Roles

- **Admin**: System administration, user management
- **HQ Firearm Commander**: National firearm oversight, approvals
- **Station Commander**: Unit-level firearm and custody management
- **Forensic Analyst**: Ballistic analysis, forensic search
- **Auditor**: Read-only compliance monitoring

## Default Test Accounts

See backend README for test account credentials.

## Development Notes

- The application uses Material Design 3
- All API calls are authenticated with JWT tokens
- Tokens are stored in SharedPreferences
- Auto-refresh on token expiration
- Responsive design for different screen sizes

## License

MIT License - Rwanda National Police
