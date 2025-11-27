# SafeArms - Firearm Management and Forensic Support System

A comprehensive digital platform designed to strengthen firearm accountability, traceability, and operational oversight within the Rwanda National Police.

## Overview

SafeArms digitizes and centralizes:
- **Firearm Registration** (dual-level: HQ and Station)
- **Ballistic Profiling** (forensic characteristics)
- **Custody Management** (permanent, temporary, personal assignments)
- **Lifecycle Workflows** (loss reporting, destruction, procurement)
- **Anomaly Detection** (ML.js-based suspicious pattern identification)
- **Forensic Search** (cross-unit investigation support)
- **Audit Logging** (complete accountability trail)

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
                         └────────────────┘
```

## Technology Stack

### Backend
- Node.js + Express.js
- PostgreSQL database
- JWT + TOTP 2FA authentication
- Bcrypt password hashing
- ML.js for anomaly detection

### Frontend
- Flutter Web
- Provider state management
- Material Design 3

### Security
- Role-based access control (RBAC)
- Two-factor authentication (TOTP)
- Encrypted data storage
- Complete audit logging

## User Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | User management, system configuration |
| **HQ Firearm Commander** | National oversight, firearm registration, approvals |
| **Station Commander** | Unit firearm management, custody assignments |
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
│   │   ├── controllers/     # Business logic
│   │   ├── middleware/      # Auth, validation
│   │   ├── routes/          # API endpoints
│   │   ├── database/        # SQL schema & seeds
│   │   └── server.js        # Express app
│   └── package.json
│
├── frontend/
│   ├── lib/
│   │   ├── models/          # Data models
│   │   ├── providers/       # State management
│   │   ├── services/        # API client
│   │   ├── screens/         # UI pages
│   │   └── main.dart
│   └── pubspec.yaml
│
└── README.md
```

## Key Features

### Phase 1: Core Foundation ✅
- ✅ Authentication with 2FA
- ✅ Role-based access control
- ✅ User management
- ✅ Unit management
- ✅ Database schema

### Phase 2: Firearm & Custody Management (Planned)
- Dual-level firearm registration
- Ballistic profile storage
- Custody assignments (permanent/temporary/personal)
- Approval workflows (loss/destruction/procurement)

### Phase 3: Forensic & Advanced Features (Planned)
- ML.js anomaly detection
- Forensic search capabilities
- Cross-unit custody timelines
- Audit logging & compliance reports

## Default Test Accounts

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Password123!` | Admin |
| `hq_commander` | `Password123!` | HQ Firearm Commander |
| `station_kicukiro` | `Password123!` | Station Commander |
| `forensic_analyst` | `Password123!` | Forensic Analyst |
| `auditor` | `Password123!` | Auditor |

⚠️ **Change these passwords in production!**

## Documentation

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- [Implementation Plan](./.gemini/antigravity/brain/d6307b6b-3543-4cee-a5b5-652166afbac2/implementation_plan.md)

## Deployment

**Target Environment**: On-premises intranet server at Rwanda National Police Headquarters

### Production Checklist
- [ ] Update all default passwords
- [ ] Configure PostgreSQL with production credentials
- [ ] Set strong JWT secrets and encryption keys
- [ ] Enable HTTPS/TLS
- [ ] Configure firewall rules (intranet only)
- [ ] Set up automated backups
- [ ] Configure logging and monitoring

## License

MIT License - Rwanda National Police

## Support

For technical support or questions, contact the SafeArms development team.
