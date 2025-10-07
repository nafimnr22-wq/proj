/*
  # Add device_id to ml_models table

  1. Schema Update
    - Add `device_id` column to ml_models table
    - This allows models to be trained per device instead of per project

  2. Important Notes
    - Existing models will have NULL device_id (project-wide models)
    - New models should have device_id specified
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ml_models' AND column_name = 'device_id'
  ) THEN
    ALTER TABLE ml_models ADD COLUMN device_id VARCHAR(64);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ml_models_device ON ml_models(device_id);