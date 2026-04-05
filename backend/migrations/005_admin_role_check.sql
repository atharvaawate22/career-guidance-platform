-- Migration 005: Add CHECK constraint to admin_users.role
-- Prevents garbage data and makes the role field self-documenting.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'admin_users'
      AND constraint_name = 'admin_users_role_check'
  ) THEN
    ALTER TABLE admin_users
      ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin'));
  END IF;
END
$$;
