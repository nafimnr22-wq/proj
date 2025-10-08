/*
  # Remove Project Type Constraint

  ## Overview
  Allows custom project types beyond water_pump and smart_light by removing the CHECK constraint.

  ## Changes
  - Drop the CHECK constraint on projects.project_type column
  - This allows any string value for project_type, enabling custom project types

  ## Impact
  - Existing projects remain unchanged
  - New projects can now use any custom type name
*/

-- Drop the CHECK constraint on project_type
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;
