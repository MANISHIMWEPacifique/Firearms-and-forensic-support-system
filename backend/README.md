# SafeArms Backend

Backend API for the SafeArms Firearm Management and Forensic Support System.

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT + TOTP 2FA (Speakeasy)
- **Security**: Bcrypt, Helmet, CORS

## Prerequisites

- Node.js 16+ and npm
- PostgreSQL 12+

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your configuration:

```bash
cp .env.example .env
```

Edit `.env` and set:
- Database credentials
- JWT secrets (use strong random strings)
- Encryption keys
- CORS origin (frontend URL)

### 3. Database Setup

Create the database and user:

```sql
CREATE DATABASE safearms_db;
CREATE USER safearms_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE safearms_db TO safearms_user;
```

Run the schema:

```bash
psql -U safearms_user -d safearms_db -f src/database/schema.sql
```

Load seed data (development only):

```bash
psql -U safearms_user -d safearms_db -f src/database/seed.sql
```

### 4. Start the Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

### Authentication

- `POST /api/auth/login` - Initial login with username/password
- `POST /api/auth/setup-2fa` - Generate 2FA QR code
- `POST /api/auth/verify-2fa` - Verify TOTP code and get JWT
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (requires auth)

### Users

- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (Admin)
- `PUT /api/users/:id` - Update user (Admin)
- `POST /api/users/confirm-unit` - Confirm assigned unit (Station Commander)
- `POST /api/users/change-password` - Change password

### Units

- `GET /api/units` - Get all units
- `GET /api/units/:id` - Get unit by ID
- `POST /api/units` - Create unit (Admin, HQ Commander)
- `PUT /api/units/:id` - Update unit (Admin, HQ Commander)
- `GET /api/units/:id/personnel` - Get unit personnel

## Default Test Accounts

**Username**: `admin` | **Password**: `Password123!` | **Role**: Admin  
**Username**: `hq_commander` | **Password**: `Password123!` | **Role**: HQ Firearm Commander  
**Username**: `station_kicukiro` | **Password**: `Password123!` | **Role**: Station Commander  
**Username**: `forensic_analyst` | **Password**: `Password123!` | **Role**: Forensic Analyst  
**Username**: `auditor` | **Password**: `Password123!` | **Role**: Auditor

⚠️ **Change these passwords in production!**

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # PostgreSQL connection pool
│   ├── controllers/
│   │   ├── authController.js     # Authentication logic
│   │   ├── userController.js     # User management
│   │   └── unitController.js     # Unit management
│   ├── middleware/
│   │   ├── auth.js              # JWT & RBAC middleware
│   │   └── validator.js         # Input validation
│   ├── routes/
│   │   ├── auth.js              # Auth endpoints
│   │   ├── users.js             # User endpoints
│   │   └── units.js             # Unit endpoints
│   ├── database/
│   │   ├── schema.sql           # Database schema
│   │   └── seed.sql             # Seed data
│   └── server.js                # Express app entry point
├── package.json
├── .env.example
└── .gitignore
```

## Security Features

- **Password Hashing**: Bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **2FA**: TOTP-based two-factor authentication
- **RBAC**: Role-based access control
- **Audit Logging**: All sensitive operations logged
- **Input Validation**: Express-validator on all routes
- **Security Headers**: Helmet middleware

## Development

Run tests:

```bash
npm test
```

Run with auto-reload:

```bash
npm run dev
```

## License

MIT License - Rwanda National Police
