/*
  # IoT Dashboard Schema

  1. New Tables
    - `projects`
      - `project_id` (varchar, primary key) - Unique project identifier (e.g., WP01)
      - `project_name` (text) - Human-readable project name
      - `project_type` (text) - Type: 'water_pump' or 'smart_light'
      - `created_at` (timestamptz) - Auto-generated creation timestamp
    
    - `devices`
      - `device_id` (varchar, primary key) - Unique device identifier
      - `project_id` (varchar, foreign key) - Links to projects table
      - `role` (text) - Device role: 'regular' or 'beta'
      - `auto_update` (boolean) - Enable automatic firmware updates
      - `tank_shape` (text) - Tank shape if applicable
      - `height_cm` (numeric) - Tank height in centimeters
      - `width_cm` (numeric) - Tank width in centimeters
      - `length_cm` (numeric) - Tank length in centimeters
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `wp_samples` (Water Pump Telemetry)
      - `id` (bigint, primary key) - Auto-increment ID
      - `project_id` (varchar) - Project identifier
      - `device_id` (varchar) - Device identifier
      - `ts_utc` (timestamptz) - Timestamp in UTC
      - `level_pct` (numeric) - Water level percentage
      - `pump_on` (boolean) - Pump on/off state
      - `flow_out_lpm` (numeric) - Outflow in liters per minute
      - `flow_in_lpm` (numeric) - Inflow in liters per minute
      - `net_flow_lpm` (numeric) - Net flow in liters per minute
    
    - `sl_samples` (Smart Light Telemetry)
      - `id` (bigint, primary key) - Auto-increment ID
      - `project_id` (varchar) - Project identifier
      - `device_id` (varchar) - Device identifier
      - `ts_utc` (timestamptz) - Timestamp in UTC
      - `brightness` (integer) - Brightness level
      - `power_w` (numeric) - Power consumption in watts
      - `color_temp` (integer) - Color temperature in Kelvin
    
    - `firmware`
      - `id` (bigint, primary key) - Auto-increment ID
      - `version` (varchar) - Firmware version (e.g., b0.1.1.0)
      - `filename` (text) - Original filename
      - `sha256` (varchar) - SHA256 hash of the file
      - `size_bytes` (bigint) - File size in bytes
      - `uploaded_at` (timestamptz) - Upload timestamp
      - `file_path` (text) - Storage path reference

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
    - Public read access for device data (for IoT devices)

  3. Important Notes
    - All tables use timestamptz for proper timezone handling
    - Foreign key relationships ensure data integrity
    - Indexes added for performance on common queries
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  project_id VARCHAR(64) PRIMARY KEY,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL CHECK (project_type IN ('water_pump', 'smart_light')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  device_id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  role TEXT DEFAULT 'regular' CHECK (role IN ('regular', 'beta')),
  auto_update BOOLEAN DEFAULT false,
  tank_shape TEXT,
  height_cm NUMERIC,
  width_cm NUMERIC,
  length_cm NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create water pump samples table
CREATE TABLE IF NOT EXISTS wp_samples (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  device_id VARCHAR(64) NOT NULL,
  ts_utc TIMESTAMPTZ DEFAULT now(),
  level_pct NUMERIC,
  pump_on BOOLEAN,
  flow_out_lpm NUMERIC,
  flow_in_lpm NUMERIC,
  net_flow_lpm NUMERIC
);

-- Create smart light samples table
CREATE TABLE IF NOT EXISTS sl_samples (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  device_id VARCHAR(64) NOT NULL,
  ts_utc TIMESTAMPTZ DEFAULT now(),
  brightness INTEGER,
  power_w NUMERIC,
  color_temp INTEGER
);

-- Create firmware table
CREATE TABLE IF NOT EXISTS firmware (
  id BIGSERIAL PRIMARY KEY,
  version VARCHAR(64) NOT NULL,
  filename TEXT NOT NULL,
  sha256 VARCHAR(64),
  size_bytes BIGINT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  file_path TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_project ON devices(project_id);
CREATE INDEX IF NOT EXISTS idx_wp_samples_project ON wp_samples(project_id);
CREATE INDEX IF NOT EXISTS idx_wp_samples_device ON wp_samples(device_id);
CREATE INDEX IF NOT EXISTS idx_wp_samples_ts ON wp_samples(ts_utc DESC);
CREATE INDEX IF NOT EXISTS idx_sl_samples_project ON sl_samples(project_id);
CREATE INDEX IF NOT EXISTS idx_sl_samples_device ON sl_samples(device_id);
CREATE INDEX IF NOT EXISTS idx_sl_samples_ts ON sl_samples(ts_utc DESC);
CREATE INDEX IF NOT EXISTS idx_firmware_version ON firmware(version);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE sl_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read access for IoT devices
CREATE POLICY "Allow public read access to projects"
  ON projects FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to devices"
  ON devices FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to wp_samples"
  ON wp_samples FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to sl_samples"
  ON sl_samples FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to firmware"
  ON firmware FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow public insert for telemetry data (IoT devices posting data)
CREATE POLICY "Allow public insert to wp_samples"
  ON wp_samples FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert to sl_samples"
  ON sl_samples FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow public insert/update for devices and firmware
CREATE POLICY "Allow public insert to devices"
  ON devices FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to devices"
  ON devices FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public insert to firmware"
  ON firmware FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert to projects"
  ON projects FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public delete to projects"
  ON projects FOR DELETE
  TO anon, authenticated
  USING (true);

-- Insert demo data
INSERT INTO projects (project_id, project_name, project_type, created_at)
VALUES 
  ('WP01', 'Water Pump Demo', 'water_pump', now()),
  ('SL01', 'Smart Light Demo', 'smart_light', now())
ON CONFLICT (project_id) DO NOTHING;