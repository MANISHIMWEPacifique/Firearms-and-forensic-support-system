-- SafeArms Database Schema
-- PostgreSQL 12+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE user_role AS ENUM (
  'ADMIN',
  'HQ_FIREARM_COMMANDER',
  'STATION_COMMANDER',
  'FORENSIC_ANALYST',
  'AUDITOR'
);

CREATE TYPE unit_type AS ENUM (
  'HEADQUARTERS',
  'POLICE_STATION',
  'TRAINING_SCHOOL',
  'SPECIAL_UNIT'
);

CREATE TYPE firearm_status AS ENUM (
  'UNASSIGNED',
  'ASSIGNED',
  'IN_CUSTODY',
  'LOST',
  'DESTROYED',
  'UNDER_MAINTENANCE'
);

CREATE TYPE registration_level AS ENUM (
  'HQ',
  'STATION'
);

CREATE TYPE custody_type AS ENUM (
  'PERMANENT',
  'TEMPORARY',
  'PERSONAL'
);

CREATE TYPE custody_action AS ENUM (
  'ASSIGNED',
  'RETURNED',
  'TRANSFERRED'
);

CREATE TYPE lifecycle_event_type AS ENUM (
  'LOSS_REPORT',
  'DESTRUCTION_REQUEST',
  'PROCUREMENT_REQUEST'
);

CREATE TYPE event_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE anomaly_type AS ENUM (
  'RAPID_EXCHANGE',
  'UNUSUAL_PATTERN',
  'UNAUTHORIZED_ACCESS',
  'PROLONGED_ABSENCE',
  'FREQUENT_TRANSFERS'
);

CREATE TYPE anomaly_status AS ENUM (
  'DETECTED',
  'REVIEWED',
  'RESOLVED',
  'FALSE_POSITIVE'
);

-- =====================================================
-- TABLES
-- =====================================================

-- Units (Police Stations, HQ, Training Schools, Special Units)
CREATE TABLE units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  unit_type unit_type NOT NULL,
  location VARCHAR(255),
  commander_name VARCHAR(255),
  contact_phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (System users with role-based access)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  unit_confirmed BOOLEAN DEFAULT FALSE, -- Only for Station Commanders
  totp_secret VARCHAR(255), -- For 2FA
  totp_enabled BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Officers (Personnel who can be assigned firearms)
CREATE TABLE officers (
  id SERIAL PRIMARY KEY,
  badge_number VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  rank VARCHAR(100),
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  date_joined DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Firearms (Weapon registry)
CREATE TABLE firearms (
  id SERIAL PRIMARY KEY,
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  manufacturer VARCHAR(255) NOT NULL,
  model VARCHAR(255) NOT NULL,
  firearm_type VARCHAR(100) NOT NULL, -- Pistol, Rifle, Shotgun, etc.
  caliber VARCHAR(50),
  status firearm_status DEFAULT 'UNASSIGNED',
  registration_level registration_level NOT NULL,
  registered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  procurement_date DATE,
  last_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ballistic Profiles (Forensic characteristics)
CREATE TABLE ballistic_profiles (
  id SERIAL PRIMARY KEY,
  firearm_id INTEGER REFERENCES firearms(id) ON DELETE CASCADE UNIQUE,
  rifling_pattern TEXT,
  twist_rate VARCHAR(50),
  groove_count INTEGER,
  firing_pin_shape VARCHAR(100),
  firing_pin_impression TEXT,
  ejector_marks TEXT,
  extractor_marks TEXT,
  breach_face_marks TEXT,
  other_characteristics TEXT,
  test_fired_date DATE,
  analyst_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custody Assignments (Current and historical firearm assignments)
CREATE TABLE custody_assignments (
  id SERIAL PRIMARY KEY,
  firearm_id INTEGER REFERENCES firearms(id) ON DELETE CASCADE,
  officer_id INTEGER REFERENCES officers(id) ON DELETE SET NULL,
  custody_type custody_type NOT NULL,
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP,
  expected_return_date TIMESTAMP, -- For temporary custody
  is_active BOOLEAN DEFAULT TRUE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  returned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Custody Logs (Immutable audit trail of all custody movements)
CREATE TABLE custody_logs (
  id SERIAL PRIMARY KEY,
  firearm_id INTEGER REFERENCES firearms(id) ON DELETE CASCADE,
  officer_id INTEGER REFERENCES officers(id) ON DELETE SET NULL,
  action custody_action NOT NULL,
  custody_type custody_type,
  performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Lifecycle Events (Loss, Destruction, Procurement)
CREATE TABLE lifecycle_events (
  id SERIAL PRIMARY KEY,
  firearm_id INTEGER REFERENCES firearms(id) ON DELETE SET NULL,
  event_type lifecycle_event_type NOT NULL,
  status event_status DEFAULT 'PENDING',
  requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  request_details TEXT,
  approval_comments TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Anomalies (ML-detected suspicious patterns)
CREATE TABLE anomalies (
  id SERIAL PRIMARY KEY,
  firearm_id INTEGER REFERENCES firearms(id) ON DELETE SET NULL,
  officer_id INTEGER REFERENCES officers(id) ON DELETE SET NULL,
  anomaly_type anomaly_type NOT NULL,
  anomaly_score NUMERIC(5,2), -- 0.00 to 100.00
  explanation TEXT,
  context_data JSONB, -- Store related custody logs, patterns, etc.
  status anomaly_status DEFAULT 'DETECTED',
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  resolution_notes TEXT,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs (Security and accountability trail)
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100), -- 'firearm', 'user', 'custody', etc.
  resource_id INTEGER,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_unit ON users(unit_id);

CREATE INDEX idx_officers_badge ON officers(badge_number);
CREATE INDEX idx_officers_unit ON officers(unit_id);

CREATE INDEX idx_firearms_serial ON firearms(serial_number);
CREATE INDEX idx_firearms_status ON firearms(status);
CREATE INDEX idx_firearms_unit ON firearms(assigned_unit_id);

CREATE INDEX idx_custody_assignments_firearm ON custody_assignments(firearm_id);
CREATE INDEX idx_custody_assignments_officer ON custody_assignments(officer_id);
CREATE INDEX idx_custody_assignments_active ON custody_assignments(is_active);

CREATE INDEX idx_custody_logs_firearm ON custody_logs(firearm_id);
CREATE INDEX idx_custody_logs_officer ON custody_logs(officer_id);
CREATE INDEX idx_custody_logs_timestamp ON custody_logs(timestamp);

CREATE INDEX idx_lifecycle_events_status ON lifecycle_events(status);
CREATE INDEX idx_lifecycle_events_type ON lifecycle_events(event_type);

CREATE INDEX idx_anomalies_status ON anomalies(status);
CREATE INDEX idx_anomalies_firearm ON anomalies(firearm_id);
CREATE INDEX idx_anomalies_detected ON anomalies(detected_at);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- =====================================================
-- TRIGGERS for automatic timestamp updates
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_officers_updated_at BEFORE UPDATE ON officers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_firearms_updated_at BEFORE UPDATE ON firearms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ballistic_profiles_updated_at BEFORE UPDATE ON ballistic_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
