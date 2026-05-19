import { query } from '../../config/database';

interface PlatformSetting {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export async function getSetting(key: string): Promise<PlatformSetting | null> {
  const result = await query(
    'SELECT key, value, updated_at FROM platform_settings WHERE key = $1',
    [key],
  );
  return result.rows[0] ?? null;
}

export async function getAllSettings(): Promise<PlatformSetting[]> {
  const result = await query(
    'SELECT key, value, updated_at FROM platform_settings ORDER BY key',
  );
  return result.rows;
}

export async function upsertSetting(
  key: string,
  value: Record<string, unknown>,
): Promise<PlatformSetting> {
  const result = await query(
    `INSERT INTO platform_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
     RETURNING key, value, updated_at`,
    [key, JSON.stringify(value)],
  );
  return result.rows[0];
}
