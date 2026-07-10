import { File as ExpoFile } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  InferenceApiError,
  inferenceHttpError,
  invalidInferenceResponse,
} from '@/services/inference/errors';
import {
  parseDiagnosisResponse,
  parseGuideResponse,
  parseHealthResponse,
} from '@/services/inference/parsers';
import type {
  DiagnoseInput,
  DiagnosisResponse,
  GuideResponse,
  HealthResponse,
  InferenceApi,
  InferenceImage,
} from '@/services/inference/types';

export const INFERENCE_TIMEOUTS = {
  health: 10_000,
  diagnose: 90_000,
  guide: 45_000,
} as const;

export interface InferenceClientOptions {
  healthTimeoutMs?: number;
  diagnoseTimeoutMs?: number;
  guideTimeoutMs?: number;
}

export class InferenceClient implements InferenceApi {
  private readonly baseUrl?: string;
  private readonly timeouts: Record<keyof typeof INFERENCE_TIMEOUTS, number>;

  constructor(
    baseUrl: string | undefined = process.env.EXPO_PUBLIC_INFERENCE_URL?.trim(),
    options: InferenceClientOptions = {}
  ) {
    this.baseUrl = baseUrl?.trim().replace(/\/+$/, '') || undefined;
    this.timeouts = {
      health: validTimeout(options.healthTimeoutMs, INFERENCE_TIMEOUTS.health),
      diagnose: validTimeout(options.diagnoseTimeoutMs, INFERENCE_TIMEOUTS.diagnose),
      guide: validTimeout(options.guideTimeoutMs, INFERENCE_TIMEOUTS.guide),
    };
  }

  async health(): Promise<HealthResponse> {
    const payload = await this.request('/health', { method: 'GET' }, this.timeouts.health);
    return parseHealthResponse(payload);
  }

  async diagnose(input: DiagnoseInput): Promise<DiagnosisResponse> {
    validateDiagnoseInput(input);
    const body = await buildDiagnosisBody(input);
    const payload = await this.request('/diagnose', { method: 'POST', body }, this.timeouts.diagnose);
    return parseDiagnosisResponse(payload, { requireCropFields: true });
  }

  async guide(aiResultId: string): Promise<GuideResponse> {
    const normalizedId = requiredInput(aiResultId, 'aiResultId');
    const body = `ai_result_id=${encodeURIComponent(normalizedId)}`;
    const payload = await this.request(
      '/guide',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
      this.timeouts.guide
    );
    const response = parseGuideResponse(payload);
    if (response.aiResultId !== normalizedId) throw invalidInferenceResponse('guide.aiResultId');
    return response;
  }

  private async request(path: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
    if (!this.baseUrl) {
      throw new InferenceApiError(
        'EXPO_PUBLIC_INFERENCE_URL이 설정되지 않았습니다.',
        undefined,
        'INFERENCE_URL_NOT_CONFIGURED'
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...init.headers,
        },
      });
      const payload = await readPayload(response);
      if (!response.ok) throw inferenceHttpError(response.status, payload);
      return payload;
    } catch (error) {
      if (error instanceof InferenceApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new InferenceApiError('요청 시간이 초과되었습니다.', 408, 'REQUEST_TIMEOUT');
      }
      throw new InferenceApiError(
        error instanceof Error ? error.message : '서버에 연결할 수 없습니다.',
        undefined,
        'NETWORK_ERROR',
        error
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

async function buildDiagnosisBody(input: DiagnoseInput): Promise<FormData> {
  const body = new FormData();
  body.append('farm_id', input.farmId.trim());
  body.append('tank_id', input.tankId.trim());
  body.append('request_id', input.requestId.trim());
  await appendImage(body, input.image);
  return body;
}

async function appendImage(body: FormData, image: InferenceImage): Promise<void> {
  const type = image.type ?? 'image/jpeg';
  const name = image.name?.trim() || `diagnosis.${type === 'image/png' ? 'png' : 'jpg'}`;

  if (Platform.OS === 'web') {
    let response: Response;
    try {
      response = await fetch(image.uri);
    } catch (error) {
      throw new InferenceApiError('이미지를 읽을 수 없습니다.', undefined, 'IMAGE_READ_ERROR', error);
    }
    if (!response.ok) {
      throw new InferenceApiError('이미지를 읽을 수 없습니다.', response.status, 'IMAGE_READ_ERROR');
    }
    body.append('image', await response.blob(), name);
    return;
  }

  const file = new ExpoFile(image.uri);
  if (!file.exists) {
    throw new InferenceApiError('이미지를 읽을 수 없습니다.', undefined, 'IMAGE_READ_ERROR');
  }
  body.append('image', file, name);
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (!response.ok) return text;
    throw invalidInferenceResponse();
  }
}

function validateDiagnoseInput(input: DiagnoseInput): void {
  requiredInput(input.farmId, 'farmId');
  requiredInput(input.tankId, 'tankId');
  requiredInput(input.requestId, 'requestId');
  requiredInput(input.image.uri, 'image.uri');
  if (input.image.type !== undefined && input.image.type !== 'image/jpeg' && input.image.type !== 'image/png') {
    throw new InferenceApiError('JPEG 또는 PNG 이미지만 전송할 수 있습니다.', undefined, 'UNSUPPORTED_IMAGE_TYPE');
  }
}

function requiredInput(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized) return normalized;
  throw new InferenceApiError(`${field} 값이 필요합니다.`, undefined, 'INVALID_REQUEST');
}

function validTimeout(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}
