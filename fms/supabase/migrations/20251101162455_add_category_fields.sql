/*
  # Add Additional Fields to Categories Table

  1. Changes
    - Add `icon` (text) - Icon identifier for the category
    - Add `color` (text) - Color hex code or identifier
    - Add `keywords` (text array) - Keywords for search/matching
    - Add `ai_available` (boolean) - Whether AI can process this category
    - Add `sort_order` (integer) - For manual reordering
    - Add `updated_at` (timestamptz) - Track last update

  2. Notes
    - All new fields use safe defaults
    - Existing categories will have null values initially
    - No data loss occurs
*/

-- Add new columns to categories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'icon'
  ) THEN
    ALTER TABLE categories ADD COLUMN icon text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'color'
  ) THEN
    ALTER TABLE categories ADD COLUMN color text DEFAULT '#3B82F6';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'keywords'
  ) THEN
    ALTER TABLE categories ADD COLUMN keywords text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'ai_available'
  ) THEN
    ALTER TABLE categories ADD COLUMN ai_available boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE categories ADD COLUMN sort_order integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE categories ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger for updated_at on categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update default categories with icons and colors
UPDATE categories SET 
  icon = 'wind',
  color = '#06B6D4',
  keywords = ARRAY['heating', 'cooling', 'air', 'temperature', 'ventilation', 'ac']::text[],
  ai_available = true,
  sort_order = 1
WHERE name = 'HVAC' AND icon IS NULL;

UPDATE categories SET 
  icon = 'zap',
  color = '#F59E0B',
  keywords = ARRAY['power', 'lights', 'outlet', 'electrical', 'wiring', 'circuit']::text[],
  ai_available = true,
  sort_order = 2
WHERE name = 'Electrical' AND icon IS NULL;

UPDATE categories SET 
  icon = 'droplet',
  color = '#3B82F6',
  keywords = ARRAY['water', 'leak', 'drain', 'toilet', 'sink', 'pipe']::text[],
  ai_available = true,
  sort_order = 3
WHERE name = 'Plumbing' AND icon IS NULL;

UPDATE categories SET 
  icon = 'armchair',
  color = '#8B5CF6',
  keywords = ARRAY['desk', 'chair', 'table', 'cabinet', 'furniture', 'fixture']::text[],
  ai_available = false,
  sort_order = 4
WHERE name = 'Furniture' AND icon IS NULL;

UPDATE categories SET 
  icon = 'monitor',
  color = '#10B981',
  keywords = ARRAY['computer', 'network', 'software', 'hardware', 'internet', 'printer']::text[],
  ai_available = true,
  sort_order = 5
WHERE name = 'IT Support' AND icon IS NULL;

UPDATE categories SET 
  icon = 'sparkles',
  color = '#EC4899',
  keywords = ARRAY['clean', 'trash', 'janitor', 'maintenance', 'hygiene']::text[],
  ai_available = false,
  sort_order = 6
WHERE name = 'Cleaning' AND icon IS NULL;

UPDATE categories SET 
  icon = 'shield',
  color = '#EF4444',
  keywords = ARRAY['access', 'lock', 'key', 'badge', 'camera', 'alarm']::text[],
  ai_available = true,
  sort_order = 7
WHERE name = 'Security' AND icon IS NULL;