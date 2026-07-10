import { ImageUploadError } from './errors';

export const DEFAULT_MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export function getMaxUploadBytes(override?: number): number {
  if (override !== undefined) return validateMaxBytes(override);

  const configured = process.env.EXPO_PUBLIC_MAX_UPLOAD_BYTES;
  if (configured === undefined || configured.trim() === '') {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }

  if (!/^\d+$/.test(configured.trim())) {
    throw invalidMaxBytesError(configured);
  }

  return validateMaxBytes(Number(configured));
}

function validateMaxBytes(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw invalidMaxBytesError(String(value));
  }
  return value;
}

function invalidMaxBytesError(value: string) {
  return new ImageUploadError(
    'INVALID_MAX_UPLOAD_BYTES',
    `EXPO_PUBLIC_MAX_UPLOAD_BYTES는 1 이상의 정수여야 합니다. 현재 값: ${value}`
  );
}
