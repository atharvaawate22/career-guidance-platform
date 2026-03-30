const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;

const devFallbackApiBaseUrl =
  process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

export const API_BASE_URL = configuredApiBaseUrl || devFallbackApiBaseUrl;
