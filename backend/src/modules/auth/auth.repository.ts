import { query } from '../../config/database';
import { AdminUser } from './auth.types';

export const findUserByEmail = async (
  email: string,
): Promise<AdminUser | null> => {
  const result = await query(
    'SELECT id, email, password_hash, role, created_at FROM admin_users WHERE email = $1',
    [email],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as AdminUser;
};
