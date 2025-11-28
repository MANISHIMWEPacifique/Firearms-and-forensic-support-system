# SafeArms - Firearm Management and Forensic Support System

A comprehensive digital platform designed to strengthen firearm accountability, traceability, and operational oversight within the Rwanda National Police.

## Overview

SafeArms digitizes and centralizes:
- **Dual-Level Firearm Registration** (HQ creates, Station assigns)
- **Ballistic Profiling** (forensic characteristics with search)
- **Custody Management** (permanent, temporary, personal assignments)
- **Lifecycle Workflows** (loss reporting, destruction, procurement with HQ approval)
- **Forensic Search** (cross-unit investigation support)
- **Audit Logging** (complete accountability trail)
- **Anomaly Detection** (ML.js-based - Phase 3)

## System Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Flutter Web    │─────▶│  Node.js API    │─────▶│   PostgreSQL    │
│   Frontend      │◀─────│     Backend     │◀─────│    Database     │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                │
                                ▼
                         ┌────────────────┐
                         │    ML.js       │
                         │Anomaly Detection│
                         │   (Phase 3)    │
                         └────────────────┘
```

## Technology Stack

### Backend
- Node.js + Express.js
- PostgreSQL database (11 tables)
- JWT + TOTP 2FA authentication
- Bcrypt password hashing
- Database transactions for data integrity
- Comprehensive audit logging

### Frontend
- Flutter Web
- Provider state management
- Material Design 3
- QR code 2FA support

### Security
- Role-based access control (RBAC)
- Two-factor authentication (TOTP)
- Encrypted data storage
- Immutable audit trails

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | User management, system configuration |
| **HQ Firearm Commander** | National oversight, HQ firearm registration, approval workflows |
| **Station Commander** | Unit firearm assignment, custody management, lifecycle requests |
| **Forensic Analyst** | Ballistic search, custody timelines, investigations |
| **Auditor** | Read-only compliance monitoring |

## Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Flutter SDK 3.0+

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
psql -U postgres -c "CREATE DATABASE safearms_db;"
psql -U safearms_user -d safearms_db -f src/database/schema.sql
psql -U safearms_user -d safearms_db -f src/database/seed.sql
npm run dev
```

### Frontend Setup

```bash
cd frontend
flutter pub get
# Edit lib/services/api_service.dart to set API URL
flutter run -d chrome
```

## Project Structure

```
Firearms2-and-forensic-support-system/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Business logic (11 controllers)
│   │   ├── middleware/      # Auth, validation, audit
│   │   ├── routes/          # API endpoints (37 endpoints)
│   │   ├── database/        # SQL schema & seeds
│   │   └── server.js        # Express app
│   └── package.json
│
├── frontend/
│   ├── lib/
│   │   ├── models/          # Data models (7 models)
│   │   ├── providers/       # State management
│   │   ├── services/        # API client
│   │   ├── screens/         # UI pages (13+ screens)
│   │   └── main.dart
│   └── pubspec.yaml
│
└── README.md
```

## Implementation Progress

### ✅ Phase 1: Core Foundation (COMPLETE)
- ✅ Authentication with TOTP 2FA
- ✅ Role-based access control
- ✅ User management
- ✅ Unit management
- ✅ PostgreSQL schema (11 tables)
- ✅ Audit logging

### ✅ Phase 2: Firearm & Custody Management (COMPLETE)
- ✅ Dual-level firearm registration (HQ + Station)
- ✅ Ballistic profile storage and forensic search
- ✅ Officer management
- ✅ Custody operations (assign/return/transfer)
- ✅ Lifecycle workflows (loss/destruction/procurement)
- ✅ HQ approval system

### 🔄 Phase 3: Forensic & Advanced Features (PLANNED)
- ML.js anomaly detection
- Enhanced forensic analyst tools
- Cross-unit custody timeline visualization
- Compliance reporting dashboards
- Advanced analytics

## API Endpoints (37 Total)

### Authentication (5 endpoints)
- POST `/api/auth/login` - Username/password login
- POST `/api/auth/setup-2fa` - Generate TOTP QR code
- POST `/api/auth/verify-2fa` - Verify TOTP code
- POST `/api/auth/refresh` - Refresh access token
- POST `/api/auth/logout` - Logout

### Users (5 endpoints)
- GET `/api/users` - List users (Admin)
- GET `/api/users/:id` - Get user details
- POST `/api/users` - Create user (Admin)
- PUT `/api/users/:id` - Update user (Admin)
- POST `/api/users/confirm-unit` - Confirm unit (Station Commander)

### Units (5 endpoints)
- GET `/api/units` - List all units
- GET `/api/units/:id` - Get unit details
- POST `/api/units` - Create unit (Admin, HQ Commander)
- PUT `/api/units/:id` - Update unit
- GET `/api/units/:id/personnel` - Get unit personnel

### Firearms (9 endpoints)
- POST `/api/firearms/register/hq` - Register at HQ (HQ Commander)
- POST `/api/firearms/register/station` - Assign to station (Station Commander)
- GET `/api/firearms` - List firearms (role-filtered)
- GET `/api/firearms/:id` - Get firearm details
- PUT `/api/firearms/:id` - Update firearm
- GET `/api/firearms/:id/history` - Get custody/lifecycle history
- POST `/api/firearms/:id/ballistics` - Add ballistic profile (HQ Commander)
- GET `/api/firearms/:id/ballistics` - Get ballistic profile
- GET `/api/firearms/search/ballistics` - Forensic search (Forensic Analyst)

### Officers (5 endpoints)
- GET `/api/officers` - List officers (role-filtered)
- GET `/api/officers/:id` - Get officer details
- POST `/api/officers` - Create officer
- PUT `/api/officers/:id` - Update officer
- GET `/api/officers/:id/firearms` - Get officer firearm history

### Custody (5 endpoints)
- POST `/api/custody/assign` - Assign custody to officer
- POST `/api/custody/:id/return` - Return firearm
- POST `/api/custody/:id/transfer` - Transfer between officers
- GET `/api/custody` - List custody assignments
- GET `/api/custody/timeline/:firearmId` - Get custody timeline (Forensic)

### Lifecycle (4 endpoints)
- POST `/api/lifecycle/loss` - Report loss (Station Commander)
- POST `/api/lifecycle/destruction` - Request destruction (Station Commander)
- POST `/api/lifecycle/procurement` - Request procurement (Station Commander)
- POST `/api/lifecycle/:id/review` - Approve/reject (HQ Commander)

## Default Test Accounts

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Password123!` | Admin |
| `hq_commander` | `Password123!` | HQ Firearm Commander |
| `station_kicukiro` | `Password123!` | Station Commander |
| `forensic_analyst` | `Password123!` | Forensic Analyst |
| `auditor` | `Password123!` | Auditor |

⚠️ **Change these passwords in production!**

## Database Schema

**11 Tables:**
- `users` - System users with roles
- `units` - Police stations and units
- `firearms` - Firearm registry
- `ballistic_profiles` - Forensic characteristics
- `officers` - Police personnel
- `custody_assignments` - Active/historical custody
- `custody_logs` - Immutable audit trail
- `lifecycle_events` - Loss/destruction/procurement requests
- `anomalies` - ML anomaly detection results (Phase 3)
- `audit_logs` - System-wide activity logging

## Documentation

- [Backend API Documentation](./backend/README.md)
- [Frontend Setup Guide](./frontend/README.md)
- [Implementation Plan](./.gemini/antigravity/brain/d6307b6b-3543-4cee-a5b5-652166afbac2/implementation_plan.md)
- [Development Walkthrough](./.gemini/antigravity/brain/d6307b6b-3543-4cee-a5b5-652166afbac2/walkthrough.md)

## Key Features

### Security
✅ Two-factor authentication (TOTP)  
✅ Password hashing (bcrypt)  
✅ JWT token-based authentication  
✅ Role-based access control  
✅ Automatic audit logging  
✅ Database transactions for integrity  

### Firearm Management
✅ Dual-level registration (HQ creates, Station assigns)  
✅ Status tracking (UNASSIGNED → ASSIGNED → IN_CUSTODY → LOST/DESTROYED)  
✅ Ballistic profile storage  
✅ Forensic search by ballistic characteristics  
✅ Complete history tracking  

### Custody Management
✅ Three custody types (PERMANENT, TEMPORARY, PERSONAL)  
✅ Assign/return/transfer operations  
✅ Automatic audit trail  
✅ Custody timeline for investigations  

### Lifecycle Workflows
✅ Loss reporting with HQ approval  
✅ Destruction requests with approval  
✅ Procurement requests with approval  
✅ Automatic firearm status updates  

## Deployment

**Target Environment**: On-premises intranet server at Rwanda National Police Headquarters

### Production Checklist
- [ ] Update all default passwords
- [ ] Configure PostgreSQL with production credentials
- [ ] Set strong JWT secrets and encryption keys
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules (intranet only)
- [ ] Set up automated database backups
- [ ] Configure logging and monitoring
- [ ] Review and test all approval workflows
- [ ] Conduct security audit
- [ ] Train administrators and users

## Development Status

**Current Status:** Phase 2 Complete ✅

- **23 backend files** created
- **13 frontend files** created
- **37 API endpoints** operational
- **11 database tables** with complete schema
- **Production-ready** backend with transactions and audit logging

## License

MIT License - Rwanda National Police

## Support

For technical support or questions, contact the SafeArms development team.

---

**Built for the Rwanda National Police** 🇷🇼  
*Enhancing firearm accountability, traceability, and operational oversight*
