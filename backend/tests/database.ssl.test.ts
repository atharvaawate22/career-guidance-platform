import { describe, expect, it } from 'vitest';
import { parse } from 'pg-connection-string';
import { resolveDatabaseSsl } from '../src/config/database';

const REMOTE = 'postgresql://user:secret@db.example.com:5432/app';
const LOCAL_NO_TLS = 'postgresql://postgres:postgres@localhost:55432/career_guidance?sslmode=disable';

describe('resolveDatabaseSsl', () => {
  it('keeps TLS on with the configured rejectUnauthorized when no sslmode is given', () => {
    expect(resolveDatabaseSsl(REMOTE, 'production', true)).toEqual({
      connectionString: REMOTE,
      ssl: { rejectUnauthorized: true },
      downgradeBlocked: false,
    });
    expect(resolveDatabaseSsl(REMOTE, 'development', false).ssl).toEqual({
      rejectUnauthorized: false,
    });
  });

  it('turns TLS off for sslmode=disable outside production (local docker Postgres)', () => {
    for (const env of ['development', 'test', undefined]) {
      const r = resolveDatabaseSsl(LOCAL_NO_TLS, env, true);
      expect(r.ssl).toBe(false);
      expect(r.connectionString).toBe(LOCAL_NO_TLS);
      expect(r.downgradeBlocked).toBe(false);
    }
  });

  it('is case-insensitive about the sslmode value', () => {
    const r = resolveDatabaseSsl(`${REMOTE}?sslmode=DISABLE`, 'development', true);
    expect(r.ssl).toBe(false);
  });

  it('refuses sslmode=disable in production: strips it and keeps TLS on', () => {
    const r = resolveDatabaseSsl(`${REMOTE}?sslmode=disable&application_name=api`, 'production', true);
    expect(r.downgradeBlocked).toBe(true);
    expect(r.ssl).toEqual({ rejectUnauthorized: true });
    // The stripped URL must no longer carry sslmode, because pg lets URL
    // parameters override the ssl option; other parameters survive.
    const parsed = parse(r.connectionString);
    expect(parsed.ssl).toBeUndefined();
    expect(parsed.application_name).toBe('api');
    expect(parsed.host).toBe('db.example.com');
    expect(parsed.password).toBe('secret');
  });

  it('keeps credentials intact when stripping, including an unencoded "@" in the password', () => {
    const r = resolveDatabaseSsl(
      'postgresql://user:p@ss@db.example.com:6543/postgres?sslmode=disable',
      'production',
      true,
    );
    const parsed = parse(r.connectionString);
    expect(parsed.user).toBe('user');
    expect(parsed.password).toBe('p@ss');
    expect(parsed.host).toBe('db.example.com');
    expect(parsed.port).toBe('6543');
    expect(parsed.database).toBe('postgres');
  });

  it('leaves other sslmode values to pg unchanged', () => {
    const url = `${REMOTE}?sslmode=require`;
    expect(resolveDatabaseSsl(url, 'production', true)).toEqual({
      connectionString: url,
      ssl: { rejectUnauthorized: true },
      downgradeBlocked: false,
    });
  });
});
