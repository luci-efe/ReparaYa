-- Migration: Add Contractor Availability Tables
-- Created: 2025-11-23
-- Description: Creates weekly rules, exceptions, and blocks tables for contractor availability management

-- ============================================
-- Table: contractor_weekly_rules
-- ============================================
CREATE TABLE IF NOT EXISTS contractor_weekly_rules (
  id TEXT PRIMARY KEY,
  contractor_profile_id TEXT NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  intervals JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key to contractor_profile
  CONSTRAINT fk_contractor_profile 
    FOREIGN KEY (contractor_profile_id) 
    REFERENCES "ContractorProfile"(id) 
    ON DELETE CASCADE
);

-- Index for fast lookups by contractor and day
CREATE INDEX IF NOT EXISTS idx_weekly_rules_contractor_day 
  ON contractor_weekly_rules(contractor_profile_id, day_of_week);

-- ============================================
-- Table: contractor_availability_exceptions
-- ============================================
CREATE TABLE IF NOT EXISTS contractor_availability_exceptions (
  id TEXT PRIMARY KEY,
  contractor_profile_id TEXT NOT NULL,
  date DATE NOT NULL,
  intervals JSONB NOT NULL DEFAULT '[]'::jsonb,
  type TEXT NOT NULL CHECK (type IN ('AVAILABLE', 'BLOCKED')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key to contractor_profile
  CONSTRAINT fk_contractor_profile_exception 
    FOREIGN KEY (contractor_profile_id) 
    REFERENCES "ContractorProfile"(id) 
    ON DELETE CASCADE,
    
  -- Unique constraint: one exception per contractor per date
  CONSTRAINT unique_contractor_date 
    UNIQUE (contractor_profile_id, date)
);

-- Index for fast date range queries
CREATE INDEX IF NOT EXISTS idx_exceptions_contractor_date 
  ON contractor_availability_exceptions(contractor_profile_id, date);

-- ============================================
-- Table: contractor_availability_blocks
-- ============================================
CREATE TABLE IF NOT EXISTS contractor_availability_blocks (
  id TEXT PRIMARY KEY,
  contractor_profile_id TEXT NOT NULL,
  start_date_time TIMESTAMPTZ NOT NULL,
  end_date_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key to contractor_profile
  CONSTRAINT fk_contractor_profile_block 
    FOREIGN KEY (contractor_profile_id) 
    REFERENCES "ContractorProfile"(id) 
    ON DELETE CASCADE,
    
  -- Check constraint: start must be before end
  CONSTRAINT check_date_range 
    CHECK (start_date_time < end_date_time)
);

-- Index for fast overlap detection
CREATE INDEX IF NOT EXISTS idx_blocks_contractor_range 
  ON contractor_availability_blocks(
    contractor_profile_id, 
    start_date_time, 
    end_date_time
  );

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE contractor_weekly_rules IS 
  'Recurrence rules for contractor availability by day of week (0=Sunday, 6=Saturday)';

COMMENT ON TABLE contractor_availability_exceptions IS 
  'Date-specific overrides to weekly rules (holidays, special hours, closures)';

COMMENT ON TABLE contractor_availability_blocks IS 
  'Ad-hoc blocks for vacations, maintenance, or other time-off periods';

COMMENT ON COLUMN contractor_weekly_rules.intervals IS 
  'JSON array of time intervals: [{"startTime": "09:00", "endTime": "12:00"}, ...]';

COMMENT ON COLUMN contractor_availability_exceptions.type IS 
  'AVAILABLE = override with new hours, BLOCKED = close entire day';

-- ============================================
-- Verification queries (optional - run to test)
-- ============================================

-- Verify tables were created
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_name LIKE 'contractor_availability%' 
--    OR table_name = 'contractor_weekly_rules';

-- Verify foreign keys
-- SELECT 
--   tc.table_name, 
--   kcu.column_name, 
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND tc.table_name LIKE 'contractor_%';
