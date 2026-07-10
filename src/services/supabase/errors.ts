export type SupabaseDataErrorCode =
  | 'CONSTRAINT_VIOLATION'
  | 'DUPLICATE_RESOURCE'
  | 'INVALID_INPUT'
  | 'NETWORK_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'STORAGE_ERROR'
  | 'UNKNOWN_ERROR';

export class SupabaseDataError extends Error {
  constructor(
    message: string,
    readonly code: SupabaseDataErrorCode,
    readonly operation: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = 'SupabaseDataError';
  }
}

export function mapSupabaseError(error: unknown, operation: string): SupabaseDataError {
  if (error instanceof SupabaseDataError) return error;

  const errorCode = getStringProperty(error, 'code');
  const statusCode = getStatusCode(error);

  if (errorCode === '23505' || statusCode === 409) {
    return new SupabaseDataError('이미 등록된 데이터입니다.', 'DUPLICATE_RESOURCE', operation, { cause: error });
  }
  if (errorCode === '42501' || statusCode === 401 || statusCode === 403) {
    return new SupabaseDataError('이 작업을 수행할 권한이 없습니다.', 'PERMISSION_DENIED', operation, { cause: error });
  }
  if (errorCode === 'PGRST116' || statusCode === 404) {
    return new SupabaseDataError('요청한 데이터를 찾을 수 없습니다.', 'NOT_FOUND', operation, { cause: error });
  }
  if (errorCode === '22P02' || errorCode === '23502' || statusCode === 400 || statusCode === 422) {
    return new SupabaseDataError('입력값을 확인해 주세요.', 'INVALID_INPUT', operation, { cause: error });
  }
  if (errorCode?.startsWith('23')) {
    return new SupabaseDataError('데이터 제약 조건을 확인해 주세요.', 'CONSTRAINT_VIOLATION', operation, { cause: error });
  }
  if (isNetworkError(error)) {
    return new SupabaseDataError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.', 'NETWORK_ERROR', operation, { cause: error });
  }
  if (isStorageError(error)) {
    return new SupabaseDataError('사진을 불러오지 못했습니다.', 'STORAGE_ERROR', operation, { cause: error });
  }

  return new SupabaseDataError('데이터를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'UNKNOWN_ERROR', operation, {
    cause: error,
  });
}

export function invalidInput(operation: string, message: string): SupabaseDataError {
  return new SupabaseDataError(message, 'INVALID_INPUT', operation);
}

export function notFound(operation: string, message: string): SupabaseDataError {
  return new SupabaseDataError(message, 'NOT_FOUND', operation);
}

function getStringProperty(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const property = value[key];
  return typeof property === 'string' ? property : undefined;
}

function getStatusCode(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined;
  const status = value.statusCode ?? value.status;
  if (typeof status === 'number') return status;
  if (typeof status === 'string') {
    const parsed = Number(status);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isNetworkError(value: unknown) {
  return value instanceof TypeError || getStringProperty(value, 'name') === 'AuthRetryableFetchError';
}

function isStorageError(value: unknown) {
  const name = getStringProperty(value, 'name');
  return Boolean(
    name?.includes('Storage') ||
      (isRecord(value) && (value.__isStorageError === true || value.__isStorageError === 'true'))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
