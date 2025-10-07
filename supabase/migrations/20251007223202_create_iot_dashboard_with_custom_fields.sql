/*
  # IoT Dashboard Complete Schema with Custom Fields

  ## Overview
  Creates a comprehensive IoT dashboard schema supporting custom project fields, devices, telemetry data, firmware, and ML models.

  ## 1. New Tables

  ### projects
  - `project_id` (varchar, primary key) - Unique project identifier (e.g., WP01)
  - `project_name` (text) - Human-readable project name
  - `project_type` (text) - Type: 'water_pump' or 'smart_light'
  - `ml_enabled` (boolean) - ML script option enabled
  - `custom_fields` (jsonb) - Dynamic field definitions for project-specific data
  - `created_at` (timestamptz) - Auto-generated creation timestamp
  
  ### devices
  - `device_id` (varchar, primary key) - Unique device identifier
  - `project_id` (varchar, foreign key) - Links to projects table
  - `role` (text) - Device role: 'regular' or 'beta'
  - `auto_update` (boolean) - Enable automatic firmware updates
  - `custom_data` (jsonb) - Values for custom fields defined in project
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### wp_samples (Water Pump Telemetry)
  - `id` (bigint, primary key) - Auto-increment ID
  - `project_id` (varchar) - Project identifier
  - `device_id` (varchar) - Device identifier
  - `ts_utc` (timestamptz) - Timestamp in UTC
  - `level_pct` (numeric) - Water level percentage
  - `pump_on` (boolean) - Pump on/off state
  - `flow_out_lpm` (numeric) - Outflow in liters per minute
  - `flow_in_lpm` (numeric) - Inflow in liters per minute
  - `net_flow_lpm` (numeric) - Net flow in liters per minute
  
  ### sl_samples (Smart Light Telemetry)
  - `id` (bigint, primary key) - Auto-increment ID
  - `project_id` (varchar) - Project identifier
  - `device_id` (varchar) - Device identifier
  - `ts_utc` (timestamptz) - Timestamp in UTC
  - `brightness` (integer) - Brightness level
  - `power_w` (numeric) - Power consumption in watts
  - `color_temp` (integer) - Color temperature in Kelvin
  
  ### firmware
  - `id` (bigint, primary key) - Auto-increment ID
  - `version` (varchar) - Firmware version (e.g., b0.1.1.0)
  - `filename` (text) - Original filename
  - `sha256` (varchar) - SHA256 hash of the file
  - `size_bytes` (bigint) - File size in bytes
  - `uploaded_at` (timestamptz) - Upload timestamp
  - `file_path` (text) - Storage path reference

  ### ml_models
  - `id` (bigint, primary key) - Auto-increment ID
  - `project_id` (varchar) - Project identifier
  - `model_type` (text) - Type of model (e.g., 'tflite')
  - `filename` (text) - Model filename
  - `file_path` (text) - Storage path reference
  - `size_bytes` (bigint) - File size in bytes
  - `created_at` (timestamptz) - Creation timestamp
  - `training_samples` (integer) - Number of samples used for training

  ## 2. Sample Data
  - Projects: Water Tank System (ML enabled) and Smart Light System
  - Devices: 4 water tank devices, 3 smart light devices with custom field data
  - Telemetry: 480 water pump samples, 360 smart light samples

  ## 3. Security
  - Enable RLS on all tables
  - Public access policies for all CRUD operations (suitable for IoT devices)
  - Policies handle JSONB columns for custom fields

  ## 4. Performance
  - Indexes on foreign keys and timestamp columns
  - GIN indexes on JSONB columns for efficient querying
*/

-- Create projects table
CREATE TABLE projects (
  project_id VARCHAR(64) PRIMARY KEY,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL CHECK (project_type IN ('water_pump', 'smart_light')),
  ml_enabled BOOLEAN DEFAULT false,
  custom_fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create devices table
CREATE TABLE devices (
  device_id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  role TEXT DEFAULT 'regular' CHECK (role IN ('regular', 'beta')),
  auto_update BOOLEAN DEFAULT false,
  custom_data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create water pump samples table
CREATE TABLE wp_samples (
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
CREATE TABLE sl_samples (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  device_id VARCHAR(64) NOT NULL,
  ts_utc TIMESTAMPTZ DEFAULT now(),
  brightness INTEGER,
  power_w NUMERIC,
  color_temp INTEGER
);

-- Create firmware table
CREATE TABLE firmware (
  id BIGSERIAL PRIMARY KEY,
  version VARCHAR(64) NOT NULL,
  filename TEXT NOT NULL,
  sha256 VARCHAR(64),
  size_bytes BIGINT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  file_path TEXT
);

-- Create ml_models table
CREATE TABLE ml_models (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  model_type TEXT DEFAULT 'tflite',
  filename TEXT NOT NULL,
  file_path TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  training_samples INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX idx_devices_project ON devices(project_id);
CREATE INDEX idx_wp_samples_project ON wp_samples(project_id);
CREATE INDEX idx_wp_samples_device ON wp_samples(device_id);
CREATE INDEX idx_wp_samples_ts ON wp_samples(ts_utc DESC);
CREATE INDEX idx_sl_samples_project ON sl_samples(project_id);
CREATE INDEX idx_sl_samples_device ON sl_samples(device_id);
CREATE INDEX idx_sl_samples_ts ON sl_samples(ts_utc DESC);
CREATE INDEX idx_firmware_version ON firmware(version);
CREATE INDEX idx_ml_models_project ON ml_models(project_id);
CREATE INDEX idx_projects_custom_fields ON projects USING gin(custom_fields);
CREATE INDEX idx_devices_custom_data ON devices USING gin(custom_data);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wp_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE sl_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE firmware ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Allow public read access to projects"
  ON projects FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to projects"
  ON projects FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to projects"
  ON projects FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to projects"
  ON projects FOR DELETE
  TO anon, authenticated
  USING (true);

-- RLS Policies for devices
CREATE POLICY "Allow public read access to devices"
  ON devices FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to devices"
  ON devices FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to devices"
  ON devices FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to devices"
  ON devices FOR DELETE
  TO anon, authenticated
  USING (true);

-- RLS Policies for wp_samples
CREATE POLICY "Allow public read access to wp_samples"
  ON wp_samples FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to wp_samples"
  ON wp_samples FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public delete to wp_samples"
  ON wp_samples FOR DELETE
  TO anon, authenticated
  USING (true);

-- RLS Policies for sl_samples
CREATE POLICY "Allow public read access to sl_samples"
  ON sl_samples FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to sl_samples"
  ON sl_samples FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public delete to sl_samples"
  ON sl_samples FOR DELETE
  TO anon, authenticated
  USING (true);

-- RLS Policies for firmware
CREATE POLICY "Allow public read access to firmware"
  ON firmware FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to firmware"
  ON firmware FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public delete to firmware"
  ON firmware FOR DELETE
  TO anon, authenticated
  USING (true);

-- RLS Policies for ml_models
CREATE POLICY "Allow public read access to ml_models"
  ON ml_models FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to ml_models"
  ON ml_models FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public delete to ml_models"
  ON ml_models FOR DELETE
  TO anon, authenticated
  USING (true);

-- Insert projects with custom fields
INSERT INTO projects (project_id, project_name, project_type, ml_enabled, custom_fields, created_at)
VALUES 
  (
    'WP01', 
    'Water Tank System', 
    'water_pump', 
    true,
    '[
      {"name": "tank_shape", "type": "select", "label": "Tank Shape", "required": true, "options": ["rectangular", "cylindrical", "spherical"]},
      {"name": "height_cm", "type": "number", "label": "Height (cm)", "required": true},
      {"name": "width_cm", "type": "number", "label": "Width (cm)", "required": false},
      {"name": "length_cm", "type": "number", "label": "Length (cm)", "required": false},
      {"name": "radius_cm", "type": "number", "label": "Radius (cm)", "required": false},
      {"name": "material", "type": "text", "label": "Tank Material", "required": false},
      {"name": "capacity_liters", "type": "number", "label": "Capacity (L)", "required": false}
    ]'::jsonb,
    now() - interval '30 days'
  ),
  (
    'SL01', 
    'Smart Light System', 
    'smart_light', 
    false,
    '[
      {"name": "max_brightness", "type": "number", "label": "Max Brightness (%)", "required": true},
      {"name": "color_support", "type": "checkbox", "label": "Color Support", "required": true},
      {"name": "location", "type": "text", "label": "Location", "required": false},
      {"name": "wattage", "type": "number", "label": "Wattage (W)", "required": false}
    ]'::jsonb,
    now() - interval '20 days'
  );

-- Insert devices for Water Tank System
INSERT INTO devices (device_id, project_id, role, auto_update, custom_data, updated_at)
VALUES 
  (
    'DEV-WP01-001', 
    'WP01', 
    'regular', 
    true,
    '{"tank_shape": "rectangular", "height_cm": 200, "width_cm": 150, "length_cm": 150, "material": "stainless steel", "capacity_liters": 4500}'::jsonb,
    now() - interval '5 days'
  ),
  (
    'DEV-WP01-002', 
    'WP01', 
    'beta', 
    true,
    '{"tank_shape": "cylindrical", "height_cm": 250, "radius_cm": 80, "material": "plastic", "capacity_liters": 5000}'::jsonb,
    now() - interval '3 days'
  ),
  (
    'DEV-WP01-003', 
    'WP01', 
    'regular', 
    false,
    '{"tank_shape": "rectangular", "height_cm": 180, "width_cm": 120, "length_cm": 120, "material": "concrete", "capacity_liters": 2600}'::jsonb,
    now() - interval '7 days'
  ),
  (
    'DEV-WP01-004', 
    'WP01', 
    'regular', 
    true,
    '{"tank_shape": "cylindrical", "height_cm": 300, "radius_cm": 100, "material": "fiberglass", "capacity_liters": 9400}'::jsonb,
    now() - interval '2 days'
  );

-- Insert devices for Smart Light System
INSERT INTO devices (device_id, project_id, role, auto_update, custom_data, updated_at)
VALUES 
  (
    'DEV-SL01-001', 
    'SL01', 
    'regular', 
    true,
    '{"max_brightness": 100, "color_support": true, "location": "Living Room", "wattage": 12}'::jsonb,
    now() - interval '4 days'
  ),
  (
    'DEV-SL01-002', 
    'SL01', 
    'beta', 
    true,
    '{"max_brightness": 80, "color_support": false, "location": "Kitchen", "wattage": 9}'::jsonb,
    now() - interval '6 days'
  ),
  (
    'DEV-SL01-003', 
    'SL01', 
    'regular', 
    false,
    '{"max_brightness": 100, "color_support": true, "location": "Bedroom", "wattage": 15}'::jsonb,
    now() - interval '1 day'
  );

-- Insert Water Pump telemetry data (120 samples per device over 5 days)
INSERT INTO wp_samples (project_id, device_id, ts_utc, level_pct, pump_on, flow_out_lpm, flow_in_lpm, net_flow_lpm)
SELECT 
  'WP01',
  device_id,
  now() - (interval '1 hour' * generate_series(0, 119)),
  ROUND((45 + (random() * 50))::numeric, 2),
  (random() > 0.6)::boolean,
  ROUND((random() * 15)::numeric, 2),
  ROUND((random() * 20)::numeric, 2),
  ROUND(((random() * 20) - (random() * 15))::numeric, 2)
FROM (
  SELECT 'DEV-WP01-001' as device_id UNION ALL
  SELECT 'DEV-WP01-002' UNION ALL
  SELECT 'DEV-WP01-003' UNION ALL
  SELECT 'DEV-WP01-004'
) devices;

-- Insert Smart Light telemetry data (120 samples per device over 5 days)
INSERT INTO sl_samples (project_id, device_id, ts_utc, brightness, power_w, color_temp)
SELECT 
  'SL01',
  device_id,
  now() - (interval '1 hour' * generate_series(0, 119)),
  (30 + random() * 70)::integer,
  ROUND((5 + random() * 15)::numeric, 2),
  (2700 + (random() * 3800)::integer)
FROM (
  SELECT 'DEV-SL01-001' as device_id UNION ALL
  SELECT 'DEV-SL01-002' UNION ALL
  SELECT 'DEV-SL01-003'
) devices;
