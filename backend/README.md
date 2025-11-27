# SafeArms Backend - Phase 2 Complete ✅

## New API Endpoints

### Firearms (`/api/firearms`)
- `POST /register/hq` - Register firearm at HQ with ballistic profile (HQ Commander)
- `POST /register/station` - Assign firearm to station (Station Commander)
- `GET /` - List firearms (role-based filtering)
- `GET /:id` - Get firearm details
- `PUT /:id` - Update firearm
- `GET /:id/history` - Get custody and lifecycle history
- `POST /:firearmId/ballistics` - Add/update ballistic profile (HQ Commander)
- `GET /:firearmId/ballistics` - Get ballistic profile (HQ Commander, Forensic Analyst)
- `GET /search/ballistics` - Search by ballistic characteristics (Forensic Analyst)

### Officers (`/api/officers`)
- `GET /` - List officers (role-based filtering)
- `GET /:id` - Get officer details
- `POST /` - Create officer (Station Commander, HQ Commander)
- `PUT /:id` - Update officer
- `GET /:id/firearms` - Get officer firearm history

### Custody (`/api/custody`)
- `POST /assign` - Assign firearm to officer (Station Commander, HQ Commander)
- `POST /:assignmentId/return` - Return firearm
- `POST /:assignmentId/transfer` - Transfer custody between officers
- `GET /` - List custody assignments
- `GET /timeline/:firearmId` - Get custody timeline (Forensic Analyst, HQ Commander, Auditor)

### Lifecycle (`/api/lifecycle`)
- `POST /loss` - Report firearm loss (Station Commander)
- `POST /destruction` - Request firearm destruction (Station Commander)
- `POST /procurement` - Request firearm procurement (Station Commander)
- `GET /` - List lifecycle events
- `POST /:eventId/review` - Approve/reject event (HQ Commander)

## Test with cURL

```bash
# Login and get token
TOKEN="your_jwt_token_here"

# Register firearm at HQ
curl -X POST http://localhost:3000/api/firearms/register/hq \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serialNumber": "RNP-2024-001",
    "manufacturer": "Glock",
    "model": "19 Gen5",
    "firearmType": "Pistol",
    "caliber": "9mm",
    "ballisticProfile": {
      "riflingPattern": "Right twist polygonal",
      "twistRate": "1:10",
      "grooveCount": 0,
      "analystName": "Dr. Niyonzima"
    }
  }'

# Assign firearm to station
curl -X POST http://localhost:3000/api/firearms/register/station \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"serialNumber": "RNP-2024-001"}'

# Create officer
curl -X POST http://localhost:3000/api/officers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "badgeNumber": "RNP005001",
    "fullName": "Corporal John Doe",
    "rank": "Corporal",
    "unitId": 2
  }'

# Assign custody
curl -X POST http://localhost:3000/api/custody/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firearmId": 1,
    "officerId": 8,
    "custodyType": "PERMANENT"
  }'
```

## Database Tables Used
- `firearms` - Firearm registry
- `ballistic_profiles` - Forensic characteristics
- `officers` - Police personnel
- `custody_assignments` - Active and historical assignments
- `custody_logs` - Immutable custody audit trail
- `lifecycle_events` - Loss/destruction/procurement requests

**Phase 2 backend complete!** Ready for frontend integration.
