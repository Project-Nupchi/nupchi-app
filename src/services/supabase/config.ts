const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PHOTO_BUCKET = 'fish-photos';

export type SupabaseConfig = {
  anonKey: string;
  farmId: string;
  url: string;
};

export class SupabaseConfigurationError extends Error {
  readonly code = 'SUPABASE_CONFIGURATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

let cachedConfig: SupabaseConfig | undefined;

export function getSupabaseConfig(): SupabaseConfig {
  if (cachedConfig) return cachedConfig;

  // Expo는 EXPO_PUBLIC_* 정적 프로퍼티 접근을 앱 번들에 인라인한다.
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  const legacyAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  const farmId = process.env.EXPO_PUBLIC_FARM_ID?.trim() ?? '';
  const anonKey = publishableKey || legacyAnonKey;

  if (!url) {
    throw new SupabaseConfigurationError('EXPO_PUBLIC_SUPABASE_URL 환경변수가 필요합니다.');
  }
  if (!anonKey) {
    throw new SupabaseConfigurationError(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY 또는 EXPO_PUBLIC_SUPABASE_ANON_KEY 환경변수가 필요합니다.'
    );
  }
  if (!farmId) {
    throw new SupabaseConfigurationError('EXPO_PUBLIC_FARM_ID 환경변수가 필요합니다.');
  }
  validateUrl(url);
  if (!UUID_PATTERN.test(farmId)) {
    throw new SupabaseConfigurationError('EXPO_PUBLIC_FARM_ID는 올바른 UUID여야 합니다.');
  }
  if (anonKey.startsWith('sb_secret_')) {
    throw new SupabaseConfigurationError('프론트에는 Supabase secret/service key를 사용할 수 없습니다.');
  }
  if (getLegacyJwtRole(anonKey) === 'service_role') {
    throw new SupabaseConfigurationError('프론트에는 Supabase service_role 키를 사용할 수 없습니다.');
  }

  cachedConfig = Object.freeze({ anonKey, farmId, url });
  return cachedConfig;
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function validateUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SupabaseConfigurationError('EXPO_PUBLIC_SUPABASE_URL이 올바른 URL이 아닙니다.');
  }

  const localHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localHost)) {
    throw new SupabaseConfigurationError('Supabase URL은 HTTPS여야 합니다.');
  }
}

function getLegacyJwtRole(key: string): string | undefined {
  const payload = key.split('.')[1];
  if (!payload || typeof globalThis.atob !== 'function') return undefined;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const parsed = JSON.parse(globalThis.atob(base64)) as unknown;
    if (typeof parsed !== 'object' || parsed === null || !('role' in parsed)) return undefined;
    return typeof parsed.role === 'string' ? parsed.role : undefined;
  } catch {
    return undefined;
  }
}
