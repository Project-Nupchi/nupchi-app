const INVALID_RESPONSE_MESSAGE = '서버 응답 형식이 올바르지 않습니다.';

export class InferenceApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly detail?: unknown
  ) {
    super(message);
    this.name = 'InferenceApiError';
  }
}

export function invalidInferenceResponse(detail?: string): InferenceApiError {
  return new InferenceApiError(
    detail ? `${INVALID_RESPONSE_MESSAGE} (${detail})` : INVALID_RESPONSE_MESSAGE,
    undefined,
    'INVALID_RESPONSE'
  );
}

export function inferenceHttpError(status: number, payload: unknown): InferenceApiError {
  const error = readErrorPayload(payload);
  return new InferenceApiError(
    error.message ?? `HTTP ${status}`,
    status,
    error.code ?? `HTTP_${status}`,
    payload
  );
}

function readErrorPayload(payload: unknown): { message?: string; code?: string } {
  if (typeof payload === 'string') {
    const message = payload.trim();
    return message ? { message } : {};
  }
  if (!isRecord(payload)) return {};

  const code = typeof payload.code === 'string' ? payload.code : undefined;
  if (typeof payload.detail === 'string') return { message: payload.detail, code };

  if (Array.isArray(payload.detail)) {
    const messages = payload.detail.map(readFastApiValidationIssue).filter((value): value is string => Boolean(value));
    if (messages.length > 0) return { message: messages.join('\n'), code };
  }
  if (isRecord(payload.detail)) {
    const nested = readErrorPayload(payload.detail);
    if (nested.message) return { message: nested.message, code: nested.code ?? code };
  }

  if (typeof payload.message === 'string') return { message: payload.message, code };
  if (typeof payload.error === 'string') return { message: payload.error, code };
  if (isRecord(payload.error)) {
    const nested = readErrorPayload(payload.error);
    return { message: nested.message, code: nested.code ?? code };
  }
  return { code };
}

function readFastApiValidationIssue(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.msg !== 'string') return undefined;
  if (!Array.isArray(value.loc)) return value.msg;

  const location = value.loc
    .filter((part): part is string | number => typeof part === 'string' || typeof part === 'number')
    .join('.');
  return location ? `${location}: ${value.msg}` : value.msg;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
