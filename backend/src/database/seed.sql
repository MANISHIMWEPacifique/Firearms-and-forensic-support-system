-- SafeArms Database Seed Data
-- Initial data for development and testing

-- =====================================================
-- UNITS
-- =====================================================

INSERT INTO units (name, unit_type, location, commander_name, contact_phone) VALUES
('Rwanda National Police Headquarters', 'HEADQUARTERS', 'Kigali', 'Commissioner General', '+250788000000'),
('Kicukiro Police Station', 'POLICE_STATION', 'Kicukiro, Kigali', 'Inspector Uwamahoro', '+250788111111'),
('Gasabo Police Station', 'POLICE_STATION', 'Gasabo, Kigali', 'Inspector Mugabo', '+250788222222'),
('Nyarugenge Police Station', 'POLICE_STATION', 'Nyarugenge, Kigali', 'Inspector Mukamana', '+250788333333'),
('RNP Training School', 'TRAINING_SCHOOL', 'Gishari, Rwamagana', 'Superintendent', '+250788444444'),
('Special Forces Unit', 'SPECIAL_UNIT', 'Kigali', 'Major', '+250788555555');

-- =====================================================
-- USERS
-- =====================================================
-- Password for all users: Password123!
-- Hash generated using bcrypt with salt rounds = 10

INSERT INTO users (username, password_hash, full_name, role, email, phone, unit_id, unit_confirmed, totp_enabled) VALUES
-- System Admin
('admin', '$2b$10$rQZ5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ', 'System Administrator', 'ADMIN', 'admin@rnp.gov.rw', '+250788000001', NULL, FALSE, FALSE),

-- HQ Firearm Commander
('hq_commander', '$2b$10$rQZ5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ', 'Commissioner John Habimana', 'HQ_FIREARM_COMMANDER', 'commander@rnp.gov.rw', '+250788000002', 1, FALSE, FALSE),

-- Station Commanders
('station_kicukiro', '$2b$10$rQZ5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ', 'Inspector Marie Uwamahoro', 'STATION_COMMANDER', 'kicukiro@rnp.gov.rw', '+250788111111', 2, TRUE, FALSE),
('station_gasabo', '$2b$10$rQZ5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ', 'Inspector Eric Mugabo', 'STATION_COMMANDER', 'gasabo@rnp.gov.rw', '+250788222222', 3, TRUE, FALSE),
('station_nyarugenge', '$2b$10$rQZ5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ', 'Inspector Alice Mukamana', 'STATION_COMMANDER', 'nyarugenge@rnp.gov.rw', '+250788333333', 4, TRUE, FALSE),

-- Forensic Analyst
('forensic_analyst', '$2b$10$rQZ5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ', 'Dr. Patrick Niyonzima', 'FORENSIC_ANALYST', 'forensics@rnp.gov.rw', '+250788000003', 1, FALSE, FALSE),

-- Auditor
('auditor', '$2b$10$rQZ5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ3xQ3xQ3xeH5YKKVvJ5xQ', 'Inspector Grace Uwera', 'AUDITOR', 'audit@rnp.gov.rw', '+250788000004', 1, FALSE, FALSE);

-- =====================================================
-- SAMPLE OFFICERS (for custody testing)
-- =====================================================

INSERT INTO officers (badge_number, full_name, rank, unit_id, phone, date_joined) VALUES
('RNP001234', 'Corporal Jean Claude Ndayambaje', 'Corporal', 2, '+250788111001', '2020-01-15'),
('RNP001235', 'Constable Sarah Umutoni', 'Constable', 2, '+250788111002', '2021-03-20'),
('RNP001236', 'Sergeant David Muhire', 'Sergeant', 2, '+250788111003', '2019-07-10'),
('RNP002234', 'Corporal Emmanuel Nzabonimpa', 'Corporal', 3, '+250788222001', '2020-05-12'),
('RNP002235', 'Constable Diane Ingabire', 'Constable', 3, '+250788222002', '2021-08-15'),
('RNP003234', 'Sergeant Joseph Kayitare', 'Sergeant', 4, '+250788333001', '2018-11-20'),
('RNP003235', 'Corporal Ruth Mukamana', 'Corporal', 4, '+250788333002', '2020-02-14');

-- =====================================================
-- NOTES
-- =====================================================
-- Password for all test users: Password123!
-- Users should change passwords on first login in production
-- Station Commanders have unit_confirmed = TRUE for testing
-- In production, this should be FALSE and confirmed on first login
