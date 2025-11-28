# SafeArms Frontend

Frontend application for the SafeArms Firearm Management and Forensic Support System.

## Technology Stack

- **Framework**: Flutter Web
- **State Management**: Provider
- **HTTP Client**: http package
- **Local Storage**: shared_preferences
- **2FA**: QR Flutter
- **Charts**: fl_chart (for Phase 3 analytics)

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

For local development:
```dart
static const String baseUrl = 'http://localhost:3000/api';
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
│   ├── main.dart                      # App entry point with auth wrapper
│   ├── models/                        # Data models (7 models)
│   │   ├── user.dart                  # User model with UserRole enum
│   │   ├── unit.dart                  # Unit model with UnitType enum
│   │   ├── firearm.dart               # Firearm with status/level enums
│   │   ├── officer.dart               # Officer/personnel model
│   │   ├── custody_assignment.dart    # Custody with CustodyType enum
│   │   └── lifecycle_event.dart       # Lifecycle events with status
│   ├── providers/
│   │   └── auth_provider.dart         # Authentication state management
│   ├── services/
│   │   └── api_service.dart           # HTTP client with JWT handling
│   ├── screens/
│   │   ├── auth/                      # Authentication screens
│   │   │   ├── login_screen.dart      # Username/password login
│   │   │   ├── two_fa_screen.dart     # 2FA setup & verification
│   │   │   └── unit_confirmation_screen.dart
│   │   └── dashboards/                # Role-specific dashboards
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

## Data Models

### Phase 1 Models
- **User** - System users with role enum (ADMIN, HQ_FIREARM_COMMANDER, STATION_COMMANDER, FORENSIC_ANALYST, AUDITOR)
- **Unit** - Police units with type enum (HEADQUARTERS, POLICE_STATION, TRAINING_SCHOOL, SPECIAL_UNIT)

### Phase 2 Models
- **Firearm** - Firearm registry with status (UNASSIGNED, ASSIGNED, IN_CUSTODY, LOST, DESTROYED, UNDER_MAINTENANCE)
- **Officer** - Police personnel with active firearms count
- **CustodyAssignment** - Custody tracking with type (PERMANENT, TEMPORARY, PERSONAL)
- **LifecycleEvent** - Loss/destruction/procurement requests with approval status (PENDING, APPROVED, REJECTED)

## Authentication Flow

1. **Login**: User enters username and password
2. **2FA Setup** (first time): Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
3. **2FA Verification**: Enter 6-digit TOTP code
4. **Unit Confirmation** (Station Commanders only): Confirm assigned police unit
5. **Dashboard**: Redirected to role-specific dashboard

## User Roles & Features

### Admin
- User management (create, update, deactivate)
- Unit management (create, update)
- System configuration
- Audit log access

### HQ Firearm Commander
- Register firearms at HQ with ballistic profiles
- Approve/reject lifecycle events (loss, destruction, procurement)
- National firearm oversight
- View all units and firearms

### Station Commander
- Assign firearms to unit
- Manage officers
- Assign/return/transfer custody
- Request loss/destruction/procurement
- View unit-specific data only

### Forensic Analyst
- Search firearms by ballistic characteristics
- View custody timelines
- Access ballistic profiles
- Cross-unit investigation support
- Read-only access

### Auditor
- System-wide compliance monitoring
- View audit logs
- Generate reports
- Read-only access

## Phase 2 Features (Implemented)

### Firearm Management
✅ Dual-level registration (HQ + Station)  
✅ Ballistic profile integration  
✅ Status tracking  
✅ Complete history view  

### Custody Operations
✅ Assign custody (permanent/temporary/personal)  
✅ Return firearms  
✅ Transfer between officers  
✅ View active assignments  

### Lifecycle Workflows
✅ Report firearm loss  
✅ Request destruction  
✅ Request procurement  
✅ HQ approval interface  

### Officer Management
✅ Create/update officers  
✅ View officer firearm history  
✅ Track active assignments  

## API Integration

All API calls use the `ApiService` singleton which handles:
- JWT token management (access + refresh tokens)
- Automatic authorization headers
- Token refresh on expiration
- Custom exception handling (UnauthorizedException, ForbiddenException, NotFoundException)
- Request/response logging

Example usage:
```dart
final apiService = ApiService();

// GET request
final result = await apiService.get('/firearms');

// POST request with body
final result = await apiService.post('/custody/assign', {
  'firearmId': 1,
  'officerId': 5,
  'custodyType': 'PERMANENT'
});
```

## State Management

Using Provider pattern for:
- **AuthProvider**: Login state, current user, 2FA flow, token management

Future providers (Phase 3):
- FirearmProvider
- CustodyProvider
- OfficerProvider

## Default Test Accounts

See backend README for test account credentials.

**Important**: All test accounts require 2FA setup on first login.

## Development Notes

- Material Design 3 theme with police blue color scheme (#1565C0)
- Responsive design for different screen sizes
- Form validation on all inputs
- Loading states and error handling throughout
- Automatic session persistence with SharedPreferences

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure the backend `.env` file has:
```
CORS_ORIGIN=http://localhost:8080
```
Or the URL where your Flutter web app is hosted.

### Token Expiration
Tokens automatically refresh. If experiencing issues:
1. Clear browser storage
2. Logout and login again
3. Check console for error messages

### 2FA Setup
If 2FA QR code doesn't scan:
1. Use the manual entry key shown below the QR code
2. Ensure authenticator app is set to time-based (TOTP) mode
3. Check system time is synchronized

## Building for Production

```bash
# Build optimized web version
flutter build web --release

# Files will be in build/web/
# Deploy these files to your web server
```

Configure web server to:
- Serve `index.html` for all routes (for Flutter routing)
- Enable HTTPS
- Set appropriate CORS headers
- Configure for intranet-only access

## License

MIT License - Rwanda National Police
