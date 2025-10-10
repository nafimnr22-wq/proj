/*
  # Add Realtime Data Support

  ## Overview
  Adds support for realtime data that can be edited from ESP32 devices and the website dashboard.

  ## Changes Made

  ### 1. New Table
    - `realtime_data`
      - `id` (bigint, primary key) - Auto-increment ID
      - `device_id` (varchar, foreign key) - Links to devices table
      - `project_id` (varchar, foreign key) - Links to projects table
      - `data` (jsonb) - Stores realtime data values as key-value pairs
      - `updated_at` (timestamptz) - Last update timestamp

  ### 2. Project Schema Changes
    - Add `realtime_fields` JSONB column to projects table
      - Stores field definitions for realtime data
      - Format: [{"name": "field_name", "type": "text|number|boolean", "label": "Display Label"}]

  ## Security
    - Enable RLS on realtime_data table
    - Allow public read/write access for IoT devices

  ## Performance
    - Add indexes on device_id and project_id for fast lookups
    - Add GIN index on data JSONB column
*/

-- Create realtime_data table
CREATE TABLE IF NOT EXISTS realtime_data (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add realtime_fields column to projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'realtime_fields'
  ) THEN
    ALTER TABLE projects ADD COLUMN realtime_fields JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_realtime_data_device ON realtime_data(device_id);
CREATE INDEX IF NOT EXISTS idx_realtime_data_project ON realtime_data(project_id);
CREATE INDEX IF NOT EXISTS idx_realtime_data_data ON realtime_data USING gin(data);
CREATE INDEX IF NOT EXISTS idx_projects_realtime_fields ON projects USING gin(realtime_fields);

-- Enable Row Level Security
ALTER TABLE realtime_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies for realtime_data
CREATE POLICY "Allow public read access to realtime_data"
  ON realtime_data FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to realtime_data"
  ON realtime_data FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to realtime_data"
  ON realtime_data FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to realtime_data"
  ON realtime_data FOR DELETE
  TO anon, authenticated
  USING (true);
