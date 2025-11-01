/*
  # Create Core Tables for Facility Management System

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique, required)
      - `user_type` (text, required) - 'admin', 'executor', or 'complainant'
      - `name` (text, required)
      - `phone` (text)
      - `department` (text)
      - `employee_id` (text)
      - `active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `executors`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `skills` (text array)
      - `max_tickets` (integer, default 10)
      - `current_load` (integer, default 0)
      - `availability` (text) - 'available', 'busy', 'offline'
      - `work_start` (time)
      - `work_end` (time)
      - `telegram_token` (text)
      - `telegram_connected` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `tickets`
      - `id` (uuid, primary key)
      - `ticket_number` (text, unique, auto-generated)
      - `title` (text, required)
      - `description` (text, required)
      - `category` (text, required)
      - `priority` (text, required) - 'critical', 'high', 'medium', 'low'
      - `type` (text, required)
      - `status` (text, default 'open') - 'open', 'in-progress', 'resolved', 'closed'
      - `location` (text, required)
      - `building` (text)
      - `floor` (text)
      - `room` (text)
      - `complainant_id` (uuid, foreign key to users)
      - `complainant_name` (text)
      - `complainant_email` (text)
      - `complainant_phone` (text)
      - `executor_id` (uuid, foreign key to executors)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `resolved_at` (timestamptz)
      - `due_date` (timestamptz)
    
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique, required)
      - `description` (text)
      - `active` (boolean, default true)
      - `created_at` (timestamptz)
    
    - `priorities`
      - `id` (uuid, primary key)
      - `name` (text, unique, required)
      - `level` (integer, required)
      - `sla_hours` (integer)
      - `color` (text)
      - `active` (boolean, default true)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on their roles
    - Users can read their own data
    - Admins can read/write all data
    - Executors can read tickets assigned to them
    - Complainants can read tickets they created
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('admin', 'executor', 'complainant')),
  name text NOT NULL,
  phone text,
  department text,
  employee_id text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create executors table
CREATE TABLE IF NOT EXISTS executors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  skills text[] DEFAULT '{}',
  max_tickets integer DEFAULT 10,
  current_load integer DEFAULT 0,
  availability text DEFAULT 'available' CHECK (availability IN ('available', 'busy', 'offline')),
  work_start time DEFAULT '09:00',
  work_end time DEFAULT '17:00',
  telegram_token text,
  telegram_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  type text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  location text NOT NULL,
  building text,
  floor text,
  room text,
  complainant_id uuid REFERENCES users(id) ON DELETE SET NULL,
  complainant_name text,
  complainant_email text,
  complainant_phone text,
  executor_id uuid REFERENCES executors(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  due_date timestamptz
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create priorities table
CREATE TABLE IF NOT EXISTS priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  level integer NOT NULL,
  sla_hours integer,
  color text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create function to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('ticket_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1000;

-- Create trigger for ticket number generation
DROP TRIGGER IF EXISTS set_ticket_number ON tickets;
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
  EXECUTE FUNCTION generate_ticket_number();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_executors_updated_at ON executors;
CREATE TRIGGER update_executors_updated_at
  BEFORE UPDATE ON executors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE executors ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

-- RLS Policies for executors table
CREATE POLICY "Executors can read own data"
  ON executors FOR SELECT
  TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Admins can read all executors"
  ON executors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage executors"
  ON executors FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

-- RLS Policies for tickets table
CREATE POLICY "Users can read tickets they created"
  ON tickets FOR SELECT
  TO authenticated
  USING (complainant_id::text = auth.uid()::text);

CREATE POLICY "Executors can read assigned tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM executors
      WHERE executors.id = tickets.executor_id
      AND executors.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Admins can read all tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Executors can update assigned tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM executors
      WHERE executors.id = tickets.executor_id
      AND executors.user_id::text = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM executors
      WHERE executors.id = tickets.executor_id
      AND executors.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Admins can update all tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

-- RLS Policies for categories table
CREATE POLICY "Anyone can read active categories"
  ON categories FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

-- RLS Policies for priorities table
CREATE POLICY "Anyone can read active priorities"
  ON priorities FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage priorities"
  ON priorities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = auth.uid()::text
      AND users.user_type = 'admin'
    )
  );

-- Insert default categories
INSERT INTO categories (name, description) VALUES
  ('HVAC', 'Heating, Ventilation, and Air Conditioning'),
  ('Electrical', 'Electrical systems and fixtures'),
  ('Plumbing', 'Water and drainage systems'),
  ('Furniture', 'Office furniture and fixtures'),
  ('IT Support', 'Computer and network issues'),
  ('Cleaning', 'Cleaning and janitorial services'),
  ('Security', 'Security systems and access control')
ON CONFLICT (name) DO NOTHING;

-- Insert default priorities
INSERT INTO priorities (name, level, sla_hours, color) VALUES
  ('critical', 1, 2, 'red'),
  ('high', 2, 8, 'orange'),
  ('medium', 3, 24, 'yellow'),
  ('low', 4, 72, 'green')
ON CONFLICT (name) DO NOTHING;