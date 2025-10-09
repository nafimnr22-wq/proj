/*
  # Add ML Script Columns to Projects

  ## Overview
  Adds columns to store ML training scripts for projects with ML enabled.

  ## Changes
  - Add `ml_script_content` TEXT column to projects table
    - Stores the Python training script code
  - Add `ml_script_updated_at` TIMESTAMPTZ column to projects table
    - Tracks when the ML script was last updated

  ## Impact
  - Existing projects will have NULL values for these columns
  - New projects can store and retrieve ML training scripts
*/

-- Add ml_script_content column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'ml_script_content'
  ) THEN
    ALTER TABLE projects ADD COLUMN ml_script_content TEXT;
  END IF;
END $$;

-- Add ml_script_updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'ml_script_updated_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN ml_script_updated_at TIMESTAMPTZ;
  END IF;
END $$;
